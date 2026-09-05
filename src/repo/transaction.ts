import { db } from "../db/schema"

/** Run several repo calls atomically. The only transaction entry point outside the repos themselves. */
export function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  return db.transaction("rw", db.tables, work)
}
