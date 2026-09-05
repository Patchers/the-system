/**
 * Achievement definitions and evaluation. Pure: the caller gathers the stats
 * and persists whatever comes back unlocked.
 */
import type { Rank } from "../db/types"

export interface AchievementStats {
  level: number
  rank: Rank
  completions: number
  longestStreak: number
  workouts: number
  dungeonsCleared: number
  /** Days on which at least one quest was completed. */
  activeDays: number
  recoveries: number
}

export interface AchievementDef {
  code: string
  name: string
  description: string
  /** Met when the stat reaches the threshold. */
  test: (s: AchievementStats) => boolean
}

const atLeast = (key: keyof AchievementStats, n: number) => (s: AchievementStats) => (s[key] as number) >= n

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { code: "first-blood", name: "First Blood", description: "Complete your first quest", test: atLeast("completions", 1) },
  { code: "ten-quests", name: "Getting Started", description: "Complete 10 quests", test: atLeast("completions", 10) },
  { code: "hundred-quests", name: "Relentless", description: "Complete 100 quests", test: atLeast("completions", 100) },
  { code: "level-5", name: "Awakening", description: "Reach level 5", test: atLeast("level", 5) },
  { code: "level-10", name: "Ascendant", description: "Reach level 10", test: atLeast("level", 10) },
  { code: "level-25", name: "Veteran", description: "Reach level 25", test: atLeast("level", 25) },
  { code: "streak-7", name: "Seven Days", description: "Hold a 7-day streak", test: atLeast("longestStreak", 7) },
  { code: "streak-30", name: "Unbroken", description: "Hold a 30-day streak", test: atLeast("longestStreak", 30) },
  { code: "streak-100", name: "Iron Will", description: "Hold a 100-day streak", test: atLeast("longestStreak", 100) },
  { code: "first-workout", name: "Iron Touched", description: "Log your first session", test: atLeast("workouts", 1) },
  { code: "workouts-25", name: "Trained", description: "Log 25 sessions", test: atLeast("workouts", 25) },
  { code: "first-dungeon", name: "Gate Closed", description: "Clear your first dungeon", test: atLeast("dungeonsCleared", 1) },
  { code: "dungeons-5", name: "Raid Leader", description: "Clear 5 dungeons", test: atLeast("dungeonsCleared", 5) },
  { code: "active-30", name: "Consistent", description: "Be active on 30 separate days", test: atLeast("activeDays", 30) },
  { code: "comeback", name: "Comeback", description: "Return from recovery mode", test: atLeast("recoveries", 1) },
  { code: "rank-d", name: "Ranked", description: "Reach rank D", test: (s) => s.rank !== "E" },
  { code: "rank-b", name: "Elite", description: "Reach rank B", test: (s) => ["B", "A", "S"].includes(s.rank) },
  { code: "rank-s", name: "Monarch", description: "Reach rank S", test: (s) => s.rank === "S" },
] as const

/** Codes newly met, given what is already unlocked. */
export function newlyUnlocked(stats: AchievementStats, unlocked: readonly string[]): AchievementDef[] {
  const have = new Set(unlocked)
  return ACHIEVEMENTS.filter((a) => !have.has(a.code) && a.test(stats))
}
