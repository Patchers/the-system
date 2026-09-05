import { db } from "../db/schema"
import { stamp } from "../db/record"
import type { Completion } from "../db/types"
import { nowIso } from "../lib/date"

export type NewCompletion = Pick<Completion, "questId" | "date" | "xpAwarded" | "statAwarded">

const live = (c: Completion) => !c.deleted

export const completionRepo = {
  async add(input: NewCompletion): Promise<Completion> {
    const completion: Completion = { ...stamp(nowIso()), ...input }
    await db.completions.add(completion)
    return completion
  },

  async listForDate(date: string): Promise<Completion[]> {
    return db.completions.where("date").equals(date).filter(live).toArray()
  },

  /** Completions dated on or after `date`. Feed for the penalty engine. */
  async listSince(date: string): Promise<Completion[]> {
    return db.completions.where("date").aboveOrEqual(date).filter(live).toArray()
  },

  /** Completions dated in [from, to] inclusive. Feed for heatmaps and charts. */
  async listBetween(from: string, to: string): Promise<Completion[]> {
    return db.completions.where("date").between(from, to, true, true).filter(live).toArray()
  },

  /** How many times a quest was completed on a date. Drives habit decay. */
  async countForQuestOn(questId: string, date: string): Promise<number> {
    return db.completions.where("[questId+date]").equals([questId, date]).filter(live).count()
  },
}
