import { describe, expect, it } from "vitest"
import type { Hunter, WorkoutSet } from "../db/types"
import { accrueStatUnits, agiUnits, allocateStatPoints, applyWorkout, strUnits, vitUnits, workoutUnits } from "./stats"

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
  title: "",
  recoveryMode: false,
  recoveries: 0,
  lastSeenDate: "2026-09-05",
  ...over,
})

const set = (over: Partial<WorkoutSet>): WorkoutSet => ({
  id: "s",
  createdAt: "",
  updatedAt: "",
  deleted: 0,
  workoutId: "w",
  exerciseName: "x",
  ...over,
})

describe("unit conversion", () => {
  it("STR = weight * reps / 100 summed over sets", () => {
    expect(strUnits([set({ weightKg: 100, reps: 10 }), set({ weightKg: 50, reps: 5 })])).toBe(12.5)
  })
  it("STR ignores sets missing weight or reps", () => {
    expect(strUnits([set({ weightKg: 100 }), set({ reps: 10 })])).toBe(0)
  })
  it("VIT = minutes / 10", () => {
    expect(vitUnits([set({ durationMin: 30 }), set({ durationMin: 15 })])).toBe(4.5)
  })
  it("AGI = km", () => {
    expect(agiUnits([set({ distanceKm: 5 }), set({ distanceKm: 2.5 })])).toBe(7.5)
  })
  it("skips deleted sets", () => {
    expect(agiUnits([set({ distanceKm: 5, deleted: 1 })])).toBe(0)
  })
  it("workoutUnits never produces INT or PER", () => {
    const u = workoutUnits([set({ weightKg: 100, reps: 10, durationMin: 10, distanceKm: 1 })])
    expect(u).toEqual({ str: 10, vit: 1, agi: 1, int: 0, per: 0 })
  })
  it("sums fractional units without float drift", () => {
    const sets = Array.from({ length: 10 }, () => set({ distanceKm: 0.1 }))
    expect(agiUnits(sets)).toBe(1)
  })
})

describe("accrueStatUnits", () => {
  it("converts every 10 units into a point and keeps the remainder", () => {
    const r = accrueStatUnits(hunter(), { str: 25 })
    expect(r.hunter.str).toBe(2)
    expect(r.hunter.statUnits.str).toBe(5)
    expect(r.pointsGained.str).toBe(2)
  })
  it("carries remainders across calls", () => {
    const first = accrueStatUnits(hunter(), { agi: 7 })
    expect(first.hunter.agi).toBe(0)
    const second = accrueStatUnits(first.hunter, { agi: 5 })
    expect(second.hunter.agi).toBe(1)
    expect(second.hunter.statUnits.agi).toBe(2)
    expect(second.pointsGained.agi).toBe(1)
  })
  it("handles several stats at once and ignores zero", () => {
    const r = accrueStatUnits(hunter(), { str: 10, vit: 3, agi: 0 })
    expect(r.hunter).toMatchObject({ str: 1, vit: 0, agi: 0 })
    expect(r.hunter.statUnits).toEqual({ str: 0, vit: 3, agi: 0, int: 0, per: 0 })
  })
  it("does not mutate the input", () => {
    const h = hunter()
    accrueStatUnits(h, { str: 50 })
    expect(h.str).toBe(0)
    expect(h.statUnits.str).toBe(0)
  })
  it("applyWorkout wires sets straight through", () => {
    const r = applyWorkout(hunter(), [set({ weightKg: 80, reps: 25 }), set({ durationMin: 100 })])
    expect(r.hunter).toMatchObject({ str: 2, vit: 1 })
  })
})

describe("allocateStatPoints", () => {
  it("spends a free point on a stat", () => {
    const r = allocateStatPoints(hunter({ statPoints: 3 }), "int")
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.hunter).toMatchObject({ statPoints: 2, int: 1 })
  })
  it("spends several at once", () => {
    const r = allocateStatPoints(hunter({ statPoints: 3 }), "per", 3)
    if (r.ok) expect(r.hunter).toMatchObject({ statPoints: 0, per: 3 })
  })
  it("refuses without enough points", () => {
    expect(allocateStatPoints(hunter({ statPoints: 1 }), "str", 2)).toEqual({ ok: false, reason: "no-points" })
    expect(allocateStatPoints(hunter(), "str")).toEqual({ ok: false, reason: "no-points" })
  })
  it("is locked in recovery mode", () => {
    expect(allocateStatPoints(hunter({ statPoints: 5, recoveryMode: true }), "str")).toEqual({
      ok: false,
      reason: "recovery",
    })
  })
})
