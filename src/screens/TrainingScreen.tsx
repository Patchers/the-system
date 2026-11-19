import { useState } from "react"
import { logWorkout } from "../actions/logWorkout"
import { loadStarterProgramme, nextUp, planTargets } from "../actions/planSession"
import { LiftProgress } from "../components/LiftProgress"
import { SessionPanel } from "../components/SessionPanel"
import { TemplateEditor } from "../components/TemplateEditor"
import { WorkoutHistory, type HistoryEntry } from "../components/WorkoutHistory"
import type { Template, TemplateExercise } from "../db/types"
import { STAT_KEYS } from "../engine/constants"
import { isProgressive } from "../engine/progression"
import { todayKey } from "../lib/date"
import { STATUS_LABEL } from "../lib/format"
import { isRepoError } from "../repo/errors"
import { templateRepo } from "../repo/templateRepo"
import { useLive } from "../repo/useLive"
import { workoutRepo } from "../repo/workoutRepo"
import { useSessionStore, type DraftSet } from "../store/sessionStore"
import { useToastStore } from "../store/toastStore"

const HISTORY_LIMIT = 20

/** Turn a finished session into template exercises: one entry per exercise with the last set's targets. */
function toTemplateExercises(sets: DraftSet[]): TemplateExercise[] {
  const byName = new Map<string, TemplateExercise>()
  for (const s of sets) {
    const prev = byName.get(s.exerciseName)
    byName.set(s.exerciseName, {
      name: s.exerciseName,
      targetSets: (prev?.targetSets ?? 0) + 1,
      targetReps: s.reps,
      targetDistanceKm: s.distanceKm,
      targetDurationMin: s.durationMin,
    })
  }
  return [...byName.values()]
}

export function TrainingScreen() {
  const session = useSessionStore()
  const showToast = useToastStore((s) => s.show)
  const [pendingTemplate, setPendingTemplate] = useState<DraftSet[] | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [manage, setManage] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)

  const data = useLive(async () => {
    const [templates, workouts, next] = await Promise.all([templateRepo.list(), workoutRepo.list(HISTORY_LIMIT), nextUp()])
    templates.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const history: HistoryEntry[] = await Promise.all(workouts.map(async (workout) => ({ workout, sets: await workoutRepo.setsFor(workout.id) })))
    return { templates, history, next }
  })

  if (!data) return null
  if (editing) return <TemplateEditor template={editing} onClose={() => setEditing(null)} />

  const begin = async (t: Template) => session.start(t, await planTargets(t.exercises))
  const hasProgramme = data.templates.some((t) => t.exercises.some(isProgressive))
  const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  const recent = [...new Set(data.history.flatMap((h) => h.sets.map((s) => s.exerciseName)))]

  const finish = async () => {
    const sets = session.sets
    try {
      const r = await logWorkout(
        { date: todayKey(), notes: "", templateId: session.templateId },
        sets.map(({ exerciseName, reps, weightKg, distanceKm, durationMin }) => ({ exerciseName, reps, weightKg, distanceKm, durationMin })),
      )
      const gained = STAT_KEYS.filter((k) => r.pointsGained[k] > 0).map((k) => `${k.toUpperCase()} +${r.pointsGained[k]}`)
      showToast(gained.length ? `SESSION LOGGED · ${gained.join(" · ")}` : "SESSION LOGGED")
      if (!session.templateId) setPendingTemplate(sets)
      session.clear()
    } catch (e) {
      showToast(isRepoError(e) ? e.message : "Could not save the session.")
    }
  }

  const saveTemplate = async () => {
    if (!pendingTemplate) return
    const name = templateName.trim()
    if (!name) return
    await templateRepo.add(name, toTemplateExercises(pendingTemplate))
    setPendingTemplate(null)
    setTemplateName("")
    showToast("TEMPLATE SAVED")
  }

  return (
    <div className="flex flex-col gap-5">
      {session.active ? (
        <SessionPanel recent={recent} onFinish={finish} />
      ) : (
        <>
        {data.next && (
          <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="next-heading">
            <header className="flex justify-between items-baseline">
              <h1 id="next-heading" className="text-xl">
                {data.next.template.name}
              </h1>
              <span className="text-xs font-heading tracking-widest text-[var(--xp)]">NEXT UP</span>
            </header>
            <ul className="flex flex-col gap-1">
              {data.next.template.exercises.map((e) => {
                const t = data.next!.targets[e.name]
                return (
                  <li key={e.name} className="flex justify-between gap-2 text-sm">
                    <span>{e.name}</span>
                    <span className="tabular-nums opacity-80 text-right">
                      {t ? `${t.sets} × ${t.status === "new" ? `${e.repMin}–${e.repMax}` : t.reps}${t.weightKg !== undefined ? ` @ ${fmtKg(t.weightKg)} kg` : ""}` : ""}
                      {t && t.status !== "hold" && t.status !== "new" && (
                        <span className={`block font-heading text-xs tracking-widest ${t.status === "up" ? "text-[var(--xp)]" : t.status === "reset" ? "text-[var(--danger)]" : "opacity-70"}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button type="button" onClick={() => session.start(data.next!.template, data.next!.targets)} className="font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)]">
              BEGIN
            </button>
          </section>
        )}
        <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="start-heading">
          <header className="flex justify-between items-baseline">
            <h1 id="start-heading" className="text-xl">
              {data.next ? "Other sessions" : "Start session"}
            </h1>
            {data.templates.length > 0 && (
              <button type="button" onClick={() => setManage((m) => !m)} className="text-xs font-heading tracking-widest opacity-70 min-h-0 min-w-0 px-2">
                {manage ? "DONE" : "MANAGE"}
              </button>
            )}
          </header>
          {data.templates.map((t) => (
            <div key={t.id} className="flex gap-2">
              <button
                type="button"
                onClick={() => void begin(t)}
                className="flex-1 text-left border border-[var(--border)] px-4 active:bg-[var(--glow)]/30"
              >
                <span className="font-heading tracking-widest">{t.name}</span>
                <span className="block text-xs opacity-70 truncate">{t.exercises.map((e) => e.name).join(" · ")}</span>
              </button>
              {manage && (
                <button type="button" onClick={() => setEditing(t)} aria-label={`Edit template ${t.name}`} className="border border-[var(--border)] font-heading text-xs tracking-widest px-2">
                  EDIT
                </button>
              )}
              {manage && (
                <button
                  type="button"
                  onClick={() => void templateRepo.remove(t.id)}
                  aria-label={`Delete template ${t.name}`}
                  className="border border-[var(--danger)] text-[var(--danger)] font-heading"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => session.start()} className="font-heading tracking-widest text-lg border border-[var(--xp)] text-[var(--xp)]">
            FREESTYLE
          </button>
          {!hasProgramme && (
            <button
              type="button"
              onClick={() => void loadStarterProgramme().then(() => showToast("PROGRAMME LOADED · 3 DAYS"))}
              className="font-heading tracking-widest border border-[var(--accent)] text-[var(--accent)]"
            >
              LOAD 3-DAY LIFTING PROGRAMME
            </button>
          )}
        </section>
        </>
      )}

      {pendingTemplate && (
        <section className="sys-panel p-4 flex flex-col gap-3" aria-label="Save as template">
          <h2 className="text-lg">Save as template?</h2>
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            aria-label="Template name"
            className="bg-black/40 border border-[var(--border)] px-3 min-h-14"
            maxLength={40}
          />
          <div className="flex gap-2">
            <button type="button" onClick={saveTemplate} disabled={!templateName.trim()} className="flex-1 font-heading tracking-widest border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30">
              SAVE
            </button>
            <button type="button" onClick={() => setPendingTemplate(null)} className="font-heading tracking-widest border border-[var(--border)] px-4">
              SKIP
            </button>
          </div>
        </section>
      )}

      {!session.active && <LiftProgress />}

      <section className="flex flex-col gap-3" aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-lg px-1">
          History
        </h2>
        <WorkoutHistory entries={data.history} />
      </section>
    </div>
  )
}
