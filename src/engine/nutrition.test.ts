import { describe, expect, it } from "vitest"
import { calorieDaysMet, calorieGoalMet } from "./nutrition"

describe("calorieGoalMet (under mode)", () => {
  it("counts a logged day at or under goal", () => {
    expect(calorieGoalMet({ calories: 1800, goal: 2200 })).toBe(true)
    expect(calorieGoalMet({ calories: 2200, goal: 2200 })).toBe(true)
  })
  it("fails when over goal", () => {
    expect(calorieGoalMet({ calories: 2201, goal: 2200 })).toBe(false)
  })
  it("never counts an unlogged day", () => {
    expect(calorieGoalMet({ calories: 0, goal: 2200 })).toBe(false)
  })
})

describe("calorieDaysMet", () => {
  it("counts live entries that met the goal", () => {
    expect(
      calorieDaysMet([
        { calories: 1000, goal: 2000, deleted: 0 },
        { calories: 3000, goal: 2000, deleted: 0 },
        { calories: 1000, goal: 2000, deleted: 1 },
        { calories: 0, goal: 2000, deleted: 0 },
      ]),
    ).toBe(1)
  })
})
