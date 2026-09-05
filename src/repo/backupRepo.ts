import { BACKUP_VERSION, TABLE_NAMES, mergeRecords, type Backup, type ImportSummary } from "../db/backup"
import { db } from "../db/schema"
import type { BaseRecord } from "../db/types"
import { nowIso } from "../lib/date"

/** Every row, tombstones included, so a restore preserves deletions. */
export async function exportBackup(): Promise<Backup> {
  const data = {} as Backup["data"]
  for (const table of TABLE_NAMES) {
    data[table] = (await db.table(table).toArray()) as never
  }
  return { format: "the-system-backup", version: BACKUP_VERSION, exportedAt: nowIso(), data }
}

/** Merge a backup into the current database, last-write-wins per record. */
export async function importBackup(backup: Backup): Promise<ImportSummary> {
  const summary = {} as ImportSummary
  await db.transaction("rw", db.tables, async () => {
    for (const table of TABLE_NAMES) {
      const existing = (await db.table(table).toArray()) as BaseRecord[]
      const outcome = mergeRecords(existing, backup.data[table] as BaseRecord[])
      if (outcome.toWrite.length > 0) await db.table(table).bulkPut(outcome.toWrite)
      summary[table] = { added: outcome.added, updated: outcome.updated, skipped: outcome.skipped }
    }
  })
  return summary
}
