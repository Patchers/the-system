/**
 * First-run seed. The only place placeholder data is allowed.
 * Idempotent: does nothing if a hunter already exists.
 */
import type { SystemDB } from "./schema"
import { stamp } from "./record"
import type { Hunter, Quest, Settings, TemplateExercise } from "./types"
import {
  DAY_ROLLOVER_HOUR,
  DEFAULT_CALORIE_GOAL,
  DEFAULT_PENALTY_ENABLED,
  DEFAULT_SOUND_ENABLED,
  STARTING_LEVEL,
  STARTING_MAX_HP,
  STARTING_RANK,
  STARTING_TITLE,
} from "../engine/constants"

export function makeHunter(today: string, now: string): Hunter {
  return {
    ...stamp(now),
    level: STARTING_LEVEL,
    xp: 0,
    hp: STARTING_MAX_HP,
    maxHp: STARTING_MAX_HP,
    rank: STARTING_RANK,
    statPoints: 0,
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    per: 0,
    statUnits: { str: 0, agi: 0, vit: 0, int: 0, per: 0 },
    title: STARTING_TITLE,
    recoveryMode: false,
    recoveries: 0,
    lastSeenDate: today,
  }
}

export function makeSettings(now: string): Settings {
  return {
    ...stamp(now, "singleton"),
    id: "singleton",
    calorieGoal: DEFAULT_CALORIE_GOAL,
    penaltyEnabled: DEFAULT_PENALTY_ENABLED,
    soundEnabled: DEFAULT_SOUND_ENABLED,
    dayRolloverHour: DAY_ROLLOVER_HOUR,
  }
}

/** The three starter dailies. Fills the daily cap so the hunter edits, not adds. */
export function makeStarterQuests(now: string): Quest[] {
  const base = {
    type: "daily" as const,
    streak: 0,
    bestStreak: 0,
    lastCompletedOn: null,
    active: true,
  }
  return [
    { ...stamp(now), ...base, title: "100 push-ups", difficulty: "C", stat: "str" },
    { ...stamp(now), ...base, title: "5 km run", difficulty: "B", stat: "agi" },
    { ...stamp(now), ...base, title: "Read 30 minutes", difficulty: "D", stat: "int" },
  ]
}

export async function seedIfEmpty(db: SystemDB, today: string, now: string): Promise<boolean> {
  // Count inside the transaction so two concurrent callers (React StrictMode
  // runs effects twice in dev) cannot both see an empty store.
  return db.transaction("rw", [db.hunter, db.settings, db.quests], async () => {
    if ((await db.hunter.count()) > 0) return false
    await db.hunter.add(makeHunter(today, now))
    await db.settings.put(makeSettings(now))
    await db.quests.bulkAdd(makeStarterQuests(now))
    return true
  })
}

type ProgrammeDay = { name: string; exercises: TemplateExercise[] }

const lift = (name: string, sets: number, repMin: number, repMax: number, incrementKg: number, alternatives: string[]): TemplateExercise => ({
  name,
  targetSets: sets,
  targetReps: repMin,
  repMin,
  repMax,
  incrementKg,
  alternatives,
})

/**
 * The three-day upper / legs / upper programme. Loaded on request from the
 * Training tab, not on first run. Start weights are left open: the first
 * session's logged weights become the baseline. Dumbbell weights are per hand.
 */
export const STARTER_PROGRAMME: ProgrammeDay[] = [
  {
    name: "Upper Heavy",
    exercises: [
      lift("Bench press", 4, 6, 8, 2.5, ["Dumbbell bench press", "Machine chest press"]),
      lift("Weighted pull-up", 4, 6, 8, 2.5, ["Lat pulldown", "Chin-up"]),
      lift("Overhead press", 3, 6, 8, 2.5, ["Seated dumbbell press"]),
      lift("EZ-bar curl", 3, 8, 10, 2.5, ["Barbell curl", "Cable curl"]),
      lift("Skull crusher", 3, 8, 10, 2.5, ["Close-grip bench press", "Cable pushdown"]),
    ],
  },
  {
    name: "Legs",
    exercises: [
      lift("Back squat", 4, 6, 8, 5, ["Front squat", "Hack squat", "Leg press"]),
      lift("Romanian deadlift", 3, 8, 10, 5, ["Hip thrust", "Lying leg curl"]),
      lift("Bulgarian split squat", 3, 8, 12, 2, ["Walking lunge", "Leg press"]),
      lift("Standing calf raise", 3, 12, 15, 2.5, ["Seated calf raise"]),
    ],
  },
  {
    name: "Upper Volume",
    exercises: [
      lift("Incline dumbbell press", 3, 10, 12, 2, ["Incline bench press", "Machine chest press"]),
      lift("Barbell row", 3, 10, 12, 2.5, ["Chest-supported row", "Cable row"]),
      lift("Dips", 3, 10, 12, 2.5, ["Close-grip bench press", "Machine dip"]),
      lift("Hammer curl", 3, 10, 12, 1, ["Incline dumbbell curl"]),
      lift("Overhead triceps extension", 3, 10, 12, 2, ["Cable pushdown"]),
    ],
  },
]
