import { db } from "../db/schema"
import { seedIfEmpty } from "../db/seed"
import type { Hunter } from "../db/types"
import { nowIso, todayKey } from "../lib/date"
import { hunterRepo } from "./hunterRepo"

/** Open the database, seed on first run, return the hunter. Call once on app start. */
export async function bootstrap(): Promise<{ hunter: Hunter; seeded: boolean }> {
  const seeded = await seedIfEmpty(db, todayKey(), nowIso())
  const hunter = await hunterRepo.get()
  return { hunter, seeded }
}
