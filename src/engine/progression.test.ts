import { describe, expect, it } from "vitest"
import type { TemplateExercise } from "../db/types"
import { isProgressive, nextTarget, outcome, restFor, roundTo, stallCount, type ExerciseSession } from "./progression"

const bench: TemplateExercise = { name: "Bench press", targetSets: 3, repMin: 6, repMax: 8, incrementKg: 2.5, startWeightKg: 60 }

const session = (weightKg: number, reps: number[], date = "2026-11-01"): ExerciseSession => ({
  date,
  sets: reps.map((r) => ({ weightKg, reps: r })),
})

describe("isProgressive", () => {
  it("needs both ends of the rep range", () => {
    expect(isProgressive(bench)).toBe(true)
    expect(isProgressive({ name: "Run", targetDistanceKm: 5 })).toBe(false)
    expect(isProgressive({ name: "x", repMin: 6 })).toBe(false)
  })
})

describe("outcome", () => {
  it("is top when every set hits repMax", () => expect(outcome(session(60, [8, 8, 8]), bench)).toBe("top"))
  it("is range when every set reaches repMin", () => expect(outcome(session(60, [8, 7, 6]), bench)).toBe("range"))
  it("is missed when any needed set falls short", () => expect(outcome(session(60, [7, 6, 5]), bench)).toBe("missed"))
  it("is missed when too few sets were logged", () => expect(outcome(session(60, [8, 8]), bench)).toBe("missed"))
  it("judges only sets at the working weight", () => {
    const s: ExerciseSession = { date: "d", sets: [{ weightKg: 40, reps: 10 }, ...session(60, [8, 8, 8]).sets] }
    expect(outcome(s, bench)).toBe("top")
  })
})

describe("nextTarget", () => {
  it("uses the start weight for a new lift", () => {
    expect(nextTarget(bench, [])).toMatchObject({ weightKg: 60, reps: 6, sets: 3, status: "new" })
  })

  it("leaves weight open for a new lift with no start weight", () => {
    expect(nextTarget({ ...bench, startWeightKg: undefined }, []).weightKg).toBeUndefined()
  })

  it("adds the increment after hitting the top of the range", () => {
    expect(nextTarget(bench, [session(60, [8, 8, 8])])).toMatchObject({ weightKg: 62.5, reps: 6, status: "up" })
  })

  it("holds and chases one more rep when in range", () => {
    expect(nextTarget(bench, [session(60, [8, 7, 6])])).toMatchObject({ weightKg: 60, reps: 7, status: "hold" })
  })

  it("caps the chased reps at repMax", () => {
    const ex = { ...bench, targetSets: 2 }
    expect(nextTarget(ex, [session(60, [8, 8, 8])]).status).toBe("up")
    expect(nextTarget({ ...bench, targetSets: 3 }, [session(60, [8, 8, 7])]).reps).toBe(8)
  })

  it("holds after one miss", () => {
    expect(nextTarget(bench, [session(60, [6, 5, 5])])).toMatchObject({ weightKg: 60, status: "hold" })
  })

  it("resets to 90% after two misses in a row at the same weight", () => {
    const h = [session(60, [6, 5, 5]), session(60, [6, 5, 4])]
    expect(stallCount(h, bench)).toBe(2)
    expect(nextTarget(bench, h)).toMatchObject({ weightKg: 55, reps: 6, status: "reset" })
  })

  it("does not count misses at a different weight toward a reset", () => {
    const h = [session(57.5, [5, 5, 5]), session(60, [6, 5, 5])]
    expect(stallCount(h, bench)).toBe(1)
    expect(nextTarget(bench, h).status).toBe("hold")
  })

  it("always drops weight on a reset, even for light loads", () => {
    const curl: TemplateExercise = { name: "Curl", targetSets: 3, repMin: 8, repMax: 10, incrementKg: 2.5 }
    const h = [session(10, [5, 5, 5]), session(10, [5, 5, 5])]
    expect(nextTarget(curl, h).weightKg).toBe(7.5)
  })

  it("progresses bodyweight lifts by adding load", () => {
    const pull: TemplateExercise = { name: "Pull-up", targetSets: 4, repMin: 6, repMax: 8, incrementKg: 2.5, startWeightKg: 0 }
    expect(nextTarget(pull, [session(0, [8, 8, 8, 8])]).weightKg).toBe(2.5)
  })

  it("ignores empty sessions", () => {
    expect(nextTarget(bench, [session(60, [8, 8, 8]), { date: "x", sets: [] }]).status).toBe("up")
  })
})

describe("helpers", () => {
  it("roundTo snaps to the increment and never goes negative", () => {
    expect(roundTo(54, 2.5)).toBe(55)
    expect(roundTo(-3, 2.5)).toBe(0)
  })

  it("restFor uses heavy rest for low rep ranges", () => {
    expect(restFor(bench)).toBe(150)
    expect(restFor({ name: "x", repMin: 10, repMax: 12 })).toBe(90)
    expect(restFor({ name: "x", repMin: 10, repMax: 12, restSec: 60 })).toBe(60)
  })
})
