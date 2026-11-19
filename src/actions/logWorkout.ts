import type { Workout, WorkoutSet } from "../db/types"
import { bestByExercise, findRecords, type LiftRecord } from "../engine/records"
import { applyWorkout, type StatUnits } from "../engine/stats"
import { clearRecovery } from "../engine/xp"
import { hunterRepo } from "../repo/hunterRepo"
import { runInTransaction } from "../repo/transaction"
import { workoutRepo, type NewSet, type NewWorkout } from "../repo/workoutRepo"
import { usePanelStore } from "../store/panelStore"
import { checkAchievements } from "./checkAchievements"

export interface LogWorkoutResult {
  workout: Workout
  sets: WorkoutSet[]
  pointsGained: StatUnits
  /** Logging a session counts as a completion: it clears recovery mode. */
  recovered: boolean
  /** Lifts whose estimated one-rep max beat their previous best. */
  records: LiftRecord[]
}

const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Persist a finished session and accrue its stat units onto the hunter. */
export async function logWorkout(input: NewWorkout, sets: readonly NewSet[]): Promise<LogWorkoutResult> {
  const liftNames = [...new Set(sets.filter((s) => s.reps !== undefined && (s.weightKg ?? 0) > 0).map((s) => s.exerciseName))]
  const history = await workoutRepo.liftHistory(liftNames)
  const previousBest = bestByExercise(
    [...history].flatMap(([exerciseName, sessions]) => sessions.flatMap((ss) => ss.sets.map((x) => ({ exerciseName, ...x })))),
  )
  const records = findRecords(previousBest, sets)

  const result = await runInTransaction(async () => {
    const saved = await workoutRepo.create(input, sets)
    const before = await hunterRepo.get()
    const recovered = before.recoveryMode
    const accrued = applyWorkout(clearRecovery(before), saved.sets)
    await hunterRepo.save(accrued.hunter)
    return { ...saved, pointsGained: accrued.pointsGained, recovered, records }
  })
  if (result.recovered) {
    usePanelStore.getState().push({ title: "RECOVERY COMPLETE", lines: ["Vital signs restored.", "XP gain re-enabled."], tone: "success" })
  }
  if (records.length > 0) {
    usePanelStore.getState().push({
      title: records.length === 1 ? "NEW RECORD" : `${records.length} NEW RECORDS`,
      lines: records.map((r) => `${r.exerciseName}: est. max ${fmtKg(r.e1rm)} kg (was ${fmtKg(r.previous)})`),
      tone: "success",
      ping: true,
    })
  }
  await checkAchievements()
  return result
}
