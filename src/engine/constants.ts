/**
 * Every tunable in THE SYSTEM lives here. No magic numbers elsewhere.
 */
import type { Difficulty, Rank, StatKey } from "../db/types"

/* ---------- Day ---------- */
export const DAY_ROLLOVER_HOUR = 4

/* ---------- XP curve ---------- */
export const XP_CURVE_BASE = 100
export const XP_CURVE_EXPONENT = 1.5
/** Per-level multiplier on completion XP: (1 + level * LEVEL_XP_BONUS) */
export const LEVEL_XP_BONUS = 0.1
/** Streak multiplier: 1 + min(streak, STREAK_CAP) * STREAK_BONUS_PER_DAY (caps at 1.6x) */
export const STREAK_BONUS_PER_DAY = 0.02
export const STREAK_CAP = 30

export const BASE_XP: Record<Difficulty, number> = {
  E: 10,
  D: 25,
  C: 50,
  B: 100,
  A: 200,
  S: 400,
}

export const STAT_POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  E: 0,
  D: 1,
  C: 1,
  B: 2,
  A: 3,
  S: 5,
}

/* ---------- Level up ---------- */
export const LEVEL_UP_STAT_POINTS = 3
export const LEVEL_UP_MAX_HP = 10

/* ---------- Hunter defaults ---------- */
export const STARTING_LEVEL = 1
export const STARTING_MAX_HP = 100
export const STARTING_RANK: Rank = "E"
export const STARTING_TITLE = "Unranked" // = RANK_TITLES.E
export const STAT_KEYS: readonly StatKey[] = ["str", "agi", "vit", "int", "per"] as const

/* ---------- Anti-farm ---------- */
export const MAX_ACTIVE_DAILY = 3
export const MAX_ACTIVE_TASK = 8
/** Habit XP by completion index within a day; beyond the last entry = 0. */
export const HABIT_DECAY: readonly number[] = [1, 0.5, 0.25]

/* ---------- Penalty ---------- */
/** Fraction of xpToNext(level) lost per missed daily quest per day. */
export const PENALTY_XP_FRACTION = 0.1
export const PENALTY_HP = 20
/** HP regained for any day with at least one completion. */
export const RECOVERY_HP_PER_ACTIVE_DAY = 10

/* ---------- Ranks ---------- */
export const RANK_ORDER: readonly Rank[] = ["E", "D", "C", "B", "A", "S"] as const

export interface RankRequirement {
  level: number
  streakDays: number
  workouts: number
  dungeonsCleared: number
  /** Days (within CALORIE_WINDOW_DAYS) the calorie goal must be met. */
  calorieDaysMet: number
}

export const CALORIE_WINDOW_DAYS = 90

export const RANK_REQUIREMENTS: Record<Rank, RankRequirement> = {
  E: { level: 1, streakDays: 0, workouts: 0, dungeonsCleared: 0, calorieDaysMet: 0 },
  D: { level: 10, streakDays: 14, workouts: 0, dungeonsCleared: 0, calorieDaysMet: 0 },
  C: { level: 20, streakDays: 30, workouts: 20, dungeonsCleared: 0, calorieDaysMet: 0 },
  B: { level: 35, streakDays: 60, workouts: 0, dungeonsCleared: 1, calorieDaysMet: 0 },
  A: { level: 50, streakDays: 90, workouts: 0, dungeonsCleared: 3, calorieDaysMet: 60 },
  S: { level: 75, streakDays: 180, workouts: 0, dungeonsCleared: 10, calorieDaysMet: 0 },
}

/* ---------- Stats ---------- */
/** Raw units needed per stat point. */
export const STAT_UNITS_PER_POINT = 10
/** STR units = weightKg * reps / STR_UNIT_DIVISOR */
export const STR_UNIT_DIVISOR = 100
/** VIT units = durationMin / VIT_UNIT_DIVISOR */
export const VIT_UNIT_DIVISOR = 10
/** AGI units = distanceKm * AGI_UNIT_MULTIPLIER */
export const AGI_UNIT_MULTIPLIER = 1

/* ---------- Training progression ---------- */
/** Default load jump when every set hits the top of the rep range. */
export const DEFAULT_INCREMENT_KG = 2.5
/** Sessions in a row that miss the bottom of the rep range before a reset. */
export const STALL_LIMIT = 2
/** A reset drops the working weight to this fraction, then builds back up. */
export const RESET_FACTOR = 0.9
/** Rep ranges topping out at or below this count as heavy work for rest timing. */
export const HEAVY_REP_MAX = 8
export const REST_HEAVY_SEC = 150
export const REST_LIGHT_SEC = 90
/** Epley estimated one-rep max: w * (1 + reps / E1RM_DIVISOR). */
export const E1RM_DIVISOR = 30
/** Sets above this rep count are ignored for e1RM (the formula overestimates). */
export const E1RM_MAX_REPS = 12

/* ---------- Settings defaults ---------- */
export const DEFAULT_CALORIE_GOAL = 2200
export const DEFAULT_PENALTY_ENABLED = true
export const DEFAULT_SOUND_ENABLED = true

/* ---------- Nutrition ---------- */
/** "under": goal met when logged calories are > 0 and <= goal. "over": met when >= goal. */
export const CALORIE_GOAL_MODE: "under" | "over" = "under"

/* ---------- Titles ---------- */
export const RANK_TITLES: Record<Rank, string> = {
  E: "Unranked",
  D: "Awakened",
  C: "Hunter",
  B: "Elite Hunter",
  A: "National-Level Hunter",
  S: "Monarch",
}

/* ---------- Vitals display ---------- */
/** Daily water target the water bar fills toward. Display only: nothing is penalised. */
export const WATER_TARGET_ML = 2500
