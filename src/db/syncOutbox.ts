/**
 * Dexie middleware that watches every write to every syncable table and
 * records "table:id" in the syncQueue table. This is the ONLY place that
 * knows sync exists — repo files never call anything sync-related, so
 * "no component touches Dexie directly" still holds and every future
 * repo write is covered automatically, with nothing to remember to wire up.
 *
 * The queue write happens outside the triggering write's own transaction
 * (via Dexie.ignoreTransaction) because syncQueue is never part of that
 * transaction's auto-detected scope, and joining it would throw.
 */
import Dexie, { type DBCore, type DBCoreMutateRequest, type Middleware } from "dexie"
import { TABLE_NAMES, type TableName } from "./backup"

export interface SyncQueueEntry {
  /** `${table}:${recordId}` — collapses repeat writes to one pending entry. */
  key: string
  table: TableName
  recordId: string
  queuedAt: string
}

const SYNCABLE = new Set<string>(TABLE_NAMES)

function affectedIds(req: DBCoreMutateRequest): string[] {
  if (req.type === "delete") return req.keys.map(String)
  if (req.type === "deleteRange") return [] // this app never hard-deletes a range
  return req.values.map((v) => (v as { id: string }).id)
}

/** Queue writer, injected from schema.ts so this module never imports the db instance itself. */
export type Enqueue = (table: TableName, ids: readonly string[]) => void

export function createSyncOutboxMiddleware(enqueue: Enqueue): Middleware<DBCore> {
  return {
    stack: "dbcore",
    name: "sync-outbox",
    level: 1,
    create(downlevelDatabase) {
      return {
        ...downlevelDatabase,
        table(tableName) {
          const downlevelTable = downlevelDatabase.table(tableName)
          if (!SYNCABLE.has(tableName)) return downlevelTable
          return {
            ...downlevelTable,
            mutate: async (req) => {
              const res = await downlevelTable.mutate(req)
              const ids = affectedIds(req)
              if (ids.length > 0) {
                // Outside the ambient transaction: syncQueue was never part of its scope.
                Dexie.ignoreTransaction(() => enqueue(tableName as TableName, ids))
              }
              return res
            },
          }
        },
      }
    },
  }
}
