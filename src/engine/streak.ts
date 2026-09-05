/**
 * Streak bookkeeping for quest completions. Pure.
 */
import type { Quest } from "../db/types"
import { addDays } from "../lib/date"

export type StreakFields = Pick<Quest, "streak" | "bestStreak" | "lastCompletedOn">

/**
 * Streak after completing `quest` on `today`.
 * Consecutive days extend it, a gap restarts at 1, a repeat on the same day changes nothing.
 */
export function advanceStreak(quest: StreakFields, today: string): StreakFields {
  if (quest.lastCompletedOn === today) return { ...quest }
  const streak = quest.lastCompletedOn === addDays(today, -1) ? quest.streak + 1 : 1
  return { streak, bestStreak: Math.max(quest.bestStreak, streak), lastCompletedOn: today }
}

export type CompletionBlock = "already-done" | "inactive" | null

/** Why a completion is not allowed right now, or null if it is. Habits may repeat within a day. */
export function completionBlock(quest: Pick<Quest, "type" | "active" | "deleted">, completionsToday: number): CompletionBlock {
  if (!quest.active || quest.deleted) return "inactive"
  if (quest.type !== "habit" && completionsToday > 0) return "already-done"
  return null
}

/** Dailies and tasks are "done" once per day; habits never show as done. */
export function isDoneToday(quest: Pick<Quest, "type" | "lastCompletedOn">, today: string): boolean {
  return quest.type !== "habit" && quest.lastCompletedOn === today
}
