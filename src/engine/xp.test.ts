import { describe, expect, it } from "vitest"
import type { Hunter } from "../db/types"
import {
  applyXp,
  awardCompletion,
  clearRecovery,
  completionXp,
  habitDecay,
  statPointsFor,
  streakMultiplier,
  xpToNext,
} from "./xp"

const hunter = (over: Partial<Hunter> = {}): Hunter => ({
  id: "h",
  createdAt: "",
  updatedAt: "",
  deleted: 0,
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  rank: "E",
  statPoints: 0,
  str: 0,
  agi: 0,
  vit: 0,
  int: 0,
  per: 0,
  statUnits: { str: 0, agi: 0, vit: 0, int: 0, per: 0 },
  title: "Unranked",
  recoveryMode: false,
  lastSeenDate: "2026-09-05",
  ...over,
})

describe("xpToNext", () => {
  it("follows round(100 * level^1.5)", () => {
    expect(xpToNext(1)).toBe(100)
    expect(xpToNext(2)).toBe(283)
    expect(xpToNext(10)).toBe(3162)
    expect(xpToNext(75)).toBe(64952)
  })
})

describe("streakMultiplier", () => {
  it("adds 2% per day", () => {
    expect(streakMultiplier(0)).toBe(1)
    expect(streakMultiplier(10)).toBeCloseTo(1.2)
  })
  it("caps at 1.6x after 30 days", () => {
    expect(streakMultiplier(30)).toBeCloseTo(1.6)
    expect(streakMultiplier(365)).toBeCloseTo(1.6)
  })
  it("treats negative streaks as zero", () => {
    expect(streakMultiplier(-5)).toBe(1)
  })
})

describe("habitDecay", () => {
  it("halves each completion, zero from the fourth", () => {
    expect([0, 1, 2, 3, 9].map(habitDecay)).toEqual([1, 0.5, 0.25, 0, 0])
  })
})

describe("statPointsFor", () => {
  it("matches the difficulty table", () => {
    expect(["E", "D", "C", "B", "A", "S"].map((d) => statPointsFor(d as never))).toEqual([0, 1, 1, 2, 3, 5])
  })
})

describe("completionXp", () => {
  it("E at level 1, no streak", () => {
    expect(completionXp({ difficulty: "E", level: 1, streak: 0 })).toBe(11)
  })
  it("S at level 10 with capped streak", () => {
    // 400 * 2.0 * 1.6
    expect(completionXp({ difficulty: "S", level: 10, streak: 30 })).toBe(1280)
  })
  it("applies habit decay", () => {
    const base = { difficulty: "C" as const, level: 5, streak: 3 }
    const full = completionXp({ ...base, habitIndex: 0 })
    expect(completionXp({ ...base, habitIndex: 1 })).toBe(Math.round(full / 2))
    expect(completionXp({ ...base, habitIndex: 3 })).toBe(0)
  })
  it("rounds to an integer", () => {
    expect(Number.isInteger(completionXp({ difficulty: "D", level: 3, streak: 7 }))).toBe(true)
  })
})

describe("applyXp", () => {
  it("accumulates without levelling", () => {
    const r = applyXp(hunter(), 50)
    expect(r.hunter.xp).toBe(50)
    expect(r.hunter.level).toBe(1)
    expect(r.levelsGained).toEqual([])
  })
  it("levels up once, grants stat points, raises and refills HP", () => {
    const r = applyXp(hunter({ hp: 30 }), 100)
    expect(r.hunter).toMatchObject({ level: 2, xp: 0, statPoints: 3, maxHp: 110, hp: 110 })
    expect(r.levelsGained).toEqual([2])
  })
  it("carries overflow XP into the next level", () => {
    const r = applyXp(hunter(), 150)
    expect(r.hunter).toMatchObject({ level: 2, xp: 50 })
  })
  it("gains multiple levels in one award, one entry per level", () => {
    // 100 (1->2) + 283 (2->3) = 383
    const r = applyXp(hunter(), 383)
    expect(r.hunter).toMatchObject({ level: 3, xp: 0, statPoints: 6, maxHp: 120, hp: 120 })
    expect(r.levelsGained).toEqual([2, 3])
  })
  it("blocks XP in recovery mode", () => {
    const h = hunter({ recoveryMode: true })
    const r = applyXp(h, 500)
    expect(r.hunter).toBe(h)
    expect(r.xpApplied).toBe(0)
    expect(r.levelsGained).toEqual([])
  })
  it("ignores non-positive amounts", () => {
    expect(applyXp(hunter(), 0).hunter.xp).toBe(0)
    expect(applyXp(hunter(), -20).hunter.xp).toBe(0)
  })
  it("does not mutate the input", () => {
    const h = hunter()
    applyXp(h, 999)
    expect(h.level).toBe(1)
    expect(h.xp).toBe(0)
  })
})

describe("awardCompletion", () => {
  it("adds XP and difficulty stat points", () => {
    const r = awardCompletion(hunter(), { difficulty: "B", streak: 0, stat: "str" })
    // 100 * 1.1 = 110 -> level 2 with 10 left; +3 free points from level-up, +2 STR
    expect(r.hunter).toMatchObject({ level: 2, xp: 10, statPoints: 3, str: 2 })
    expect(r.statPointsAwarded).toBe(2)
    expect(r.levelsGained).toEqual([2])
  })
  it("gives nothing for a fully decayed habit", () => {
    const r = awardCompletion(hunter(), { difficulty: "S", streak: 0, habitIndex: 3, stat: "vit" })
    expect(r.xpApplied).toBe(0)
    expect(r.statPointsAwarded).toBe(0)
    expect(r.hunter.vit).toBe(0)
  })
  it("locks XP and stat points in recovery mode", () => {
    const r = awardCompletion(hunter({ recoveryMode: true }), { difficulty: "S", streak: 30, stat: "agi" })
    expect(r.xpApplied).toBe(0)
    expect(r.statPointsAwarded).toBe(0)
  })
  it("awards normally once recovery is cleared", () => {
    const h = clearRecovery(hunter({ recoveryMode: true }))
    expect(h.recoveryMode).toBe(false)
    expect(awardCompletion(h, { difficulty: "E", streak: 0, stat: "per" }).xpApplied).toBe(11)
  })
})
