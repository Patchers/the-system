import type { WorkoutSet } from "../db/types"
import type { TargetStatus } from "../engine/progression"

type SetLike = Pick<WorkoutSet, "reps" | "weightKg" | "distanceKm" | "durationMin">

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** "5 × 100 kg", "5 km · 30 min", "20 min". */
export function describeSet(s: SetLike): string {
  const parts: string[] = []
  if (s.reps !== undefined && s.weightKg !== undefined) parts.push(`${s.reps} × ${num(s.weightKg)} kg`)
  else if (s.reps !== undefined) parts.push(`${s.reps} reps`)
  else if (s.weightKg !== undefined) parts.push(`${num(s.weightKg)} kg`)
  if (s.distanceKm !== undefined) parts.push(`${num(s.distanceKm)} km`)
  if (s.durationMin !== undefined) parts.push(`${num(s.durationMin)} min`)
  return parts.join(" · ") || "—"
}

/** "Squat ×3 · Run ×1" — set counts per exercise, in first-seen order. */
export function summariseSets(sets: readonly Pick<WorkoutSet, "exerciseName">[]): string {
  const counts = new Map<string, number>()
  for (const s of sets) counts.set(s.exerciseName, (counts.get(s.exerciseName) ?? 0) + 1)
  return [...counts].map(([name, n]) => `${name} ×${n}`).join(" · ")
}

/** Short label for how today's target relates to last time. */
export const STATUS_LABEL: Record<TargetStatus, string> = {
  new: "SET BASELINE",
  up: "▲ LOAD UP",
  hold: "■ BEAT LAST TIME",
  reset: "▼ RESET",
}
