/**
 * Double progression. Pure: works over plain logged sessions, oldest first.
 *
 * - Every set at the working weight reaches the top of the rep range → add weight.
 * - Every set reaches the bottom of the range → same weight, chase one more rep.
 * - Short of the bottom → hold. After STALL_LIMIT misses in a row at one weight,
 *   reset to RESET_FACTOR of it and build back up.
 */
import type { TemplateExercise } from "../db/types"
import { DEFAULT_INCREMENT_KG, HEAVY_REP_MAX, RESET_FACTOR, REST_HEAVY_SEC, REST_LIGHT_SEC, STALL_LIMIT } from "./constants"

export interface LoggedSet {
  reps: number
  weightKg: number
}

/** One past session's sets for a single exercise. */
export interface ExerciseSession {
  date: string
  sets: LoggedSet[]
}

export type TargetStatus = "new" | "up" | "hold" | "reset"

export interface Target {
  /** Undefined only for a brand-new lift with no start weight: the hunter picks. */
  weightKg?: number
  reps: number
  sets: number
  status: TargetStatus
  restSec: number
}

export type Outcome = "top" | "range" | "missed"

const DEFAULT_SETS = 3

export const isProgressive = (ex: TemplateExercise): boolean => ex.repMin !== undefined && ex.repMax !== undefined

const round2 = (n: number) => Math.round(n * 100) / 100

/** Nearest multiple of `step`, never negative. */
export function roundTo(n: number, step: number): number {
  if (step <= 0) return round2(Math.max(0, n))
  return round2(Math.max(0, Math.round(n / step) * step))
}

export function restFor(ex: TemplateExercise): number {
  if (ex.restSec !== undefined) return ex.restSec
  return (ex.repMax ?? ex.targetReps ?? 10) <= HEAVY_REP_MAX ? REST_HEAVY_SEC : REST_LIGHT_SEC
}

/** The heaviest weight used in the session is the working weight. */
export function workingWeight(session: ExerciseSession): number {
  return session.sets.reduce((m, s) => Math.max(m, s.weightKg), 0)
}

export function outcome(session: ExerciseSession, ex: TemplateExercise): Outcome {
  const w = workingWeight(session)
  const working = session.sets.filter((s) => s.weightKg === w)
  const need = ex.targetSets ?? DEFAULT_SETS
  const atLeast = (r: number) => working.filter((s) => s.reps >= r).length >= need
  if (atLeast(ex.repMax ?? Infinity)) return "top"
  if (atLeast(ex.repMin ?? 0)) return "range"
  return "missed"
}

/** Consecutive missed sessions at the latest working weight, counted back from the newest. */
export function stallCount(history: readonly ExerciseSession[], ex: TemplateExercise): number {
  if (history.length === 0) return 0
  const w = workingWeight(history[history.length - 1])
  let n = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i]
    if (workingWeight(s) !== w || outcome(s, ex) !== "missed") break
    n++
  }
  return n
}

/** This session's target for one exercise, given its history oldest → newest. */
export function nextTarget(ex: TemplateExercise, history: readonly ExerciseSession[]): Target {
  const sets = ex.targetSets ?? DEFAULT_SETS
  const repMin = ex.repMin ?? ex.targetReps ?? 8
  const repMax = ex.repMax ?? repMin
  const inc = ex.incrementKg ?? DEFAULT_INCREMENT_KG
  const restSec = restFor(ex)
  const sessions = history.filter((s) => s.sets.length > 0)

  if (sessions.length === 0) return { weightKg: ex.startWeightKg, reps: repMin, sets, status: "new", restSec }

  const last = sessions[sessions.length - 1]
  const w = workingWeight(last)
  const result = outcome(last, ex)

  if (result === "top") return { weightKg: round2(w + inc), reps: repMin, sets, status: "up", restSec }

  if (result === "range") {
    const lowest = Math.min(...last.sets.filter((s) => s.weightKg === w).map((s) => s.reps))
    return { weightKg: w, reps: Math.min(repMax, lowest + 1), sets, status: "hold", restSec }
  }

  if (stallCount(sessions, ex) >= STALL_LIMIT) {
    const reset = roundTo(w * RESET_FACTOR, inc)
    return { weightKg: reset < w ? reset : roundTo(w - inc, inc), reps: repMin, sets, status: "reset", restSec }
  }
  return { weightKg: w, reps: repMin, sets, status: "hold", restSec }
}
