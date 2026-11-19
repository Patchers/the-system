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

  it("builds lift history per exercise, oldest first", async () => {
    await workoutRepo.create({ date: "2026-11-05", notes: "" }, [
      { exerciseName: "Bench", reps: 8, weightKg: 62.5 },
      { exerciseName: "Run", distanceKm: 5 },
    ])
    await workoutRepo.create({ date: "2026-11-01", notes: "" }, [
      { exerciseName: "Bench", reps: 8, weightKg: 60 },
      { exerciseName: "Dips", reps: 12 },
    ])
    const h = await workoutRepo.liftHistory(["Bench", "Dips", "Squat"])
    expect(h.get("Bench")!.map((s) => s.date)).toEqual(["2026-11-01", "2026-11-05"])
    expect(h.get("Dips")![0].sets).toEqual([{ reps: 12, weightKg: 0 }])
    expect(h.get("Squat")).toEqual([])
    expect(await workoutRepo.liftNames()).toEqual(["Bench"])
  })

  it("leaves deleted sessions out of lift history", async () => {
    const { workout } = await workoutRepo.create({ date: "2026-11-01", notes: "" }, [{ exerciseName: "Bench", reps: 8, weightKg: 60 }])
    await workoutRepo.remove(workout.id)
    expect((await workoutRepo.liftHistory(["Bench"])).get("Bench")).toEqual([])
  })

  it("tracks when each template was last trained", async () => {
    await workoutRepo.create({ date: "2026-11-01", notes: "", templateId: "A" }, [])
    await workoutRepo.create({ date: "2026-11-03", notes: "", templateId: "A" }, [])
    await workoutRepo.create({ date: "2026-11-02", notes: "", templateId: "B" }, [])
    const used = await workoutRepo.lastUsedByTemplate()
    expect(used.get("A")!.startsWith("2026-11-03")).toBe(true)
    expect(used.get("B")!.startsWith("2026-11-02")).toBe(true)
  })
})
