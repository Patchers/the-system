/**
 * XP, level-up and completion rewards. Pure functions over plain objects.
 * No Date, no Dexie, no React. The repo layer stamps `updatedAt`.
 */
import type { Difficulty, Hunter, StatKey } from "../db/types"
import {
  BASE_XP,
  HABIT_DECAY,
  LEVEL_UP_MAX_HP,
  LEVEL_UP_STAT_POINTS,
  LEVEL_XP_BONUS,
  STAT_POINTS_BY_DIFFICULTY,
  STREAK_BONUS_PER_DAY,
  STREAK_CAP,
  XP_CURVE_BASE,
  XP_CURVE_EXPONENT,
} from "./constants"

/** XP required to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(XP_CURVE_BASE * level ** XP_CURVE_EXPONENT)
}

/** 1.0 at streak 0, +2% per day, capped at STREAK_CAP days (1.6x). */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(streak, 0), STREAK_CAP) * STREAK_BONUS_PER_DAY
}

/**
 * Habit XP decay within a day. `index` is zero-based: the first completion
 * today is index 0 (100%), second is 50%, third 25%, fourth onward 0.
 */
export function habitDecay(index: number): number {
  return HABIT_DECAY[index] ?? 0
}

export function statPointsFor(difficulty: Difficulty): number {
  return STAT_POINTS_BY_DIFFICULTY[difficulty]
}

export interface CompletionInput {
  difficulty: Difficulty
  level: number
  streak: number
  /** Zero-based count of prior habit completions today. Omit for non-habits. */
  habitIndex?: number
}

/** XP for one completion before recovery-mode gating. */
export function completionXp(input: CompletionInput): number {
  const decay = input.habitIndex === undefined ? 1 : habitDecay(input.habitIndex)
  return Math.round(
    BASE_XP[input.difficulty] *
      (1 + input.level * LEVEL_XP_BONUS) *
      streakMultiplier(input.streak) *
      decay,
  )
}

export interface XpResult {
  hunter: Hunter
  /** Each level reached, in order. One SystemPanel per entry. */
  levelsGained: number[]
  xpApplied: number
}

/**
 * Add XP and resolve level-ups. Returns a new hunter; never mutates.
 * Recovery mode blocks all XP gain.
 */
export function applyXp(hunter: Hunter, amount: number): XpResult {
  if (hunter.recoveryMode || amount <= 0) {
    return { hunter, levelsGained: [], xpApplied: 0 }
  }
  let { level, xp, statPoints, maxHp, hp } = hunter
  xp += amount
  const levelsGained: number[] = []
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level)
    level += 1
    statPoints += LEVEL_UP_STAT_POINTS
    maxHp += LEVEL_UP_MAX_HP
    hp = maxHp
    levelsGained.push(level)
  }
  return {
    hunter: { ...hunter, level, xp, statPoints, maxHp, hp },
    levelsGained,
    xpApplied: amount,
  }
}

export interface AwardResult extends XpResult {
  /** Points added directly to the quest's tagged stat. */
  statPointsAwarded: number
}

export interface AwardInput extends Omit<CompletionInput, "level"> {
  /** The stat tagged on the quest; difficulty points land here. */
  stat: StatKey
}

/**
 * Full reward for one completion: XP (with level-ups) plus difficulty stat
 * points applied straight to the quest's tagged stat. In recovery mode both
 * are blocked. The caller decides whether to clear recovery mode first.
 */
export function awardCompletion(hunter: Hunter, input: AwardInput): AwardResult {
  if (hunter.recoveryMode) {
    return { hunter, levelsGained: [], xpApplied: 0, statPointsAwarded: 0 }
  }
  const xp = completionXp({ ...input, level: hunter.level })
  const result = applyXp(hunter, xp)
  const decayed = input.habitIndex !== undefined && habitDecay(input.habitIndex) === 0
  const statPointsAwarded = decayed ? 0 : statPointsFor(input.difficulty)
  return {
    ...result,
    hunter: { ...result.hunter, [input.stat]: result.hunter[input.stat] + statPointsAwarded },
    statPointsAwarded,
  }
}

/** Exit recovery mode. Called on the next completion of any kind. */
export function clearRecovery(hunter: Hunter): Hunter {
  return hunter.recoveryMode ? { ...hunter, recoveryMode: false } : hunter
}
