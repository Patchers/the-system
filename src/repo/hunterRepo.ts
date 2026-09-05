import { db } from "../db/schema"
import { touch } from "../db/record"
import type { Hunter } from "../db/types"
import { nowIso } from "../lib/date"
import { RepoError } from "./errors"

export const hunterRepo = {
  async get(): Promise<Hunter> {
    const hunter = await db.hunter.filter((h) => !h.deleted).first()
    if (!hunter) throw new RepoError("not-found", "No hunter registered. Run bootstrap first.")
    return hunter
  },

  /** Persist an engine-produced hunter. Stamps `updatedAt`. */
  async save(hunter: Hunter): Promise<Hunter> {
    const next = touch(hunter, nowIso())
    await db.hunter.put(next)
    return next
  },
}
