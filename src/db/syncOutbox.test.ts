import { beforeEach, describe, expect, it } from "vitest"
import { resetDb } from "../test/db"
import { dungeonRepo } from "../repo/dungeonRepo"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { syncQueueRepo } from "../repo/syncQueueRepo"
import { workoutRepo } from "../repo/workoutRepo"
import { bootstrap } from "../repo/bootstrap"

beforeEach(resetDb)

const keysFor = async () => (await syncQueueRepo.list()).map((e) => e.key).sort()

describe("sync outbox middleware", () => {
  it("queues every record from a seeded bulkAdd, across different tables", async () => {
    const { hunter } = await bootstrap()
    const quests = await questRepo.listActive()
    const keys = await keysFor()
    expect(keys).toContain(`hunter:${hunter.id}`)
    expect(keys).toContain(`settings:singleton`)
    for (const q of quests) expect(keys).toContain(`quests:${q.id}`)
  })

  it("queues a single add()", async () => {
    const d = await dungeonRepo.add({ name: "Gate", description: "", bossName: "", deadline: "2026-12-01" })
    expect(await keysFor()).toContain(`dungeons:${d.id}`)
  })

  it("collapses repeat writes to the same record into one entry", async () => {
    const { hunter } = await bootstrap()
    await hunterRepo.save({ ...hunter, level: 2 })
    await hunterRepo.save({ ...hunter, level: 3 })
    const entries = await syncQueueRepo.list()
    expect(entries.filter((e) => e.key === `hunter:${hunter.id}`)).toHaveLength(1)
  })

  it("queues writes made inside an explicit multi-table transaction", async () => {
    await bootstrap()
    const { workout, sets } = await workoutRepo.create({ date: "2026-09-05", notes: "" }, [
      { exerciseName: "Squat", reps: 5, weightKg: 100 },
    ])
    const keys = await keysFor()
    expect(keys).toContain(`workouts:${workout.id}`)
    expect(keys).toContain(`workoutSets:${sets[0].id}`)
  })

  it("queues a soft delete (tombstone put) the same as any other write", async () => {
    const d = await dungeonRepo.add({ name: "Gate", description: "", bossName: "", deadline: "2026-12-01" })
    await syncQueueRepo.clear([`dungeons:${d.id}`])
    await dungeonRepo.remove(d.id)
    expect(await keysFor()).toContain(`dungeons:${d.id}`)
  })

  it("clear() removes only the given keys", async () => {
    const a = await dungeonRepo.add({ name: "A", description: "", bossName: "", deadline: "2026-12-01" })
    const b = await dungeonRepo.add({ name: "B", description: "", bossName: "", deadline: "2026-12-01" })
    await syncQueueRepo.clear([`dungeons:${a.id}`])
    const keys = await keysFor()
    expect(keys).not.toContain(`dungeons:${a.id}`)
    expect(keys).toContain(`dungeons:${b.id}`)
  })

  it("never queues itself", async () => {
    await bootstrap()
    expect(await keysFor()).not.toEqual(expect.arrayContaining([expect.stringContaining("syncQueue:")]))
  })
})
