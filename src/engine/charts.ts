/**
 * Aggregations for the Records screen. Pure: dates in, plain rows out.
 */
import type { Completion } from "../db/types"
import { addDays, dateRange } from "../lib/date"

export interface DayPoint {
  date: string
  /** Short weekday label for the axis. */
  label: string
  xp: number
  completions: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const labelFor = (key: string): string => {
  const [y, m, d] = key.split("-").map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

const live = (c: Pick<Completion, "deleted">) => !c.deleted

/** One row per day over the last `days` days, ending on `today`. Empty days are zeros. */
export function dailySeries(
  completions: readonly Completion[],
  today: string,
  days: number,
): DayPoint[] {
  const from = addDays(today, -(days - 1))
  const xp = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const c of completions) {
    if (!live(c) || c.date < from || c.date > today) continue
    xp.set(c.date, (xp.get(c.date) ?? 0) + c.xpAwarded)
    counts.set(c.date, (counts.get(c.date) ?? 0) + 1)
  }
  return dateRange(from, addDays(today, 1)).map((date) => ({
    date,
    label: labelFor(date),
    xp: xp.get(date) ?? 0,
    completions: counts.get(date) ?? 0,
  }))
}

export interface HeatCell {
  date: string
  count: number
  /** 0 = empty, 1..4 = increasing intensity. */
  level: 0 | 1 | 2 | 3 | 4
}

const intensity = (count: number, max: number): HeatCell["level"] => {
  if (count <= 0) return 0
  const ratio = count / Math.max(1, max)
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

/**
 * Calendar heatmap cells for the last `days` days ending on `today`,
 * padded at the start so the grid begins on a Sunday.
 */
export function heatmap(completions: readonly Completion[], today: string, days: number): (HeatCell | null)[] {
  const from = addDays(today, -(days - 1))
  const counts = new Map<string, number>()
  for (const c of completions) {
    if (!live(c) || c.date < from || c.date > today) continue
    counts.set(c.date, (counts.get(c.date) ?? 0) + 1)
  }
  const max = Math.max(0, ...counts.values())
  const cells: (HeatCell | null)[] = dateRange(from, addDays(today, 1)).map((date) => {
    const count = counts.get(date) ?? 0
    return { date, count, level: intensity(count, max) }
  })
  const [y, m, d] = from.split("-").map(Number)
  const pad = new Date(y, m - 1, d).getDay()
  return [...Array<null>(pad).fill(null), ...cells]
}

/** Total XP awarded across the given completions. */
export function totalXp(completions: readonly Completion[]): number {
  return completions.reduce((sum, c) => (live(c) ? sum + c.xpAwarded : sum), 0)
}

/** Days on which at least one completion happened. */
export function activeDays(completions: readonly Completion[]): number {
  return new Set(completions.filter(live).map((c) => c.date)).size
}
