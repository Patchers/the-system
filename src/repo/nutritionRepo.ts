import { db } from "../db/schema"
import { stamp, touch } from "../db/record"
import type { Nutrition } from "../db/types"
import { nowIso } from "../lib/date"

const live = (n: Nutrition) => !n.deleted

export const nutritionRepo = {
  async getForDate(date: string): Promise<Nutrition | undefined> {
    const n = await db.nutrition.where("date").equals(date).first()
    return n && live(n) ? n : undefined
  },

  /** Entries dated in [from, to] inclusive. */
  async listBetween(from: string, to: string): Promise<Nutrition[]> {
    return db.nutrition.where("date").between(from, to, true, true).filter(live).toArray()
  },

  /** Add (or subtract) calories for a day, creating the day with `goal` if needed. Never below 0. */
  async addCalories(date: string, delta: number, goal: number): Promise<Nutrition> {
    return db.transaction("rw", db.nutrition, async () => {
      const now = nowIso()
      const existing = await nutritionRepo.getForDate(date)
      const next: Nutrition = existing
        ? touch({ ...existing, calories: Math.max(0, existing.calories + delta) }, now)
        : { ...stamp(now), date, calories: Math.max(0, delta), goal }
      await db.nutrition.put(next)
      return next
    })
  },

  async setCalories(date: string, calories: number, goal: number): Promise<Nutrition> {
    return db.transaction("rw", db.nutrition, async () => {
      const now = nowIso()
      const existing = await nutritionRepo.getForDate(date)
      const next: Nutrition = existing
        ? touch({ ...existing, calories: Math.max(0, calories) }, now)
        : { ...stamp(now), date, calories: Math.max(0, calories), goal }
      await db.nutrition.put(next)
      return next
    })
  },
}
