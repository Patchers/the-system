import { useState } from "react"
import type { TemplateExercise } from "../db/types"
import type { DraftSet, SetKind } from "../store/sessionStore"
import { Stepper } from "./Stepper"

interface SetEditorProps {
  /** Template exercises for this session, if any. Drive the name chips and defaults. */
  plan: TemplateExercise[]
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
  ex?.targetDistanceKm !== undefined ? "cardio" : ex?.targetReps !== undefined ? "lift" : ex?.targetDurationMin !== undefined ? "timed" : "lift"

/** Builds one set with chips and steppers. Values persist between adds so repeat sets are one tap. */
export function SetEditor({ plan, recent, onAdd }: SetEditorProps) {
  const first = plan[0]
  const [name, setName] = useState(first?.name ?? "")
  const [kind, setKind] = useState<SetKind>(kindFor(first))
  const [reps, setReps] = useState(first?.targetReps ?? 10)
  const [weightKg, setWeightKg] = useState(20)
  const [distanceKm, setDistanceKm] = useState(first?.targetDistanceKm ?? 5)
  const [durationMin, setDurationMin] = useState(first?.targetDurationMin ?? 30)
  const [typing, setTyping] = useState(false)

  const chips = [...new Set([...plan.map((e) => e.name), ...recent])].slice(0, 8)

  const pick = (n: string) => {
    setName(n)
    setTyping(false)
    const ex = plan.find((e) => e.name === n)
    if (ex) {
      setKind(kindFor(ex))
      if (ex.targetReps !== undefined) setReps(ex.targetReps)
      if (ex.targetDistanceKm !== undefined) setDistanceKm(ex.targetDistanceKm)
      if (ex.targetDurationMin !== undefined) setDurationMin(ex.targetDurationMin)
    }
  }

  const add = () => {
    const clean = name.trim()
    if (!clean) return
    const set: Omit<DraftSet, "key"> = { exerciseName: clean, kind }
    if (kind === "lift") Object.assign(set, { reps, weightKg })
    if (kind === "cardio") Object.assign(set, { distanceKm, durationMin })
    if (kind === "timed") Object.assign(set, { durationMin })
    onAdd(set)
  }

  const chip = (on: boolean) =>
    `font-heading tracking-widest text-sm border px-3 ${on ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"}`

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-heading tracking-widest mb-2">Exercise</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => pick(c)} aria-pressed={name === c && !typing} className={chip(name === c && !typing)}>
              {c}
            </button>
          ))}
          <button type="button" onClick={() => setTyping(true)} aria-pressed={typing} className={chip(typing)}>
            OTHER…
          </button>
        </div>
        {(typing || chips.length === 0) && (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            aria-label="Exercise name"
            className="mt-2 w-full bg-black/40 border border-[var(--border)] px-3 min-h-14"
            maxLength={40}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={chip(kind === k.value)}>
            {k.label}
          </button>
        ))}
      </div>

      {kind === "lift" && (
        <>
          <Stepper label="REPS" value={reps} onChange={setReps} step={1} min={1} max={999} />
          <Stepper label="WEIGHT" value={weightKg} onChange={setWeightKg} step={2.5} min={0} max={999} unit="kg" />
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
        disabled={!name.trim()}
        className="font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30"
      >
        + ADD SET
      </button>
    </div>
  )
}
