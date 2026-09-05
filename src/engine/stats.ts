/**
 * Stat accrual and allocation. Training produces raw units per stat; every
 * STAT_UNITS_PER_POINT units becomes one stat point. Leftover units are kept
 * on the hunter so no fraction of a workout is ever lost.
 */
import type { Hunter, StatKey, WorkoutSet } from "../db/types"
import {
  AGI_UNIT_MULTIPLIER,
  STAT_KEYS,
  STAT_UNITS_PER_POINT,
  STR_UNIT_DIVISOR,
  VIT_UNIT_DIVISOR,
} from "./constants"

export type StatUnits = Record<StatKey, number>

export const emptyUnits = (): StatUnits => ({ str: 0, agi: 0, vit: 0, int: 0, per: 0 })

/** Guard against binary float drift when summing fractional units. */
const tidy = (n: number) => Math.round(n * 1e6) / 1e6

const liveSets = (sets: readonly WorkoutSet[]) => sets.filter((s) => !s.deleted)

/** STR ← weightKg × reps / STR_UNIT_DIVISOR, summed over sets with both. */
export function strUnits(sets: readonly WorkoutSet[]): number {
  return tidy(
    liveSets(sets).reduce(
      (sum, s) => (s.weightKg && s.reps ? sum + (s.weightKg * s.reps) / STR_UNIT_DIVISOR : sum),
      0,
    ),
  )
}

/** VIT ← durationMin / VIT_UNIT_DIVISOR. */
export function vitUnits(sets: readonly WorkoutSet[]): number {
  return tidy(liveSets(sets).reduce((sum, s) => sum + (s.durationMin ?? 0) / VIT_UNIT_DIVISOR, 0))
}

/** AGI ← distanceKm × AGI_UNIT_MULTIPLIER. */
export function agiUnits(sets: readonly WorkoutSet[]): number {
  return tidy(liveSets(sets).reduce((sum, s) => sum + (s.distanceKm ?? 0) * AGI_UNIT_MULTIPLIER, 0))
}

/** All raw units produced by a set of workout sets. INT and PER come from quests only. */
export function workoutUnits(sets: readonly WorkoutSet[]): StatUnits {
  return { ...emptyUnits(), str: strUnits(sets), vit: vitUnits(sets), agi: agiUnits(sets) }
}

export interface AccrueResult {
  hunter: Hunter
  /** Whole stat points converted in this call, per stat. */
  pointsGained: StatUnits
}

/** Add raw units to the hunter and convert whole points. Never mutates. */
export function accrueStatUnits(hunter: Hunter, units: Partial<StatUnits>): AccrueResult {
  const statUnits = { ...hunter.statUnits }
  const next: Hunter = { ...hunter, statUnits }
  const pointsGained = emptyUnits()
  for (const key of STAT_KEYS) {
    const add = units[key] ?? 0
    if (add <= 0) continue
    statUnits[key] = tidy(statUnits[key] + add)
    const points = Math.floor(statUnits[key] / STAT_UNITS_PER_POINT)
    if (points > 0) {
      statUnits[key] = tidy(statUnits[key] - points * STAT_UNITS_PER_POINT)
      next[key] += points
      pointsGained[key] = points
    }
  }
  return { hunter: next, pointsGained }
}

/** Convenience: accrue everything a workout's sets produce. */
export function applyWorkout(hunter: Hunter, sets: readonly WorkoutSet[]): AccrueResult {
  return accrueStatUnits(hunter, workoutUnits(sets))
}

export type AllocateResult =
  | { ok: true; hunter: Hunter }
  | { ok: false; reason: "recovery" | "no-points" }

/** Spend free stat points on a stat. Locked in recovery mode. */
export function allocateStatPoints(hunter: Hunter, stat: StatKey, amount = 1): AllocateResult {
  if (hunter.recoveryMode) return { ok: false, reason: "recovery" }
  if (amount < 1 || hunter.statPoints < amount) return { ok: false, reason: "no-points" }
  return {
    ok: true,
    hunter: { ...hunter, statPoints: hunter.statPoints - amount, [stat]: hunter[stat] + amount },
  }
}
