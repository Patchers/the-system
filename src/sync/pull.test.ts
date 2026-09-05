import { beforeEach, describe, expect, it } from "vitest"
import { dungeonRepo } from "../repo/dungeonRepo"
import { resetDb } from "../test/db"
import { pullAll } from "./pull"
import type { RemoteClient } from "./remoteClient"

beforeEach(resetDb)

const row = (id: string, updatedAt: string, name: string) => ({
  id,
  user_id: "u1",
  createdAt: updatedAt,
  updatedAt,
  deleted: 0 as const,
  name,
  description: "",
  bossName: "",
  deadline: "2026-12-01",
  status: "active" as const,
})

function fakeClient(byTable: Record<string, unknown[]>): RemoteClient {
  return {
    from: (table) => ({
      select: async () => ({ data: byTable[table] ?? [], error: null }),
      upsert: async () => ({ error: null }),
    }),
  }
}

describe("pullAll", () => {
  it("adds remote rows that do not exist locally", async () => {
    const client = fakeClient({ dungeons: [row("r1", "2026-09-01T00:00:00.000Z", "Remote Gate")] })
    const r = await pullAll(client)
    expect(r.added).toBeGreaterThanOrEqual(1)
    const local = await dungeonRepo.list()
    expect(local.map((d) => d.name)).toContain("Remote Gate")
  })

  it("updates a local record when the remote copy is newer", async () => {
    const d = await dungeonRepo.add({ name: "Local", description: "", bossName: "", deadline: "2026-12-01" })
    const client = fakeClient({ dungeons: [row(d.id, "2099-01-01T00:00:00.000Z", "Renamed remotely")] })
    await pullAll(client)
    expect((await dungeonRepo.get(d.id)).name).toBe("Renamed remotely")
  })

  it("keeps the local copy when it is newer, and reports it as neither added nor updated", async () => {
    const d = await dungeonRepo.add({ name: "Local wins", description: "", bossName: "", deadline: "2026-12-01" })
    const client = fakeClient({ dungeons: [row(d.id, "2000-01-01T00:00:00.000Z", "Stale remote")] })
    const r = await pullAll(client)
    expect((await dungeonRepo.get(d.id)).name).toBe("Local wins")
    expect(r.added).toBe(0)
  })

  it("collects a per-table error without aborting the other tables", async () => {
    const client: RemoteClient = {
      from: (table) => ({
        select: async () => (table === "dungeons" ? { data: null, error: { message: "boom" } } : { data: [], error: null }),
        upsert: async () => ({ error: null }),
      }),
    }
    const r = await pullAll(client)
    expect(r.errors).toEqual(["dungeons: boom"])
  })
})
