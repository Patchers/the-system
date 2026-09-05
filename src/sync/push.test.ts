import { beforeEach, describe, expect, it } from "vitest"
import { dungeonRepo } from "../repo/dungeonRepo"
import { syncQueueRepo } from "../repo/syncQueueRepo"
import { resetDb } from "../test/db"
import { pushOutbox } from "./push"
import type { RemoteClient, RemoteTable } from "./remoteClient"

beforeEach(resetDb)

function fakeClient(behaviour: Partial<Record<string, RemoteTable>> = {}): { client: RemoteClient; calls: unknown[][] } {
  const calls: unknown[][] = []
  const client: RemoteClient = {
    from: (table) => ({
      select: async () => ({ data: [], error: null }),
      upsert: async (rows) => {
        calls.push([table, rows])
        return behaviour[table] ? await behaviour[table]!.upsert(rows) : { error: null }
      },
    }),
  }
  return { client, calls }
}

describe("pushOutbox", () => {
  it("does nothing when the queue is empty", async () => {
    const { client, calls } = fakeClient()
    const r = await pushOutbox(client, "u1")
    expect(r).toEqual({ pushed: 0, failed: 0, errors: [] })
    expect(calls).toEqual([])
  })

  it("batches every pending record per table into one upsert call, tagged with user_id", async () => {
    await dungeonRepo.add({ name: "A", description: "", bossName: "", deadline: "2026-12-01" })
    await dungeonRepo.add({ name: "B", description: "", bossName: "", deadline: "2026-12-01" })
    const { client, calls } = fakeClient()

    const r = await pushOutbox(client, "user-123")

    expect(r).toMatchObject({ pushed: 2, failed: 0 })
    expect(calls).toHaveLength(1) // one call for the "dungeons" table
    const [table, rows] = calls[0] as [string, { name: string; user_id: string }[]]
    expect(table).toBe("dungeons")
    expect(rows.map((x) => x.name).sort()).toEqual(["A", "B"])
    expect(rows.every((x) => x.user_id === "user-123")).toBe(true)
  })

  it("clears the queue only for tables that actually pushed", async () => {
    await dungeonRepo.add({ name: "A", description: "", bossName: "", deadline: "2026-12-01" })
    const { client } = fakeClient()
    await pushOutbox(client, "u1")
    expect(await syncQueueRepo.count()).toBe(0)
  })

  it("leaves failed entries queued for the next flush", async () => {
    await dungeonRepo.add({ name: "A", description: "", bossName: "", deadline: "2026-12-01" })
    const { client } = fakeClient({ dungeons: { select: async () => ({ data: [], error: null }), upsert: async () => ({ error: { message: "network down" } }) } })

    const r = await pushOutbox(client, "u1")

    expect(r).toMatchObject({ pushed: 0, failed: 1, errors: ["dungeons: network down"] })
    expect(await syncQueueRepo.count()).toBe(1)
  })

  it("drops a queue entry whose local record no longer exists", async () => {
    const d = await dungeonRepo.add({ name: "Gone", description: "", bossName: "", deadline: "2026-12-01" })
    const { db } = await import("../db/schema")
    await db.dungeons.delete(d.id) // hard-remove, bypassing the repo, to simulate a stale marker
    const { client, calls } = fakeClient()

    const r = await pushOutbox(client, "u1")

    expect(r).toEqual({ pushed: 0, failed: 0, errors: [] })
    expect(calls).toEqual([])
    expect(await syncQueueRepo.count()).toBe(0)
  })
})
