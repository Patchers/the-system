import { newId } from "../lib/id"
import type { BaseRecord } from "./types"

/** Fresh sync seam for a new record. */
export function stamp(now: string, id = newId()): BaseRecord {
  return { id, createdAt: now, updatedAt: now, deleted: 0 }
}

export function touch<T extends BaseRecord>(record: T, now: string): T {
  return { ...record, updatedAt: now }
}

/** Soft delete. Records are never removed from the store. */
export function tombstone<T extends BaseRecord>(record: T, now: string): T {
  return { ...record, deleted: 1, updatedAt: now }
}
