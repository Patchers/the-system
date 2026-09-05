import { db } from "../db/schema"
import { stamp, tombstone, touch } from "../db/record"
import type { Quest, QuestType } from "../db/types"
import { MAX_ACTIVE_DAILY, MAX_ACTIVE_TASK } from "../engine/constants"
import { nowIso } from "../lib/date"
import { RepoError } from "./errors"

export type NewQuest = Pick<Quest, "title" | "type" | "difficulty" | "stat"> &
  Partial<Pick<Quest, "dungeonId" | "dueAt">>

export type QuestPatch = Partial<Omit<Quest, "id" | "createdAt" | "updatedAt" | "deleted">>

const live = (q: Quest) => !q.deleted

const CAPS: Partial<Record<QuestType, { max: number; code: "daily-cap" | "task-cap" }>> = {
  daily: { max: MAX_ACTIVE_DAILY, code: "daily-cap" },
  task: { max: MAX_ACTIVE_TASK, code: "task-cap" },
}

/** Throw if activating one more quest of `type` would exceed its cap. */
async function assertCap(type: QuestType, excludeId?: string): Promise<void> {
  const cap = CAPS[type]
  if (!cap) return
  const active = await db.quests
    .where("type")
    .equals(type)
    .filter((q) => live(q) && q.active && q.id !== excludeId)
    .count()
  if (active >= cap.max) {
    throw new RepoError(cap.code, `Only ${cap.max} active ${type} quests allowed. Clear or archive one first.`)
  }
}

export const questRepo = {
  async get(id: string): Promise<Quest> {
    const q = await db.quests.get(id)
    if (!q || q.deleted) throw new RepoError("not-found", "Quest not found.")
    return q
  },

  async listActive(): Promise<Quest[]> {
    return db.quests.filter((q) => live(q) && q.active).toArray()
  },

  async listAll(): Promise<Quest[]> {
    return db.quests.filter(live).toArray()
  },

  async listByDungeon(dungeonId: string): Promise<Quest[]> {
    return db.quests.where("dungeonId").equals(dungeonId).filter(live).toArray()
  },

  async add(input: NewQuest): Promise<Quest> {
    return db.transaction("rw", db.quests, async () => {
      await assertCap(input.type)
      const quest: Quest = {
        ...stamp(nowIso()),
        ...input,
        streak: 0,
        bestStreak: 0,
        lastCompletedOn: null,
        active: true,
      }
      await db.quests.add(quest)
      return quest
    })
  },

  /** Patch any editable field. Re-checks caps if the quest is being (re)activated or retyped. */
  async update(id: string, patch: QuestPatch): Promise<Quest> {
    return db.transaction("rw", db.quests, async () => {
      const current = await questRepo.get(id)
      const next = touch({ ...current, ...patch }, nowIso())
      const activating = next.active && (!current.active || next.type !== current.type)
      if (activating) await assertCap(next.type, id)
      await db.quests.put(next)
      return next
    })
  },

  /** Persist engine-updated quests (streaks etc.) in one write. */
  async saveMany(quests: readonly Quest[]): Promise<void> {
    const now = nowIso()
    await db.quests.bulkPut(quests.map((q) => touch(q, now)))
  },

  async archive(id: string): Promise<Quest> {
    return questRepo.update(id, { active: false })
  },

  async remove(id: string): Promise<void> {
    const current = await questRepo.get(id)
    await db.quests.put(tombstone(current, nowIso()))
  },
}
