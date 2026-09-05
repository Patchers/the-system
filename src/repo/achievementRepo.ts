import { db } from "../db/schema"
import { stamp } from "../db/record"
import type { Achievement } from "../db/types"
import { nowIso } from "../lib/date"

const live = (a: Achievement) => !a.deleted

export const achievementRepo = {
  async list(): Promise<Achievement[]> {
    return db.achievements.filter(live).toArray()
  },

  async has(code: string): Promise<boolean> {
    const a = await db.achievements.where("code").equals(code).first()
    return Boolean(a && live(a))
  },

  /** Unlock once. Returns the new record, or null if already unlocked. */
  async unlock(code: string): Promise<Achievement | null> {
    return db.transaction("rw", db.achievements, async () => {
      if (await achievementRepo.has(code)) return null
      const now = nowIso()
      const achievement: Achievement = { ...stamp(now), code, unlockedAt: now }
      await db.achievements.add(achievement)
      return achievement
    })
  },
}
