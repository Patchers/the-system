import { useEffect, useState } from "react"
import type { TemplateExercise } from "../db/types"
import type { DraftSet, SetKind } from "../store/sessionStore"
import { useSessionStore } from "../store/sessionStore"
import { Stepper } from "./Stepper"

interface SetEditorProps {
  /** Exercise names seen in history, for freestyle chips. */
  recent: string[]
  onAdd: (set: Omit<DraftSet, "key">) => void
}

const KINDS: { value: SetKind; label: string }[] = [
  { value: "lift", label: "LIFT" },
  { value: "cardio", label: "CARDIO" },
  { value: "timed", label: "TIMED" },
]

const kindFor = (ex?: TemplateExercise): SetKind =>
  ex?.targetDistanceKm !== undefined ? "cardio" : ex?.targetReps !== undefined || ex?.repMin !== undefined ? "lift" : ex?.targetDurationMin !== undefined ? "timed" : "lift"

/**
 * Builds one set. In a planned session it pre-fills today's target, so a set
 * that hits target is a single tap. Values persist between adds.
 */
export function SetEditor({ recent, onAdd }: SetEditorProps) {
  const { plan, targets, current, sets, select } = useSessionStore()
  const ex = plan.find((e) => e.name === current)
  const target = targets[current]

  const [kind, setKind] = useState<SetKind>(kindFor(ex))
  const [reps, setReps] = useState(target?.reps ?? ex?.targetReps ?? 10)
  const [weightKg, setWeightKg] = useState(target?.weightKg ?? 20)
  const [distanceKm, setDistanceKm] = useState(ex?.targetDistanceKm ?? 5)
  const [durationMin, setDurationMin] = useState(ex?.targetDurationMin ?? 30)
  const [typing, setTyping] = useState(plan.length === 0 && recent.length === 0)

  // Moving to another exercise loads its target (or its last logged values this session).
  useEffect(() => {
    const e = plan.find((p) => p.name === current)
    const t = targets[current]
    const lastHere = [...sets].reverse().find((s) => s.exerciseName === current)
    setKind(lastHere?.kind ?? kindFor(e))
    const r = lastHere?.reps ?? t?.reps ?? e?.targetReps
    if (r !== undefined) setReps(r)
    const w = lastHere?.weightKg ?? t?.weightKg
    if (w !== undefined) setWeightKg(w)
    if (e?.targetDistanceKm !== undefined) setDistanceKm(e.targetDistanceKm)
    if (e?.targetDurationMin !== undefined) setDurationMin(e.targetDurationMin)
    // Only when the exercise changes, not on every logged set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const chips = plan.length > 0 ? [] : [...new Set(recent)].slice(0, 8)

  const add = () => {
    const clean = current.trim()
    if (!clean) return
    const set: Omit<DraftSet, "key"> = { exerciseName: clean, kind }
    if (kind === "lift") Object.assign(set, { reps, weightKg })
    if (kind === "cardio") Object.assign(set, { distanceKm, durationMin })
    if (kind === "timed") Object.assign(set, { durationMin })
    onAdd(set)

    // Planned session: once this exercise's sets are done, move to the next unfinished one.
    if (ex?.targetSets !== undefined) {
      const done = sets.filter((s) => s.exerciseName === clean).length + 1
      if (done >= ex.targetSets) {
        const next = plan.find((p) => p.name !== clean && sets.filter((s) => s.exerciseName === p.name).length < (p.targetSets ?? 1))
        if (next) select(next.name)
      }
    }
  }

  const chip = (on: boolean) =>
    `font-heading tracking-widest text-sm border px-3 ${on ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"}`

  const hitTarget = target?.weightKg !== undefined && kind === "lift" && reps === target.reps && weightKg === target.weightKg

  return (
    <div className="flex flex-col gap-4">
      {plan.length === 0 && (
        <div>
          <p className="text-sm font-heading tracking-widest mb-2">Exercise</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  select(c)
                  setTyping(false)
                }}
                aria-pressed={current === c && !typing}
                className={chip(current === c && !typing)}
              >
                {c}
              </button>
            ))}
            <button type="button" onClick={() => setTyping(true)} aria-pressed={typing} className={chip(typing)}>
              OTHER…
            </button>
          </div>
          {typing && (
            <input
              autoFocus
              value={current}
              onChange={(e) => select(e.target.value)}
              placeholder="Exercise name"
              aria-label="Exercise name"
              className="mt-2 w-full bg-black/40 border border-[var(--border)] px-3 min-h-14"
              maxLength={40}
            />
          )}
        </div>
      )}

      {plan.length > 0 && current && (
        <p className="font-heading tracking-widest text-lg text-[var(--accent)]" aria-live="polite">
          {current}
        </p>
      )}

      {!target && (
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={chip(kind === k.value)}>
              {k.label}
            </button>
          ))}
        </div>
      )}

      {kind === "lift" && (
        <>
          <Stepper label="REPS" value={reps} onChange={setReps} step={1} min={1} max={999} />
          <Stepper label="WEIGHT" value={weightKg} onChange={setWeightKg} step={plan.find((p) => p.name === current)?.incrementKg ?? 2.5} min={0} max={999} unit="kg" />
        </>
      )}
      {kind === "cardio" && (
        <>
          <Stepper label="DISTANCE" value={distanceKm} onChange={setDistanceKm} step={0.5} min={0} max={999} unit="km" />
          <Stepper label="TIME" value={durationMin} onChange={setDurationMin} step={5} min={0} max={999} unit="min" />
        </>
      )}
      {kind === "timed" && <Stepper label="TIME" value={durationMin} onChange={setDurationMin} step={5} min={1} max={999} unit="min" />}

      <button
        type="button"
        onClick={add}
        disabled={!current.trim()}
        className="font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30"
      >
        {hitTarget ? "✓ LOG SET · ON TARGET" : "+ LOG SET"}
      </button>
    </div>
  )
}
