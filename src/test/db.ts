import { db } from "../db/schema"

/** Wipe every store so each test starts from an empty database. */
export async function resetDb(): Promise<void> {
  await db.delete()
  await db.open()
}
