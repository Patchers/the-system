/**
 * Calorie goal assessment. Pure.
 */
import type { Nutrition } from "../db/types"
import { CALORIE_GOAL_MODE } from "./constants"

/** Whether a day's entry counts as "goal met" under CALORIE_GOAL_MODE. Unlogged days never count. */
export function calorieGoalMet(entry: Pick<Nutrition, "calories" | "goal">): boolean {
  if (entry.calories <= 0 || entry.goal <= 0) return false
  return CALORIE_GOAL_MODE === "under" ? entry.calories <= entry.goal : entry.calories >= entry.goal
}

/** Count of entries meeting the goal. Caller supplies the window. */
export function calorieDaysMet(entries: readonly Pick<Nutrition, "calories" | "goal" | "deleted">[]): number {
  return entries.filter((e) => !e.deleted && calorieGoalMet(e)).length
}
