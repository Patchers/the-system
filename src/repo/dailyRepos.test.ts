import { beforeEach, describe, expect, it } from "vitest"
import { resetDb } from "../test/db"
import { achievementRepo } from "./achievementRepo"
import { nutritionRepo } from "./nutritionRepo"
import { settingsRepo } from "./settingsRepo"
import { vitalsRepo } from "./vitalsRepo"

beforeEach(resetDb)

describe("nutritionRepo", () => {
  it("creates the day on first add and increments after", async () => {
    const first = await nutritionRepo.addCalories("2026-09-05", 250, 2200)
    expect(first).toMatchObject({ calories: 250, goal: 2200 })
    const second = await nutritionRepo.addCalories("2026-09-05", 500, 2200)
    expect(second.calories).toBe(750)
    expect(second.id).toBe(first.id)
  })

  it("never goes below zero", async () => {
    await nutritionRepo.addCalories("2026-09-05", 100, 2200)
    expect((await nutritionRepo.addCalories("2026-09-05", -500, 2200)).calories).toBe(0)
  })

  it("keeps one row per date", async () => {
    await nutritionRepo.setCalories("2026-09-05", 1000, 2200)
    await nutritionRepo.setCalories("2026-09-05", 1200, 2200)
    expect(await nutritionRepo.listBetween("2026-09-01", "2026-09-30")).toHaveLength(1)
  })
})

describe("vitalsRepo", () => {
  it("merges fields into one row per day", async () => {
    await vitalsRepo.upsert("2026-09-05", { weightKg: 80 })
    const v = await vitalsRepo.upsert("2026-09-05", { sleepHours: 7 })
    expect(v).toMatchObject({ weightKg: 80, sleepHours: 7 })
    expect(await vitalsRepo.listBetween("2026-09-01", "2026-09-30")).toHaveLength(1)
  })

  it("accumulates water", async () => {
    await vitalsRepo.addWater("2026-09-05", 250)
    expect((await vitalsRepo.addWater("2026-09-05", 500)).waterMl).toBe(750)
  })
})

describe("achievementRepo", () => {
  it("unlocks once", async () => {
    expect(await achievementRepo.unlock("first-blood")).not.toBeNull()
    expect(await achievementRepo.unlock("first-blood")).toBeNull()
    expect(await achievementRepo.list()).toHaveLength(1)
    expect(await achievementRepo.has("first-blood")).toBe(true)
  })
})

describe("settingsRepo", () => {
  it("returns defaults before seeding and persists patches", async () => {
    const s = await settingsRepo.get()
    expect(s).toMatchObject({ id: "singleton", penaltyEnabled: true, dayRolloverHour: 4 })
    const next = await settingsRepo.update({ calorieGoal: 1800 })
    expect(next.calorieGoal).toBe(1800)
    expect((await settingsRepo.get()).calorieGoal).toBe(1800)
  })
})
