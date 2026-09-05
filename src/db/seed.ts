/**
 * First-run seed. The only place placeholder data is allowed.
 * Idempotent: does nothing if a hunter already exists.
 */
import type { SystemDB } from "./schema"
import { stamp } from "./record"
import type { Hunter, Quest, Settings } from "./types"
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
