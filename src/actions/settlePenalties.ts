import { runPenalty, type PenaltyResult } from "../engine/penalty"
import { todayKey } from "../lib/date"
import { completionRepo } from "../repo/completionRepo"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { settingsRepo } from "../repo/settingsRepo"
import { runInTransaction } from "../repo/transaction"
import { usePanelStore } from "../store/panelStore"

/**
 * Settle every missed day since the hunter was last seen. Safe to call
 * repeatedly: once `lastSeenDate` is today it does nothing. Queues at most
 * one ⚠ SYSTEM PENALTY panel per call, never a barrage.
 */
export async function settlePenalties(): Promise<PenaltyResult | null> {
  const today = todayKey()

  const result = await runInTransaction(async () => {
    const hunter = await hunterRepo.get()
    if (hunter.lastSeenDate >= today) return null
    const [settings, quests, completions] = await Promise.all([
      settingsRepo.get(),
      questRepo.listAll(),
      completionRepo.listSince(hunter.lastSeenDate),
    ])
    const r = runPenalty({ hunter, quests, completions, today, penaltyEnabled: settings.penaltyEnabled })
    await hunterRepo.save(r.hunter)
    const changed = r.quests.filter((q, i) => q.streak !== quests[i].streak)
    if (changed.length) await questRepo.saveMany(changed)
    return r
  })

  if (result && result.lines.length > 0) {
    usePanelStore.getState().push({ title: "⚠ SYSTEM PENALTY", lines: result.lines, tone: "danger", ping: true })
  }
  return result
}
