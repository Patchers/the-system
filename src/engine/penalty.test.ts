import { describe, expect, it } from "vitest"
import type { Completion, Hunter, Quest } from "../db/types"
import { runPenalty, type PenaltyInput } from "./penalty"
import { xpToNext } from "./xp"

const hunter = (over: Partial<Hunter> = {}): Hunter => ({
  id: "h",
  createdAt: "",
  updatedAt: "",
  deleted: 0,
  level: 5,
  xp: 500,
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
  title: "",
  recoveryMode: false,
  recoveries: 0,
  lastSeenDate: "2026-09-01",
  ...over,
})

const quest = (id: string, over: Partial<Quest> = {}): Quest => ({
  id,
  createdAt: "",
  updatedAt: "",
  deleted: 0,
  title: id,
  type: "daily",
  difficulty: "C",
  stat: "str",
  streak: 7,
  bestStreak: 7,
  lastCompletedOn: "2026-08-31",
  active: true,
  ...over,
})

const completion = (questId: string, date: string): Completion => ({
  id: `${questId}-${date}`,
  createdAt: "",
  updatedAt: "",
  deleted: 0,
  questId,
  date,
  xpAwarded: 1,
  statAwarded: 0,
})

const run = (over: Partial<PenaltyInput> = {}) =>
  runPenalty({
    hunter: hunter(),
    quests: [quest("a"), quest("b")],
    completions: [],
    today: "2026-09-02",
    penaltyEnabled: true,
    ...over,
  })

// level 5: xpToNext = 1118, 10% floored = 111
const LOSS = Math.floor(xpToNext(5) * 0.1)

describe("runPenalty", () => {
  it("does nothing when no day has elapsed, but stamps lastSeenDate", () => {
    const r = run({ today: "2026-09-01" })
    expect(r.hunter).toMatchObject({ xp: 500, hp: 100, lastSeenDate: "2026-09-01" })
    expect(r.lines).toEqual([])
  })

  it("respects penaltyEnabled = false", () => {
    const r = run({ penaltyEnabled: false, today: "2026-09-10" })
    expect(r.hunter).toMatchObject({ xp: 500, hp: 100, lastSeenDate: "2026-09-10" })
    expect(r.quests.map((q) => q.streak)).toEqual([7, 7])
    expect(r.lines).toEqual([])
  })

  it("penalises each missed daily on one missed day", () => {
    const r = run()
    expect(r.misses).toHaveLength(2)
    expect(r.missedDays).toEqual(["2026-09-01"])
    expect(r.xpLost).toBe(LOSS * 2)
    expect(r.hpLost).toBe(40)
    expect(r.hunter).toMatchObject({ xp: 500 - LOSS * 2, hp: 60, level: 5, lastSeenDate: "2026-09-02" })
    expect(r.quests.map((q) => q.streak)).toEqual([0, 0])
    expect(r.streaksReset).toEqual(["a", "b"])
  })

  it("excludes today from the settlement", () => {
    const r = run({ today: "2026-09-03" })
    expect(r.missedDays).toEqual(["2026-09-01", "2026-09-02"])
  })

  it("floors XP at zero and never de-levels", () => {
    const r = run({ hunter: hunter({ xp: 50 }) })
    expect(r.hunter.xp).toBe(0)
    expect(r.hunter.level).toBe(5)
    expect(r.xpLost).toBe(50)
  })

  it("exempts a quest completed on that day and keeps its streak", () => {
    const r = run({ completions: [completion("a", "2026-09-01")] })
    expect(r.misses.map((m) => m.questId)).toEqual(["b"])
    expect(r.quests.find((q) => q.id === "a")?.streak).toBe(7)
    expect(r.quests.find((q) => q.id === "b")?.streak).toBe(0)
  })

  it("recovers 10 HP on any day with a completion, capped at maxHp", () => {
    // Day 1: b missed (-20), a done (+10) => 90
    const r = run({ completions: [completion("a", "2026-09-01")] })
    expect(r.hunter.hp).toBe(90)
    expect(r.hpRecovered).toBe(10)
    // Nothing missed, one completion: stays at cap
    const full = run({ quests: [quest("a")], completions: [completion("a", "2026-09-01")] })
    expect(full.hunter.hp).toBe(100)
    expect(full.hpRecovered).toBe(0)
    expect(full.lines).toEqual([])
  })

  it("counts a completion on a non-daily quest as an active day", () => {
    const habit = quest("h", { type: "habit" })
    const r = run({ quests: [quest("a"), habit], completions: [completion("h", "2026-09-01")] })
    expect(r.misses.map((m) => m.questId)).toEqual(["a"])
    expect(r.hunter.hp).toBe(90)
  })

  it("ignores inactive, deleted and non-daily quests", () => {
    const r = run({
      quests: [quest("a"), quest("off", { active: false }), quest("gone", { deleted: 1 }), quest("t", { type: "task" })],
    })
    expect(r.misses.map((m) => m.questId)).toEqual(["a"])
  })

  it("ignores deleted completions", () => {
    const r = run({ completions: [{ ...completion("a", "2026-09-01"), deleted: 1 }] })
    expect(r.misses).toHaveLength(2)
  })

  it("enters recovery mode when HP hits zero, in one batch", () => {
    // 3 days x 2 quests x 20 = 120 > 100
    const r = run({ today: "2026-09-04" })
    expect(r.hunter.hp).toBe(0)
    expect(r.hunter.recoveryMode).toBe(true)
    expect(r.enteredRecovery).toBe(true)
    expect(r.misses).toHaveLength(6)
    expect(r.lines.some((l) => l.includes("RECOVERY MODE"))).toBe(true)
  })

  it("does not re-announce recovery when already in it", () => {
    const r = run({ hunter: hunter({ hp: 0, recoveryMode: true }) })
    expect(r.hunter.hp).toBe(0)
    expect(r.hunter.recoveryMode).toBe(true)
    expect(r.enteredRecovery).toBe(false)
  })

  it("does not reset a streak that was continued after the missed day", () => {
    const q = quest("a", { lastCompletedOn: "2026-09-02", streak: 3 })
    const r = run({ quests: [q], today: "2026-09-03", completions: [completion("a", "2026-09-02")] })
    expect(r.misses.map((m) => m.date)).toEqual(["2026-09-01"])
    expect(r.quests[0].streak).toBe(3)
    expect(r.streaksReset).toEqual([])
  })

  it("builds a single summary with counts and streak names", () => {
    const r = run({ today: "2026-09-03" })
    expect(r.lines).toEqual([
      "2 days with missed daily quests.",
      "4 quests failed.",
      `-${LOSS * 4} XP`,
      "-80 HP",
      "Streaks reset: a, b.",
    ])
  })

  it("does not mutate its inputs", () => {
    const h = hunter()
    const qs = [quest("a")]
    run({ hunter: h, quests: qs, today: "2026-09-05" })
    expect(h.xp).toBe(500)
    expect(h.lastSeenDate).toBe("2026-09-01")
    expect(qs[0].streak).toBe(7)
  })
})
