import { db } from "../db/schema"
import { touch } from "../db/record"
import { makeSettings } from "../db/seed"
import type { Settings } from "../db/types"
import { nowIso } from "../lib/date"

export type SettingsPatch = Partial<Omit<Settings, "id" | "createdAt" | "updatedAt" | "deleted">>

export const settingsRepo = {
  async get(): Promise<Settings> {
    const existing = await db.settings.get("singleton")
    if (existing) return existing
    const fresh = makeSettings(nowIso())
    await db.settings.put(fresh)
    return fresh
  },

  async update(patch: SettingsPatch): Promise<Settings> {
    const current = await settingsRepo.get()
    const next = touch({ ...current, ...patch }, nowIso())
    await db.settings.put(next)
    return next
  },
}
