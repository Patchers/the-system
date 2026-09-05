import { beforeEach, describe, expect, it } from "vitest"
import { parseBackup } from "../db/backup"
import { bootstrap } from "../repo/bootstrap"
import { resetDb } from "../test/db"
import { exportBackup, importBackup } from "./backupRepo"
import { completionRepo } from "./completionRepo"
import { hunterRepo } from "./hunterRepo"
import { questRepo } from "./questRepo"

beforeEach(async () => {
  await resetDb()
  await bootstrap()
})

describe("export and import", () => {
  it("round-trips through JSON into an empty database", async () => {
    await questRepo.add({ title: "Extra", type: "habit", difficulty: "E", stat: "per" })
    await completionRepo.add({ questId: "q", date: "2026-09-05", xpAwarded: 10, statAwarded: 1 })
    const json = JSON.stringify(await exportBackup())

    await resetDb()
    expect(await questRepo.listAll()).toHaveLength(0)

    const summary = await importBackup(parseBackup(json))
    expect(summary.quests.added).toBe(4)
    expect(summary.hunter.added).toBe(1)
    expect(await questRepo.listAll()).toHaveLength(4)
    expect(await hunterRepo.get()).toMatchObject({ level: 1, rank: "E" })
  })

  it("preserves tombstones so deletions survive a restore", async () => {
    const q = await questRepo.add({ title: "Doomed", type: "habit", difficulty: "E", stat: "per" })
    await questRepo.remove(q.id)
    const backup = await exportBackup()
    expect(backup.data.quests.find((x) => x.id === q.id)?.deleted).toBe(1)

    await resetDb()
    await importBackup(backup)
    expect(await questRepo.listAll()).toHaveLength(3)
  })

  it("keeps the newer copy on both sides", async () => {
    const backup = await exportBackup()
    const hunter = await hunterRepo.get()
    await hunterRepo.save({ ...hunter, level: 40 })

    const summary = await importBackup(backup)
    expect(summary.hunter).toMatchObject({ added: 0, updated: 0, skipped: 1 })
    expect((await hunterRepo.get()).level).toBe(40)
  })

  it("applies a newer incoming record over an older local one", async () => {
    const hunter = await hunterRepo.get()
    const backup = await exportBackup()
    backup.data.hunter = [{ ...hunter, level: 77, updatedAt: "2099-01-01T00:00:00.000Z" }]
    await importBackup(backup)
    expect((await hunterRepo.get()).level).toBe(77)
  })
})
