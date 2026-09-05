import { db } from "../db/schema"
import type { SyncQueueEntry } from "../db/syncOutbox"

export const syncQueueRepo = {
  async list(limit = 200): Promise<SyncQueueEntry[]> {
    return db.syncQueue.limit(limit).toArray()
  },

  async count(): Promise<number> {
    return db.syncQueue.count()
  },

  /** Remove entries once they've been pushed successfully. */
  async clear(keys: readonly string[]): Promise<void> {
    await db.syncQueue.bulkDelete(keys as string[])
  },
}
