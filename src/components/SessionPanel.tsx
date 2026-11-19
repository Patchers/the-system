import { useState } from "react"
import { restFor } from "../engine/progression"
import { describeSet, STATUS_LABEL } from "../lib/format"
import { useSessionStore, type DraftSet } from "../store/sessionStore"
import { RestTimer } from "./RestTimer"
import { SetEditor } from "./SetEditor"

interface SessionPanelProps {
  recent: string[]
  onFinish: () => Promise<void>
}

const kg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** The live session: the plan with today's targets, the set editor, the rest timer, finish/discard. */
export function SessionPanel({ recent, onFinish }: SessionPanelProps) {
  const { templateName, plan, targets, current, sets, select, swap, addSet, removeSet, startRest, clear } = useSessionStore()
  const [busy, setBusy] = useState(false)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      await onFinish()
    } finally {
      setBusy(false)
    }
  }

  const log = (set: Omit<DraftSet, "key">) => {
    addSet(set)
    if (set.kind === "lift") startRest(restFor(plan.find((p) => p.name === set.exerciseName) ?? { name: set.exerciseName }))
  }

  const doneFor = (name: string) => sets.filter((s) => s.exerciseName === name).length

  return (
    <section className="flex flex-col gap-3" aria-labelledby="session-heading">
      <RestTimer />
      <div className="sys-panel p-4 flex flex-col gap-4">
        <header className="flex justify-between items-baseline">
          <h1 id="session-heading" className="text-xl">
            {templateName ?? "Freestyle"}
          </h1>
          <span className="text-xs font-heading tracking-widest opacity-70">{sets.length} SETS</span>
        </header>

        {plan.length > 0 && (
          <ol className="flex flex-col gap-2" aria-label="Today's plan">
            {plan.map((e, i) => {
              const t = targets[e.name]
              const done = doneFor(e.name)
              const total = e.targetSets ?? t?.sets
              const complete = total !== undefined && done >= total
              const on = e.name === current
              return (
                <li key={`${i}-${e.name}`} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => select(e.name)}
                      aria-pressed={on}
                      className={`flex-1 text-left border px-3 py-2 ${on ? "border-[var(--xp)]" : "border-[var(--border)]"} ${complete ? "opacity-50" : ""}`}
                    >
                      <span className="flex justify-between gap-2">
                        <span className="font-heading tracking-wide">{e.name}</span>
                        <span className="font-heading tabular-nums text-sm">
                          {done}/{total ?? "–"}
                        </span>
                      </span>
                      {t && (
                        <span className="block text-sm opacity-80 tabular-nums">
                          {t.sets} × {t.status === "new" ? `${e.repMin}–${e.repMax}` : t.reps}
                          {t.weightKg !== undefined ? ` @ ${kg(t.weightKg)} kg` : " · pick a weight"}
                        </span>
                      )}
                      {t && t.status !== "hold" && (
                        <span className={`block font-heading text-xs tracking-widest ${t.status === "up" ? "text-[var(--xp)]" : t.status === "reset" ? "text-[var(--danger)]" : "opacity-70"}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      )}
                    </button>
                    {(e.alternatives?.length ?? 0) > 0 && done === 0 && (
                      <button
                        type="button"
                        onClick={() => setSwapping(swapping === i ? null : i)}
                        aria-expanded={swapping === i}
                        aria-label={`Swap ${e.name}`}
                        className="font-heading text-xs tracking-widest border border-[var(--border)] px-2"
                      >
                        SWAP
                      </button>
                    )}
                  </div>
                  {swapping === i && (
                    <div className="flex flex-wrap gap-2 pl-2" role="group" aria-label={`Alternatives to ${e.name}`}>
                      {e.alternatives!.map((alt) => (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => {
                            swap(i, alt)
                            select(alt)
                            setSwapping(null)
                          }}
                          className="font-heading tracking-widest text-sm border border-[var(--accent)] text-[var(--accent)] px-3"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        <SetEditor recent={recent} onAdd={log} />

        {sets.length > 0 && (
          <details>
            <summary className="font-heading tracking-widest text-sm cursor-pointer min-h-14 flex items-center opacity-80">LOGGED SETS ({sets.length})</summary>
            <ul className="flex flex-col gap-2 mt-1" aria-label="Logged sets">
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
          </details>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={finish}
            disabled={busy || sets.length === 0}
            className="flex-1 font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30"
          >
            FINISH SESSION
          </button>
          <button
            type="button"
            onClick={() => (confirmDiscard || sets.length === 0 ? clear() : setConfirmDiscard(true))}
            onBlur={() => setConfirmDiscard(false)}
            className="font-heading tracking-widest border border-[var(--danger)] text-[var(--danger)] px-4"
          >
            {confirmDiscard ? "SURE?" : "DISCARD"}
          </button>
        </div>
      </div>
    </section>
  )
}
