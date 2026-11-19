import { useState } from "react"
import type { Template, TemplateExercise } from "../db/types"
import { DEFAULT_INCREMENT_KG } from "../engine/constants"
import { templateRepo } from "../repo/templateRepo"
import { Stepper } from "./Stepper"

interface TemplateEditorProps {
  template: Template
  onClose: () => void
}

const blank = (): TemplateExercise => ({ name: "", targetSets: 3, targetReps: 8, repMin: 8, repMax: 10, incrementKg: DEFAULT_INCREMENT_KG, alternatives: [] })

/** Edit a training day: exercises, sets, rep range, weight jump and swap options. */
export function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const [name, setName] = useState(template.name)
  const [exercises, setExercises] = useState<TemplateExercise[]>(template.exercises)
  const [altText, setAltText] = useState<string[]>(template.exercises.map((e) => (e.alternatives ?? []).join(", ")))
  const [open, setOpen] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const patch = (i: number, p: Partial<TemplateExercise>) => setExercises((xs) => xs.map((e, j) => (j === i ? { ...e, ...p } : e)))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= exercises.length) return
    const swapIn = <T,>(xs: T[]) => {
      const next = [...xs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    }
    setExercises(swapIn)
    setAltText(swapIn)
    setOpen(j)
  }

  const remove = (i: number) => {
    setExercises((xs) => xs.filter((_, j) => j !== i))
    setAltText((xs) => xs.filter((_, j) => j !== i))
    setOpen(null)
  }

  const add = () => {
    setExercises((xs) => [...xs, blank()])
    setAltText((xs) => [...xs, ""])
    setOpen(exercises.length)
  }

  const save = async () => {
    const clean = exercises
      .map((e, i) => ({
        ...e,
        name: e.name.trim(),
        targetReps: e.repMin ?? e.targetReps,
        alternatives: altText[i]
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      }))
      .filter((e) => e.name)
    setSaving(true)
    try {
      await templateRepo.update(template.id, { name: name.trim() || template.name, exercises: clean })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = "bg-black/40 border border-[var(--border)] px-3 min-h-14 w-full"

  return (
    <section className="sys-panel p-4 flex flex-col gap-4" aria-labelledby="edit-heading">
      <h1 id="edit-heading" className="text-xl">
        Edit day
      </h1>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Day name" className={field} maxLength={40} />

      <ol className="flex flex-col gap-2">
        {exercises.map((e, i) => (
          <li key={i} className="border border-[var(--border)]">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full text-left px-3 py-2 flex justify-between gap-2">
              <span className="font-heading tracking-wide">{e.name || "New exercise"}</span>
              <span className="text-sm opacity-70 tabular-nums">
                {e.targetSets ?? "–"} × {e.repMin !== undefined ? `${e.repMin}–${e.repMax}` : (e.targetReps ?? "–")}
              </span>
            </button>
            {open === i && (
              <div className="p-3 pt-0 flex flex-col gap-3">
                <input value={e.name} onChange={(ev) => patch(i, { name: ev.target.value })} placeholder="Exercise name" aria-label="Exercise name" className={field} maxLength={40} />
                <Stepper label="SETS" value={e.targetSets ?? 3} onChange={(v) => patch(i, { targetSets: v })} step={1} min={1} max={10} />
                <Stepper label="REPS MIN" value={e.repMin ?? 8} onChange={(v) => patch(i, { repMin: v, repMax: Math.max(v, e.repMax ?? v) })} step={1} min={1} max={50} />
                <Stepper label="REPS MAX" value={e.repMax ?? 10} onChange={(v) => patch(i, { repMax: v, repMin: Math.min(v, e.repMin ?? v) })} step={1} min={1} max={50} />
                <Stepper label="JUMP" value={e.incrementKg ?? DEFAULT_INCREMENT_KG} onChange={(v) => patch(i, { incrementKg: v })} step={0.5} min={0.5} max={20} unit="kg" />
                <label className="flex flex-col gap-1">
                  <span className="font-heading tracking-widest text-sm">SWAP OPTIONS</span>
                  <input
                    value={altText[i]}
                    onChange={(ev) => setAltText((xs) => xs.map((x, j) => (j === i ? ev.target.value : x)))}
                    placeholder="Comma separated, e.g. Leg press, Hack squat"
                    className={field}
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="font-heading border border-[var(--border)] disabled:opacity-30">
                    ▲ UP
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === exercises.length - 1} className="font-heading border border-[var(--border)] disabled:opacity-30">
                    ▼ DOWN
                  </button>
                  <button type="button" onClick={() => remove(i)} className="font-heading border border-[var(--danger)] text-[var(--danger)]">
                    REMOVE
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <button type="button" onClick={add} className="font-heading tracking-widest border border-[var(--border)]">
        + ADD EXERCISE
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="flex-1 font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30">
          SAVE
        </button>
        <button type="button" onClick={onClose} className="font-heading tracking-widest border border-[var(--border)] px-4">
          CANCEL
        </button>
      </div>
    </section>
  )
}
