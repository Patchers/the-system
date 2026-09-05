/**
 * Full pull, one table at a time, merged into Dexie with the same
 * last-write-wins rule the JSON backup import uses. Simple and correct at
 * personal-hunter scale; the realtime channel is what keeps this from being
 * the only way changes travel between devices.
 */
import { mergeRecords, TABLE_NAMES } from "../db/backup"
import { db } from "../db/schema"
import type { BaseRecord } from "../db/types"
import type { RemoteClient } from "./remoteClient"

export interface PullResult {
  added: number
  updated: number
  errors: string[]
}

export async function pullAll(client: RemoteClient): Promise<PullResult> {
  const result: PullResult = { added: 0, updated: 0, errors: [] }

  for (const table of TABLE_NAMES) {
    const { data, error } = await client.from(table).select("*")
    if (error) {
      result.errors.push(`${table}: ${error.message}`)
      continue
    }
    const remote = (data ?? []) as BaseRecord[]
    const existing = (await db.table(table).toArray()) as BaseRecord[]
    const outcome = mergeRecords(existing, remote)
    if (outcome.toWrite.length > 0) await db.table(table).bulkPut(outcome.toWrite)
    result.added += outcome.added
    result.updated += outcome.updated
  }

  return result
}
