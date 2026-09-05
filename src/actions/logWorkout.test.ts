import { beforeEach, describe, expect, it } from "vitest"
import { bootstrap } from "../repo/bootstrap"
import { hunterRepo } from "../repo/hunterRepo"
import { workoutRepo } from "../repo/workoutRepo"
import { usePanelStore } from "../store/panelStore"
import { resetDb } from "../test/db"
import { logWorkout } from "./logWorkout"

beforeEach(async () => {
  await resetDb()
  usePanelStore.setState({ queue: [] })
  await bootstrap()
})

describe("logWorkout", () => {
  it("saves the session and converts units into stat points", async () => {
    const r = await logWorkout({ date: "2026-09-05", notes: "" }, [
      { exerciseName: "Squat", weightKg: 100, reps: 25 }, // 25 STR units
      { exerciseName: "Run", distanceKm: 12, durationMin: 100 }, // 12 AGI, 10 VIT
    ])
    expect(r.pointsGained).toMatchObject({ str: 2, agi: 1, vit: 1 })
    const hunter = await hunterRepo.get()
    expect(hunter).toMatchObject({ str: 2, agi: 1, vit: 1 })
    expect(hunter.statUnits).toMatchObject({ str: 5, agi: 2, vit: 0 })
    expect(await workoutRepo.count()).toBe(1)
    expect(await workoutRepo.setsFor(r.workout.id)).toHaveLength(2)
  })

  it("carries leftover units into the next session", async () => {
    await logWorkout({ date: "2026-09-05", notes: "" }, [{ exerciseName: "Run", distanceKm: 7 }])
    await logWorkout({ date: "2026-09-06", notes: "" }, [{ exerciseName: "Run", distanceKm: 5 }])
    expect((await hunterRepo.get()).agi).toBe(1)
  })

  it("clears recovery mode and announces it", async () => {
    const h = await hunterRepo.get()
    await hunterRepo.save({ ...h, hp: 0, recoveryMode: true })
    const r = await logWorkout({ date: "2026-09-05", notes: "" }, [{ exerciseName: "Walk", durationMin: 20 }])
    expect(r.recovered).toBe(true)
    expect((await hunterRepo.get()).recoveryMode).toBe(false)
    expect(usePanelStore.getState().queue[0]?.title).toBe("RECOVERY COMPLETE")
  })
})
