import { describe, expect, it } from "vitest"
import type { Quest } from "../db/types"
import { assessRank, longestCurrentStreak, meetsRequirements, nextRank, rankChecklist, type RankEvidence } from "./rank"

const ev = (over: Partial<RankEvidence> = {}): RankEvidence => ({
  level: 1,
  streakDays: 0,
  workouts: 0,
  dungeonsCleared: 0,
  calorieDaysMet: 0,
  ...over,
})

describe("nextRank", () => {
  it("walks E -> S and stops", () => {
    expect(nextRank("E")).toBe("D")
    expect(nextRank("A")).toBe("S")
    expect(nextRank("S")).toBeNull()
  })
})

describe("meetsRequirements", () => {
  it("requires level and conditions together", () => {
    expect(meetsRequirements("D", ev({ level: 10, streakDays: 14 }))).toBe(true)
    expect(meetsRequirements("D", ev({ level: 10, streakDays: 13 }))).toBe(false)
    expect(meetsRequirements("D", ev({ level: 9, streakDays: 14 }))).toBe(false)
  })
  it("A needs 90-day streak, 3 dungeons and 60 calorie days", () => {
    const ok = ev({ level: 50, streakDays: 90, dungeonsCleared: 3, calorieDaysMet: 60 })
    expect(meetsRequirements("A", ok)).toBe(true)
    expect(meetsRequirements("A", { ...ok, calorieDaysMet: 59 })).toBe(false)
  })
})

describe("assessRank", () => {
  it("fresh hunter stays E with the D checklist", () => {
    const r = assessRank("E", ev())
    expect(r.rank).toBe("E")
    expect(r.next).toBe("D")
    expect(r.promotions).toEqual([])
    expect(r.atCeiling).toBe(false)
    expect(r.checklist.map((c) => [c.key, c.met])).toEqual([
      ["level", false],
      ["streakDays", false],
    ])
  })
  it("promotes E -> D when level and streak are met", () => {
    const r = assessRank("E", ev({ level: 10, streakDays: 14 }))
    expect(r.rank).toBe("D")
    expect(r.promotions).toEqual(["D"])
    expect(r.next).toBe("C")
  })
  it("sits at the ceiling when level is met but conditions are not", () => {
    const r = assessRank("E", ev({ level: 12, streakDays: 5 }))
    expect(r.rank).toBe("E")
    expect(r.atCeiling).toBe(true)
    const streak = r.checklist.find((c) => c.key === "streakDays")
    expect(streak).toMatchObject({ required: 14, current: 5, met: false })
    expect(r.checklist.find((c) => c.key === "level")?.met).toBe(true)
  })
  it("never demotes", () => {
    const r = assessRank("B", ev({ level: 1 }))
    expect(r.rank).toBe("B")
    expect(r.promotions).toEqual([])
  })
  it("promotes through several ranks in one assessment", () => {
    const r = assessRank("E", ev({ level: 20, streakDays: 30, workouts: 20 }))
    expect(r.rank).toBe("C")
    expect(r.promotions).toEqual(["D", "C"])
    expect(r.next).toBe("B")
  })
  it("stops at the first unmet rank", () => {
    // Qualifies for C on paper but not B (needs a dungeon)
    const r = assessRank("D", ev({ level: 40, streakDays: 60, workouts: 20, dungeonsCleared: 0 }))
    expect(r.rank).toBe("C")
    expect(r.atCeiling).toBe(true)
    expect(r.checklist.find((c) => c.key === "dungeonsCleared")?.met).toBe(false)
  })
  it("S is terminal: no next, empty checklist, never at ceiling", () => {
    const r = assessRank("S", ev({ level: 99 }))
    expect(r.next).toBeNull()
    expect(r.checklist).toEqual([])
    expect(r.atCeiling).toBe(false)
  })
})

describe("rankChecklist", () => {
  it("lists only non-zero requirements with readable labels", () => {
    const items = rankChecklist("B", ev())
    expect(items.map((i) => i.key)).toEqual(["level", "streakDays", "dungeonsCleared", "calorieDaysMet"])
    expect(items.find((i) => i.key === "dungeonsCleared")?.label).toBe("Clear 3 dungeons")
    expect(items.find((i) => i.key === "calorieDaysMet")?.label).toBe("Hit calorie goal 60 of last 90 days")
  })
  it("pluralises correctly", () => {
    expect(rankChecklist("C", ev()).find((i) => i.key === "dungeonsCleared")?.label).toBe("Clear 1 dungeon")
  })
})

describe("longestCurrentStreak", () => {
  const q = (over: Partial<Quest>): Quest => ({
    id: "q",
    createdAt: "",
    updatedAt: "",
    deleted: 0,
    title: "",
    type: "daily",
    difficulty: "E",
    stat: "str",
    streak: 0,
    bestStreak: 0,
    lastCompletedOn: null,
    active: true,
    ...over,
  })
  it("takes the max across active dailies only", () => {
    const quests = [
      q({ streak: 4 }),
      q({ streak: 9 }),
      q({ streak: 50, type: "habit" }),
      q({ streak: 40, active: false }),
      q({ streak: 30, deleted: 1 }),
    ]
    expect(longestCurrentStreak(quests)).toBe(9)
  })
  it("is zero with no quests", () => {
    expect(longestCurrentStreak([])).toBe(0)
  })
})
