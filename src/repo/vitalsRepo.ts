import { db } from "../db/schema"
import { stamp, touch } from "../db/record"
import type { Vitals } from "../db/types"
import { nowIso } from "../lib/date"

export type VitalsPatch = Partial<Pick<Vitals, "weightKg" | "sleepHours" | "waterMl">>

const live = (v: Vitals) => !v.deleted

export const vitalsRepo = {
  async getForDate(date: string): Promise<Vitals | undefined> {
    const v = await db.vitals.where("date").equals(date).first()
    return v && live(v) ? v : undefined
  },

  /** Entries dated in [from, to] inclusive, ascending. */
  async listBetween(from: string, to: string): Promise<Vitals[]> {
    return db.vitals.where("date").between(from, to, true, true).filter(live).toArray()
  },

  /** Merge fields into the day's record, creating it if absent. */
  async upsert(date: string, patch: VitalsPatch): Promise<Vitals> {
    return db.transaction("rw", db.vitals, async () => {
      const now = nowIso()
      const existing = await vitalsRepo.getForDate(date)
      const next: Vitals = existing ? touch({ ...existing, ...patch }, now) : { ...stamp(now), date, ...patch }
      await db.vitals.put(next)
      return next
    })
  },

  /** Add to today's water total. */
  async addWater(date: string, ml: number): Promise<Vitals> {
    const existing = await vitalsRepo.getForDate(date)
    return vitalsRepo.upsert(date, { waterMl: Math.max(0, (existing?.waterMl ?? 0) + ml) })
  },
}
