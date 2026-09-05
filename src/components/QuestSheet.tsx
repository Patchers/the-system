import { useState, type FormEvent } from "react"
import type { Difficulty, Quest, QuestType, StatKey } from "../db/types"
import { BASE_XP, STAT_KEYS } from "../engine/constants"
import { isRepoError } from "../repo/errors"
import { questRepo } from "../repo/questRepo"

const TYPES: { value: QuestType; label: string; hint: string }[] = [
  { value: "daily", label: "Daily", hint: "Every day. Missing it costs HP and XP." },
  { value: "task", label: "Task", hint: "One-off. Clears when done." },
  { value: "habit", label: "Habit", hint: "Repeatable. XP halves each time today." },
]
const DIFFICULTIES = Object.keys(BASE_XP) as Difficulty[]

interface QuestSheetProps {
  /** Existing quest to edit, or null to create. */
  quest: Quest | null
  onClose: () => void
}

/** Bottom sheet for creating or editing a quest. Cap errors surface inline. */
export function QuestSheet({ quest, onClose }: QuestSheetProps) {
  const [title, setTitle] = useState(quest?.title ?? "")
  const [type, setType] = useState<QuestType>(quest?.type ?? "daily")
  const [difficulty, setDifficulty] = useState<Difficulty>(quest?.difficulty ?? "C")
  const [stat, setStat] = useState<StatKey>(quest?.stat ?? "str")
  const [dueAt, setDueAt] = useState(quest?.dueAt ?? "")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (work: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await work()
      onClose()
    } catch (e) {
      setError(isRepoError(e) ? e.message : "Could not save the quest.")
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return setError("Give the quest a title.")
    const fields = { title: clean, type, difficulty, stat, dueAt: type === "task" && dueAt ? dueAt : undefined }
    void run(() => (quest ? questRepo.update(quest.id, fields) : questRepo.add(fields)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="sys-panel w-full max-w-lg mx-auto p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        aria-label={quest ? "Edit quest" : "New quest"}
      >
        <h2 className="text-xl">{quest ? "Edit quest" : "New quest"}</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-heading tracking-widest">Title</span>
          <input
            autoFocus={!quest}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-black/40 border border-[var(--border)] px-3 min-h-14 text-lg"
            maxLength={80}
          />
        </label>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-heading tracking-widest mb-1">Type</legend>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={type === t.value}
                className={`font-heading tracking-widest border ${
                  type === t.value ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs opacity-70">{TYPES.find((t) => t.value === type)?.hint}</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-heading tracking-widest mb-1">Difficulty</legend>
          <div className="grid grid-cols-6 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={`font-heading text-xl border ${
                  difficulty === d ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-heading tracking-widest mb-1">Stat</legend>
          <div className="grid grid-cols-5 gap-2">
            {STAT_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStat(k)}
                aria-pressed={stat === k}
                className={`font-heading tracking-widest border ${
                  stat === k ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>

        {type === "task" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-heading tracking-widest">Due (optional)</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="bg-black/40 border border-[var(--border)] px-3 min-h-14"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 font-heading tracking-widest border border-[var(--xp)] text-[var(--xp)]">
            SAVE
          </button>
          <button type="button" onClick={onClose} className="font-heading tracking-widest border border-[var(--border)] px-4">
            CANCEL
          </button>
        </div>
        {quest && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => questRepo.archive(quest.id))}
              className="flex-1 font-heading tracking-widest border border-[var(--border)] opacity-80"
            >
              ARCHIVE
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => questRepo.remove(quest.id))}
              className="flex-1 font-heading tracking-widest border border-[var(--danger)] text-[var(--danger)]"
            >
              DELETE
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
