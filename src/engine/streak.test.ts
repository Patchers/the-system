import { describe, expect, it } from "vitest"
import { advanceStreak, completionBlock, isDoneToday } from "./streak"

describe("advanceStreak", () => {
  it("starts at 1 for a first completion", () => {
    expect(advanceStreak({ streak: 0, bestStreak: 0, lastCompletedOn: null }, "2026-09-05")).toEqual({
      streak: 1,
      bestStreak: 1,
      lastCompletedOn: "2026-09-05",
    })
  })
  it("extends when yesterday was completed", () => {
    const r = advanceStreak({ streak: 4, bestStreak: 9, lastCompletedOn: "2026-09-04" }, "2026-09-05")
    expect(r).toEqual({ streak: 5, bestStreak: 9, lastCompletedOn: "2026-09-05" })
  })
  it("raises bestStreak when passed", () => {
    expect(advanceStreak({ streak: 9, bestStreak: 9, lastCompletedOn: "2026-09-04" }, "2026-09-05").bestStreak).toBe(10)
  })
  it("restarts at 1 after a gap, even if the penalty engine already zeroed it", () => {
    expect(advanceStreak({ streak: 0, bestStreak: 9, lastCompletedOn: "2026-09-02" }, "2026-09-05").streak).toBe(1)
    expect(advanceStreak({ streak: 6, bestStreak: 9, lastCompletedOn: "2026-09-02" }, "2026-09-05").streak).toBe(1)
  })
  it("is unchanged for a repeat on the same day", () => {
    const q = { streak: 3, bestStreak: 3, lastCompletedOn: "2026-09-05" }
    expect(advanceStreak(q, "2026-09-05")).toEqual(q)
  })
  it("crosses month boundaries", () => {
    expect(advanceStreak({ streak: 1, bestStreak: 1, lastCompletedOn: "2026-08-31" }, "2026-09-01").streak).toBe(2)
  })
})

describe("completionBlock", () => {
  it("blocks a second daily or task completion in a day", () => {
    expect(completionBlock({ type: "daily", active: true, deleted: 0 }, 1)).toBe("already-done")
    expect(completionBlock({ type: "task", active: true, deleted: 0 }, 1)).toBe("already-done")
  })
  it("lets habits repeat", () => {
    expect(completionBlock({ type: "habit", active: true, deleted: 0 }, 5)).toBeNull()
  })
  it("blocks inactive or deleted quests", () => {
    expect(completionBlock({ type: "daily", active: false, deleted: 0 }, 0)).toBe("inactive")
    expect(completionBlock({ type: "daily", active: true, deleted: 1 }, 0)).toBe("inactive")
  })
  it("allows a fresh daily", () => {
    expect(completionBlock({ type: "daily", active: true, deleted: 0 }, 0)).toBeNull()
  })
})

describe("isDoneToday", () => {
  it("is true for a daily completed today, never for habits", () => {
    expect(isDoneToday({ type: "daily", lastCompletedOn: "2026-09-05" }, "2026-09-05")).toBe(true)
    expect(isDoneToday({ type: "daily", lastCompletedOn: "2026-09-04" }, "2026-09-05")).toBe(false)
    expect(isDoneToday({ type: "habit", lastCompletedOn: "2026-09-05" }, "2026-09-05")).toBe(false)
  })
})
