import type { StatKey } from "../db/types"
import { LEVEL_UP_MAX_HP, LEVEL_UP_STAT_POINTS } from "../engine/constants"
import { advanceStreak, completionBlock } from "../engine/streak"
import { awardCompletion, clearRecovery } from "../engine/xp"
import { todayKey } from "../lib/date"
import { completionRepo } from "../repo/completionRepo"
import { RepoError } from "../repo/errors"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { runInTransaction } from "../repo/transaction"
import { usePanelStore, type PanelInput } from "../store/panelStore"
import { runRankAssessment } from "./promote"

export interface CompleteResult {
  xp: number
  statPoints: number
  stat: StatKey
  streak: number
  levelsGained: number[]
  /** The hunter was in recovery mode and this completion cleared it. */
  recovered: boolean
}

const BLOCK_MESSAGES = {
  "already-done": "Already completed today.",
  inactive: "This quest is no longer active.",
} as const

/**
 * Complete a quest for today: record it, advance the streak, award XP and
 * stat points, clear recovery mode, then queue level-up and rank panels.
 */
export async function completeQuest(questId: string): Promise<CompleteResult> {
  const today = todayKey()

  const result = await runInTransaction(async () => {
    const [quest, before, count] = await Promise.all([
      questRepo.get(questId),
      hunterRepo.get(),
      completionRepo.countForQuestOn(questId, today),
    ])
    const block = completionBlock(quest, count)
    if (block) throw new RepoError(block, BLOCK_MESSAGES[block])

    const streak = advanceStreak(quest, today)
    const recovered = before.recoveryMode
    const award = awardCompletion(clearRecovery(before), {
      difficulty: quest.difficulty,
      streak: streak.streak,
      stat: quest.stat,
      habitIndex: quest.type === "habit" ? count : undefined,
    })

    await completionRepo.add({ questId, date: today, xpAwarded: award.xpApplied, statAwarded: award.statPointsAwarded })
    await questRepo.update(questId, { ...streak, active: quest.type === "task" ? false : quest.active })
    await hunterRepo.save(award.hunter)

    return {
      xp: award.xpApplied,
      statPoints: award.statPointsAwarded,
      stat: quest.stat,
      streak: streak.streak,
      levelsGained: award.levelsGained,
      recovered,
    }
  })

  const panels: PanelInput[] = []
  if (result.recovered) {
    panels.push({ title: "RECOVERY COMPLETE", lines: ["Vital signs restored.", "XP gain re-enabled."], tone: "success" })
  }
  for (const level of result.levelsGained) {
    panels.push({
      title: "LEVEL UP",
      lines: [`You have reached level ${level}.`, `+${LEVEL_UP_STAT_POINTS} stat points.`, `Max HP +${LEVEL_UP_MAX_HP}. HP fully restored.`],
      tone: "success",
      ping: true,
    })
  }
  if (panels.length) usePanelStore.getState().pushMany(panels)
  await runRankAssessment()
  return result
}
