/**
 * Drain the local outbox: batch pending records per table and upsert them
 * remotely. Entries only leave the queue once the server confirms the
 * write, so a dropped connection just means "try again next flush."
 */
import { TABLE_NAMES, type TableName } from "../db/backup"
import { db } from "../db/schema"
import { syncQueueRepo } from "../repo/syncQueueRepo"
import type { RemoteClient } from "./remoteClient"

export interface PushResult {
  pushed: number
  failed: number
  errors: string[]
}

export async function pushOutbox(client: RemoteClient, userId: string): Promise<PushResult> {
  const entries = await syncQueueRepo.list(2000)
  const result: PushResult = { pushed: 0, failed: 0, errors: [] }
  if (entries.length === 0) return result

  const idsByTable = new Map<TableName, string[]>()
  for (const entry of entries) {
    const ids = idsByTable.get(entry.table) ?? []
    ids.push(entry.recordId)
    idsByTable.set(entry.table, ids)
  }

  for (const table of TABLE_NAMES) {
    const ids = idsByTable.get(table)
    if (!ids) continue
    const keys = ids.map((id) => `${table}:${id}`)
    const rows = await db.table(table).bulkGet(ids)
    const present = rows.filter((r): r is NonNullable<typeof r> => r != null)

    if (present.length === 0) {
      // Nothing local to send (record was hard-removed some other way); drop the markers.
      await syncQueueRepo.clear(keys)
      continue
    }

    const { error } = await client.from(table).upsert(present.map((r) => ({ ...r, user_id: userId })))
    if (error) {
      result.failed += present.length
      result.errors.push(`${table}: ${error.message}`)
      continue // leave queued for the next flush
    }
    result.pushed += present.length
    await syncQueueRepo.clear(keys)
  }

  return result
}
