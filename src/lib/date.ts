/**
 * Date helpers for THE SYSTEM.
 *
 * The "day" rolls over at DAY_ROLLOVER_HOUR local time (04:00), not midnight.
 * Every date key in the app comes from here. Never slice an ISO string elsewhere.
 */

import { DAY_ROLLOVER_HOUR } from "../engine/constants"

export { DAY_ROLLOVER_HOUR }

const pad = (n: number) => String(n).padStart(2, "0")

/** Format a local Date as YYYY-MM-DD (no timezone shift). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse a YYYY-MM-DD key into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * The app-day key for a given instant, honouring the rollover hour.
 * 03:59 on the 6th belongs to the 5th; 04:00 on the 6th belongs to the 6th.
 */
export function dayKeyFor(now: Date, rolloverHour = DAY_ROLLOVER_HOUR): string {
  const shifted = new Date(now.getTime())
  shifted.setHours(shifted.getHours() - rolloverHour)
  return toDateKey(shifted)
}

/** Today's app-day key. The only place `new Date()` is read for a date key. */
export function todayKey(rolloverHour = DAY_ROLLOVER_HOUR): string {
  return dayKeyFor(new Date(), rolloverHour)
}

/** Add whole days to a date key. */
export function addDays(key: string, days: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Every key from `from` (inclusive) up to `to` (exclusive). */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  let cur = from
  while (cur < to) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** Whole days between two keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Milliseconds until the next rollover instant. */
export function msUntilRollover(now: Date, rolloverHour = DAY_ROLLOVER_HOUR): number {
  const next = new Date(now.getTime())
  next.setHours(rolloverHour, 0, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}
