import type { Workout, WorkoutSet } from "../db/types"
import { applyWorkout, type StatUnits } from "../engine/stats"
import { clearRecovery } from "../engine/xp"
import { hunterRepo } from "../repo/hunterRepo"
import { runInTransaction } from "../repo/transaction"
import { workoutRepo, type NewSet, type NewWorkout } from "../repo/workoutRepo"
import { usePanelStore } from "../store/panelStore"

export interface LogWorkoutResult {
  workout: Workout
  sets: WorkoutSet[]
  pointsGained: StatUnits
  /** Logging a session counts as a completion: it clears recovery mode. */
  recovered: boolean
}

/** Persist a finished session and accrue its stat units onto the hunter. */
export async function logWorkout(input: NewWorkout, sets: readonly NewSet[]): Promise<LogWorkoutResult> {
  const result = await runInTransaction(async () => {
    const saved = await workoutRepo.create(input, sets)
    const before = await hunterRepo.get()
    const recovered = before.recoveryMode
    const accrued = applyWorkout(clearRecovery(before), saved.sets)
    await hunterRepo.save(accrued.hunter)
    return { ...saved, pointsGained: accrued.pointsGained, recovered }
  })
  if (result.recovered) {
    usePanelStore.getState().push({ title: "RECOVERY COMPLETE", lines: ["Vital signs restored.", "XP gain re-enabled."], tone: "success" })
  }
  return result
}
