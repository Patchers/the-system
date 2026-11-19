/**
 * Estimated one-rep max, personal records and per-lift trend. Pure.
 */
import { E1RM_DIVISOR, E1RM_MAX_REPS } from "./constants"
import type { ExerciseSession } from "./progression"

export interface SetLike {
  exerciseName: string
  reps?: number
  weightKg?: number
}

export interface LiftRecord {
  exerciseName: string
  e1rm: number
  previous: number
}

export interface E1rmPoint {
  date: string
  e1rm: number
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Epley. 0 for bodyweight-only sets or rep counts too high to estimate from. */
export function e1rm(weightKg: number | undefined, reps: number | undefined): number {
  if (!weightKg || !reps || reps < 1 || reps > E1RM_MAX_REPS) return 0
  if (reps === 1) return weightKg
  return round1(weightKg * (1 + reps / E1RM_DIVISOR))
}

/** Best e1RM per exercise name across the given sets. */
export function bestByExercise(sets: readonly SetLike[]): Map<string, number> {
  const best = new Map<string, number>()
  for (const s of sets) {
    const v = e1rm(s.weightKg, s.reps)
    if (v > (best.get(s.exerciseName) ?? 0)) best.set(s.exerciseName, v)
  }
  return best
}

/**
 * Lifts in this session that beat their previous best. A lift's first-ever
 * session sets a baseline and is not a record.
 */
export function findRecords(previousBest: ReadonlyMap<string, number>, sessionSets: readonly SetLike[]): LiftRecord[] {
  const out: LiftRecord[] = []
  for (const [exerciseName, value] of bestByExercise(sessionSets)) {
    const previous = previousBest.get(exerciseName) ?? 0
    if (previous > 0 && value > previous) out.push({ exerciseName, e1rm: value, previous })
  }
  return out
}

/** Best e1RM per session, oldest first, skipping sessions with nothing to estimate. */
export function e1rmSeries(history: readonly ExerciseSession[]): E1rmPoint[] {
  return history
    .map((s) => ({ date: s.date, e1rm: s.sets.reduce((m, x) => Math.max(m, e1rm(x.weightKg, x.reps)), 0) }))
    .filter((p) => p.e1rm > 0)
}
