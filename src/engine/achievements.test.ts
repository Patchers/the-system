import { describe, expect, it } from "vitest"
import { ACHIEVEMENTS, newlyUnlocked, type AchievementStats } from "./achievements"

const stats = (over: Partial<AchievementStats> = {}): AchievementStats => ({
  level: 1,
  rank: "E",
  completions: 0,
  longestStreak: 0,
  workouts: 0,
  dungeonsCleared: 0,
  activeDays: 0,
  recoveries: 0,
  ...over,
})

describe("achievements", () => {
  it("has unique codes", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.code)).size).toBe(ACHIEVEMENTS.length)
  })
  it("unlocks nothing for a fresh hunter", () => {
    expect(newlyUnlocked(stats(), [])).toEqual([])
  })
  it("unlocks thresholds that are met", () => {
    const codes = newlyUnlocked(stats({ completions: 12, level: 5 }), []).map((a) => a.code)
    expect(codes).toEqual(["first-blood", "ten-quests", "level-5"])
  })
  it("skips already-unlocked codes", () => {
    expect(newlyUnlocked(stats({ completions: 1 }), ["first-blood"])).toEqual([])
  })
  it("handles rank tiers", () => {
    expect(newlyUnlocked(stats({ rank: "B" }), []).map((a) => a.code)).toEqual(["rank-d", "rank-b"])
    expect(newlyUnlocked(stats({ rank: "S" }), []).map((a) => a.code)).toEqual(["rank-d", "rank-b", "rank-s"])
  })
})
