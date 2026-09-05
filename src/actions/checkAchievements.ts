import { newlyUnlocked, type AchievementStats } from "../engine/achievements"
import { activeDays } from "../engine/charts"
import { longestCurrentStreak } from "../engine/rank"
import { achievementRepo } from "../repo/achievementRepo"
import { completionRepo } from "../repo/completionRepo"
import { dungeonRepo } from "../repo/dungeonRepo"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { workoutRepo } from "../repo/workoutRepo"
import { usePanelStore } from "../store/panelStore"

/** Gather the numbers the achievement tests need. */
export async function gatherAchievementStats(): Promise<AchievementStats> {
  const [hunter, quests, completions, workouts, dungeonsCleared] = await Promise.all([
    hunterRepo.get(),
    questRepo.listAll(),
    completionRepo.listSince("0000-01-01"),
    workoutRepo.count(),
    dungeonRepo.countCleared(),
  ])
  return {
    level: hunter.level,
    rank: hunter.rank,
    completions: completions.length,
    longestStreak: Math.max(longestCurrentStreak(quests), ...quests.map((q) => q.bestStreak), 0),
    workouts,
    dungeonsCleared,
    activeDays: activeDays(completions),
    recoveries: hunter.recoveries,
  }
}

/** Unlock any newly earned achievements and queue one panel each. */
export async function checkAchievements(): Promise<string[]> {
  const [stats, existing] = await Promise.all([gatherAchievementStats(), achievementRepo.list()])
  const earned = newlyUnlocked(stats, existing.map((a) => a.code))
  if (earned.length === 0) return []
  const unlocked: string[] = []
  for (const a of earned) {
    if (await achievementRepo.unlock(a.code)) unlocked.push(a.code)
  }
  usePanelStore.getState().pushMany(
    earned
      .filter((a) => unlocked.includes(a.code))
      .map((a) => ({ title: "ACHIEVEMENT UNLOCKED", lines: [a.name, a.description], tone: "success" as const, ping: true })),
  )
  return unlocked
}
