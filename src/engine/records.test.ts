import { describe, expect, it } from "vitest"
import { bestByExercise, e1rm, e1rmSeries, findRecords } from "./records"

describe("e1rm", () => {
  it("applies Epley", () => expect(e1rm(100, 5)).toBe(116.7))
  it("returns the weight for a single", () => expect(e1rm(100, 1)).toBe(100))
  it("ignores bodyweight and very high reps", () => {
    expect(e1rm(0, 10)).toBe(0)
    expect(e1rm(undefined, 10)).toBe(0)
    expect(e1rm(20, 20)).toBe(0)
  })
})

describe("records", () => {
  const sets = [
    { exerciseName: "Bench", reps: 8, weightKg: 60 },
    { exerciseName: "Bench", reps: 6, weightKg: 65 },
    { exerciseName: "Squat", reps: 5, weightKg: 100 },
  ]

  it("finds the best e1RM per exercise", () => {
    const best = bestByExercise(sets)
    expect(best.get("Bench")).toBe(78)
    expect(best.get("Squat")).toBe(116.7)
  })

  it("flags lifts that beat a previous best", () => {
    const prev = new Map([
      ["Bench", 75],
      ["Squat", 120],
    ])
    expect(findRecords(prev, sets)).toEqual([{ exerciseName: "Bench", e1rm: 78, previous: 75 }])
  })

  it("does not call a first-ever session a record", () => {
    expect(findRecords(new Map(), sets)).toEqual([])
  })

  it("builds a per-session trend, skipping sessions with nothing to estimate", () => {
    const series = e1rmSeries([
      { date: "a", sets: [{ weightKg: 60, reps: 8 }] },
      { date: "b", sets: [{ weightKg: 0, reps: 10 }] },
      { date: "c", sets: [{ weightKg: 62.5, reps: 8 }] },
    ])
    expect(series.map((p) => p.date)).toEqual(["a", "c"])
  })
})
