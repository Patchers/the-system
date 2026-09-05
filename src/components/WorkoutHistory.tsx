import type { Workout, WorkoutSet } from "../db/types"
import { describeSet, summariseSets } from "../lib/format"

export interface HistoryEntry {
  workout: Workout
  sets: WorkoutSet[]
}

/** Recent sessions, newest first. Tap a session to expand its sets. */
export function WorkoutHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return <p className="opacity-70 px-1">No sessions logged yet.</p>
  return (
    <ul className="flex flex-col gap-2" aria-label="Session history">
      {entries.map(({ workout, sets }) => (
        <li key={workout.id}>
          <details className="sys-panel p-3">
            <summary className="flex justify-between gap-3 cursor-pointer min-h-14 items-center list-none">
              <span>
                <span className="font-heading tracking-widest text-sm">{workout.date}</span>
                <span className="block text-sm opacity-80 truncate">{summariseSets(sets) || "Empty session"}</span>
              </span>
              <span className="text-xs font-heading opacity-60 whitespace-nowrap">{sets.length} SETS</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {sets.map((s) => (
                <li key={s.id}>
                  {s.exerciseName} <span className="opacity-70">· {describeSet(s)}</span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  )
}
