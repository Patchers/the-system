/**
 * Plain record types for every table. No Dexie imports here so the engine
 * can consume these without touching the database layer.
 */

/** Sync seam carried by every record. Never hard-delete: flip `deleted`. */
export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
  deleted: 0 | 1
}

export type Rank = "E" | "D" | "C" | "B" | "A" | "S"
export type Difficulty = "E" | "D" | "C" | "B" | "A" | "S"
export type StatKey = "str" | "agi" | "vit" | "int" | "per"
export type QuestType = "daily" | "task" | "habit"
export type DungeonStatus = "active" | "cleared" | "failed"

export interface Hunter extends BaseRecord {
  level: number
  xp: number
  hp: number
  maxHp: number
  rank: Rank
  statPoints: number
  str: number
  agi: number
  vit: number
  int: number
  per: number
  /** Raw training units not yet converted to stat points. */
  statUnits: Record<StatKey, number>
  title: string
  recoveryMode: boolean
  /** Times the hunter has climbed out of recovery mode. */
  recoveries: number
  /** Last app-day key the hunter opened the app. Drives the penalty engine. */
  lastSeenDate: string
}

export interface Quest extends BaseRecord {
  title: string
  type: QuestType
  difficulty: Difficulty
  stat: StatKey
  dungeonId?: string
  dueAt?: string
  streak: number
  bestStreak: number
  lastCompletedOn: string | null
  active: boolean
}

export interface Completion extends BaseRecord {
  questId: string
  date: string
  xpAwarded: number
  statAwarded: number
}

export interface Dungeon extends BaseRecord {
  name: string
  description: string
  bossName: string
  deadline: string
  status: DungeonStatus
}

export interface Workout extends BaseRecord {
  templateId?: string
  date: string
  notes: string
}

export interface WorkoutSet extends BaseRecord {
  workoutId: string
  exerciseName: string
  reps?: number
  weightKg?: number
  distanceKm?: number
  durationMin?: number
}

export interface TemplateExercise {
  name: string
  targetSets?: number
  targetReps?: number
  targetDistanceKm?: number
  targetDurationMin?: number
  /**
   * Progression fields. A lift with both `repMin` and `repMax` is progressive:
   * the System sets each session's weight from its logged history.
   * Stored inside the template's `exercises` JSON, so no schema change is needed.
   */
  repMin?: number
  repMax?: number
  /** Weight added when every set hits `repMax`. */
  incrementKg?: number
  /** Used only until the first session of this exercise is logged. */
  startWeightKg?: number
  restSec?: number
  /** Swap options. Each name keeps its own progression history. */
  alternatives?: string[]
}

export interface Template extends BaseRecord {
  name: string
  exercises: TemplateExercise[]
}

export interface Nutrition extends BaseRecord {
  date: string
  calories: number
  goal: number
}

export interface Vitals extends BaseRecord {
  date: string
  weightKg?: number
  sleepHours?: number
  waterMl?: number
}

export interface Achievement extends BaseRecord {
  code: string
  unlockedAt: string
}

export interface Settings extends BaseRecord {
  id: "singleton"
  calorieGoal: number
  penaltyEnabled: boolean
  soundEnabled: boolean
  dayRolloverHour: number
}
