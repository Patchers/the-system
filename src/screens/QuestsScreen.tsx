import { useCallback, useState } from "react"
import { completeQuest } from "../actions/completeQuest"
import { Countdown } from "../components/Countdown"
import { QuestRow } from "../components/QuestRow"
import { QuestSheet } from "../components/QuestSheet"
import type { Quest, QuestType } from "../db/types"
import { MAX_ACTIVE_DAILY, MAX_ACTIVE_TASK } from "../engine/constants"
import { isDoneToday } from "../engine/streak"
import { todayKey } from "../lib/date"
import { completionRepo } from "../repo/completionRepo"
import { isRepoError } from "../repo/errors"
import { questRepo } from "../repo/questRepo"
import { useLive } from "../repo/useLive"
import { useToastStore } from "../store/toastStore"

type SheetState = { open: false } | { open: true; quest: Quest | null }

export function QuestsScreen() {
  const [day, setDay] = useState(0)
  const today = todayKey()
  const data = useLive(async () => {
    const [quests, completions] = await Promise.all([questRepo.listActive(), completionRepo.listForDate(today)])
    return { quests, completions }
  }, [today, day])
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const showToast = useToastStore((s) => s.show)
  const onRollover = useCallback(() => setDay((d) => d + 1), [])

  const complete = async (quest: Quest) => {
    try {
      const r = await completeQuest(quest.id)
      const parts = [`+${r.xp} XP`]
      if (r.statPoints > 0) parts.push(`${r.stat.toUpperCase()} +${r.statPoints}`)
      if (quest.type === "daily" && r.streak > 1) parts.push(`STREAK ${r.streak}`)
      showToast(parts.join(" · "))
    } catch (e) {
      showToast(isRepoError(e) ? e.message : "Could not complete the quest.")
    }
  }

  if (!data) return null

  const countsToday = new Map<string, number>()
  for (const c of data.completions) countsToday.set(c.questId, (countsToday.get(c.questId) ?? 0) + 1)
  const byType = (type: QuestType) => data.quests.filter((q) => q.type === type)
  const dailies = byType("daily")
  const tasks = byType("task")
  const habits = byType("habit")
  const dailiesDone = dailies.filter((q) => isDoneToday(q, today)).length

  const rows = (list: Quest[]) =>
    list.map((q) => (
      <QuestRow
        key={q.id}
        quest={q}
        done={isDoneToday(q, today)}
        countToday={countsToday.get(q.id) ?? 0}
        onComplete={complete}
        onEdit={(quest) => setSheet({ open: true, quest })}
      />
    ))

  return (
    <div className="flex flex-col gap-5">
      <section className="sys-panel p-4 flex flex-col gap-4" aria-labelledby="daily-heading">
        <header className="flex justify-between items-baseline gap-2">
          <h1 id="daily-heading" className="text-xl">
            Daily Quest
          </h1>
          <span className="text-sm whitespace-nowrap">
            <span className="opacity-60 font-heading tracking-widest text-xs">RESET </span>
            <span className="font-display font-bold text-[var(--xp)] tabular-nums">
              <Countdown onRollover={onRollover} />
            </span>
          </span>
        </header>
        <div className="flex flex-col gap-2">
          <div
            className="seg"
            role="progressbar"
            aria-label="Daily quests complete"
            aria-valuenow={dailiesDone}
            aria-valuemin={0}
            aria-valuemax={dailies.length}
          >
            {Array.from({ length: Math.max(dailies.length, 1) }, (_, i) => (
              <i key={i} className={i < dailiesDone ? "on" : ""} />
            ))}
          </div>
          <p className="flex items-center justify-between eyebrow">
            <span>
              {dailiesDone} / {dailies.length} complete
            </span>
            <span>
              {dailies.length} / {MAX_ACTIVE_DAILY} slots
            </span>
          </p>
        </div>
        {dailies.length === 0 && <p className="sys-empty">No daily quests. Add up to {MAX_ACTIVE_DAILY}.</p>}
        {rows(dailies)}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="tasks-heading">
        <header className="flex justify-between items-baseline px-1">
          <h2 id="tasks-heading" className="text-lg">
            Tasks
          </h2>
          <span className="chip">
            {tasks.length} / {MAX_ACTIVE_TASK}
          </span>
        </header>
        {tasks.length === 0 && <p className="sys-empty">No open tasks</p>}
        {rows(tasks)}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="habits-heading">
        <h2 id="habits-heading" className="text-lg px-1">
          Habits
        </h2>
        {habits.length === 0 && <p className="sys-empty">No habits yet</p>}
        {rows(habits)}
      </section>

      <button
        type="button"
        onClick={() => setSheet({ open: true, quest: null })}
        className="sys-panel font-heading tracking-widest text-lg text-[var(--xp)] flex items-center justify-center gap-2"
      >
        + NEW QUEST
      </button>
      <p className="text-xs opacity-50 text-center">Swipe right to complete · hold to edit</p>

      {sheet.open && <QuestSheet quest={sheet.quest} onClose={() => setSheet({ open: false })} />}
    </div>
  )
}
