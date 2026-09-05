import { CALORIE_WINDOW_DAYS } from "../engine/constants"
import { calorieDaysMet } from "../engine/nutrition"
import { longestCurrentStreak, type RankEvidence } from "../engine/rank"
import { addDays } from "../lib/date"
import { dungeonRepo } from "./dungeonRepo"
import { hunterRepo } from "./hunterRepo"
import { nutritionRepo } from "./nutritionRepo"
import { questRepo } from "./questRepo"
import { workoutRepo } from "./workoutRepo"

/** Everything the rank assessment needs, gathered from the stores. */
export async function gatherRankEvidence(today: string): Promise<RankEvidence> {
  const [hunter, quests, workouts, dungeonsCleared, nutrition] = await Promise.all([
    hunterRepo.get(),
    questRepo.listActive(),
    workoutRepo.count(),
    dungeonRepo.countCleared(),
    nutritionRepo.listBetween(addDays(today, -(CALORIE_WINDOW_DAYS - 1)), today),
  ])
  return {
    level: hunter.level,
    streakDays: longestCurrentStreak(quests),
    workouts,
    dungeonsCleared,
    calorieDaysMet: calorieDaysMet(nutrition),
  }
}
