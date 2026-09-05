import { useState } from "react"
import type { TemplateExercise } from "../db/types"
import { describeSet } from "../lib/format"
import { useSessionStore } from "../store/sessionStore"
import { SetEditor } from "./SetEditor"

interface SessionPanelProps {
  recent: string[]
  onFinish: () => Promise<void>
}

/** The live session: sets logged so far, the editor, and finish/discard. */
export function SessionPanel({ recent, onFinish }: SessionPanelProps) {
  const { templateName, plan, sets, addSet, removeSet, clear } = useSessionStore()
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      await onFinish()
    } finally {
      setBusy(false)
    }
  }

  const remainingPlan: TemplateExercise[] = plan.filter((e) => {
    const done = sets.filter((s) => s.exerciseName === e.name).length
    return e.targetSets === undefined || done < e.targetSets
  })

  return (
    <section className="sys-panel p-4 flex flex-col gap-4" aria-labelledby="session-heading">
      <header className="flex justify-between items-baseline">
        <h1 id="session-heading" className="text-xl">
          {templateName ?? "Freestyle"}
        </h1>
        <span className="text-xs font-heading tracking-widest opacity-70">{sets.length} SETS</span>
      </header>

      {plan.length > 0 && (
        <p className="text-xs font-heading tracking-widest opacity-70">
          {remainingPlan.length === 0 ? "PLAN COMPLETE" : `TO DO: ${remainingPlan.map((e) => e.name).join(" · ")}`}
        </p>
      )}

      {sets.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Logged sets">
          {sets.map((s, i) => (
            <li key={s.key} className="flex items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-1">
              <span className="text-sm">
                <span className="opacity-60 font-heading mr-2">{i + 1}</span>
                {s.exerciseName} <span className="opacity-80">· {describeSet(s)}</span>
              </span>
              <button type="button" onClick={() => removeSet(s.key)} aria-label={`Remove set ${i + 1}`} className="text-[var(--danger)] font-heading">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <SetEditor plan={plan} recent={recent} onAdd={addSet} />

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={finish}
          disabled={busy || sets.length === 0}
          className="flex-1 font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30"
        >
          FINISH SESSION
        </button>
        <button type="button" onClick={clear} className="font-heading tracking-widest border border-[var(--danger)] text-[var(--danger)] px-4">
          DISCARD
        </button>
      </div>
    </section>
  )
}
