import { db } from "../db/schema"
import { touch } from "../db/record"
import { makeSettings } from "../db/seed"
import type { Settings } from "../db/types"
import { nowIso } from "../lib/date"

export type SettingsPatch = Partial<Omit<Settings, "id" | "createdAt" | "updatedAt" | "deleted">>

export const settingsRepo = {
  /** Read-only, so it is safe inside live queries. Falls back to defaults until the seed lands. */
  async get(): Promise<Settings> {
    return (await db.settings.get("singleton")) ?? makeSettings(nowIso())
  },

  async update(patch: SettingsPatch): Promise<Settings> {
    const current = await settingsRepo.get()
    const next = touch({ ...current, ...patch }, nowIso())
    await db.settings.put(next)
    return next
  },
}
