import { beforeEach, describe, expect, it } from "vitest"
import { db } from "../db/schema"
import { resetDb } from "../test/db"
import { templateRepo } from "./templateRepo"
import { workoutRepo } from "./workoutRepo"

beforeEach(resetDb)

describe("workoutRepo", () => {
  it("creates a workout with its sets atomically", async () => {
    const { workout, sets } = await workoutRepo.create({ date: "2026-09-05", notes: "" }, [
      { exerciseName: "Squat", reps: 5, weightKg: 100 },
      { exerciseName: "Run", distanceKm: 5, durationMin: 30 },
    ])
    expect(sets.every((s) => s.workoutId === workout.id)).toBe(true)
    expect(await workoutRepo.setsFor(workout.id)).toHaveLength(2)
    expect(await workoutRepo.count()).toBe(1)
  })

  it("lists newest first", async () => {
    await workoutRepo.create({ date: "2026-09-01", notes: "" }, [])
    await workoutRepo.create({ date: "2026-09-05", notes: "" }, [])
    await workoutRepo.create({ date: "2026-09-03", notes: "" }, [])
    expect((await workoutRepo.list()).map((w) => w.date)).toEqual(["2026-09-05", "2026-09-03", "2026-09-01"])
  })

  it("soft-deletes the workout and its sets together", async () => {
    const { workout } = await workoutRepo.create({ date: "2026-09-05", notes: "" }, [{ exerciseName: "x", reps: 1 }])
    await workoutRepo.remove(workout.id)
    expect(await workoutRepo.count()).toBe(0)
    expect(await workoutRepo.setsFor(workout.id)).toHaveLength(0)
    expect(await db.workoutSets.count()).toBe(1)
  })
})

describe("templateRepo", () => {
  it("stores exercise arrays and hides removed templates", async () => {
    const t = await templateRepo.add("Push", [{ name: "Bench", targetSets: 3, targetReps: 8 }])
    expect((await templateRepo.get(t.id)).exercises[0].name).toBe("Bench")
    await templateRepo.remove(t.id)
    expect(await templateRepo.list()).toHaveLength(0)
  })
})
