import type { Rank } from "../db/types"
import { RANK_TITLES } from "../engine/constants"
import { assessRank } from "../engine/rank"
import { todayKey } from "../lib/date"
import { gatherRankEvidence } from "../repo/evidence"
import { hunterRepo } from "../repo/hunterRepo"
import { usePanelStore } from "../store/panelStore"

/**
 * Run the rank assessment, persist any promotion, and queue one panel per rank gained.
 * Safe to call on app open and after any completion.
 */
export async function runRankAssessment(): Promise<Rank[]> {
  const hunter = await hunterRepo.get()
  const evidence = await gatherRankEvidence(todayKey())
  const result = assessRank(hunter.rank, evidence)
  if (result.promotions.length === 0) return []
  await hunterRepo.save({ ...hunter, rank: result.rank, title: RANK_TITLES[result.rank] })
  usePanelStore.getState().pushMany(
    result.promotions.map((rank) => ({
      title: "RANK ASSESSMENT COMPLETE",
      lines: ["Conditions verified.", `Rank ${rank} granted.`, `Title acquired: ${RANK_TITLES[rank]}`],
      tone: "success",
      ping: true,
    })),
  )
  return result.promotions
}
