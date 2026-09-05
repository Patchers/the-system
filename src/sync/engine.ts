/**
 * Ties push, pull and realtime together. This is the only file that talks
 * to the live Supabase client directly; everything else in src/sync is
 * plain logic tested against a fake client.
 */
import type { RealtimeChannel } from "@supabase/supabase-js"
import { mergeRecords, TABLE_NAMES, type TableName } from "../db/backup"
import { db } from "../db/schema"
import type { BaseRecord } from "../db/types"
import { supabase } from "../lib/supabaseClient"
import { pullAll } from "./pull"
import { pushOutbox } from "./push"

const FLUSH_INTERVAL_MS = 25_000

let timer: ReturnType<typeof setInterval> | null = null
let channel: RealtimeChannel | null = null
let activeUserId: string | null = null

async function mergeIncomingRow(table: TableName, row: BaseRecord): Promise<void> {
  const existing = (await db.table(table).get(row.id)) as BaseRecord | undefined
  const outcome = mergeRecords(existing ? [existing] : [], [row])
  if (outcome.toWrite.length > 0) await db.table(table).put(outcome.toWrite[0])
}

function subscribeRealtime(userId: string): RealtimeChannel {
  const ch = supabase!.channel(`system-sync-${userId}`)
  for (const table of TABLE_NAMES) {
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as BaseRecord | undefined
        if (row?.id) void mergeIncomingRow(table, row)
      },
    )
  }
  ch.subscribe()
  return ch
}

/** Start syncing for a signed-in user: one full pull+push, then realtime plus a periodic safety-net flush. */
export async function startSync(userId: string): Promise<void> {
  if (!supabase || activeUserId === userId) return
  stopSync()
  activeUserId = userId

  await pullAll(supabase)
  await pushOutbox(supabase, userId)

  channel = subscribeRealtime(userId)
  timer = setInterval(() => {
    if (!supabase) return
    void pushOutbox(supabase, userId)
    void pullAll(supabase)
  }, FLUSH_INTERVAL_MS)
}

/** Stop syncing, e.g. on sign-out. Safe to call when nothing is running. */
export function stopSync(): void {
  if (timer) clearInterval(timer)
  timer = null
  if (channel) void channel.unsubscribe()
  channel = null
  activeUserId = null
}
