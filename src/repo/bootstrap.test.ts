import { beforeEach, describe, expect, it } from "vitest"
import { resetDb } from "../test/db"
import { bootstrap } from "./bootstrap"
import { dungeonRepo } from "./dungeonRepo"
import { gatherRankEvidence } from "./evidence"
import { hunterRepo } from "./hunterRepo"
import { nutritionRepo } from "./nutritionRepo"
import { questRepo } from "./questRepo"
import { workoutRepo } from "./workoutRepo"

beforeEach(resetDb)

describe("bootstrap", () => {
  it("seeds once: hunter, settings, three starter dailies", async () => {
    const first = await bootstrap()
    expect(first.seeded).toBe(true)
    expect(first.hunter).toMatchObject({ level: 1, rank: "E", hp: 100, recoveryMode: false })
    expect((await questRepo.listActive()).filter((q) => q.type === "daily")).toHaveLength(3)

    const second = await bootstrap()
    expect(second.seeded).toBe(false)
    expect(second.hunter.id).toBe(first.hunter.id)
  })

  it("hunterRepo.save round-trips engine output", async () => {
    const { hunter } = await bootstrap()
    await hunterRepo.save({ ...hunter, level: 7, xp: 42 })
    expect(await hunterRepo.get()).toMatchObject({ level: 7, xp: 42 })
  })
})

describe("gatherRankEvidence", () => {
  it("assembles level, streak, workouts, dungeons and calorie days", async () => {
    const { hunter } = await bootstrap()
    await hunterRepo.save({ ...hunter, level: 12 })
    const quests = await questRepo.listActive()
    await questRepo.saveMany(quests.map((q, i) => ({ ...q, streak: i === 1 ? 20 : 3 })))
    await workoutRepo.create({ date: "2026-09-05", notes: "" }, [])
    await workoutRepo.create({ date: "2026-09-04", notes: "" }, [])
    const d = await dungeonRepo.add({ name: "Gate", description: "", bossName: "Igris", deadline: "2026-12-01" })
    await dungeonRepo.setStatus(d.id, "cleared")
    await dungeonRepo.add({ name: "Open", description: "", bossName: "", deadline: "2026-12-01" })
    await nutritionRepo.setCalories("2026-09-05", 1800, 2200)
    await nutritionRepo.setCalories("2026-09-04", 2600, 2200)
    await nutritionRepo.setCalories("2026-01-01", 1000, 2200) // outside the 90-day window

    expect(await gatherRankEvidence("2026-09-05")).toEqual({
      level: 12,
      streakDays: 20,
      workouts: 2,
      dungeonsCleared: 1,
      calorieDaysMet: 1,
    })
  })
})

describe("bootstrap concurrency", () => {
  it("seeds exactly once when called twice at the same time", async () => {
    const [a, b] = await Promise.all([bootstrap(), bootstrap()])
    expect([a.seeded, b.seeded].sort()).toEqual([false, true])
    expect(await questRepo.listActive()).toHaveLength(3)
  })
})
