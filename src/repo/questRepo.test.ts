import { beforeEach, describe, expect, it } from "vitest"
import { db } from "../db/schema"
import { resetDb } from "../test/db"
import { RepoError } from "./errors"
import { questRepo } from "./questRepo"

const daily = (n: number) => questRepo.add({ title: `d${n}`, type: "daily", difficulty: "C", stat: "str" })
const task = (n: number) => questRepo.add({ title: `t${n}`, type: "task", difficulty: "C", stat: "int" })
const habit = (n: number) => questRepo.add({ title: `h${n}`, type: "habit", difficulty: "E", stat: "per" })

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toBeInstanceOf(RepoError)
  await p.catch((e: RepoError) => expect(e.code).toBe(code))
}

beforeEach(resetDb)

describe("questRepo caps", () => {
  it("allows 3 active dailies and rejects the 4th", async () => {
    await daily(1)
    await daily(2)
    await daily(3)
    await expectCode(daily(4), "daily-cap")
    expect((await questRepo.listActive()).filter((q) => q.type === "daily")).toHaveLength(3)
  })

  it("allows 8 active tasks and rejects the 9th", async () => {
    for (let i = 1; i <= 8; i++) await task(i)
    await expectCode(task(9), "task-cap")
  })

  it("does not cap habits", async () => {
    for (let i = 1; i <= 12; i++) await habit(i)
    expect(await questRepo.listActive()).toHaveLength(12)
  })

  it("frees a slot when a daily is archived, and re-checks the cap on reactivation", async () => {
    const a = await daily(1)
    await daily(2)
    await daily(3)
    await questRepo.archive(a.id)
    const d4 = await daily(4)
    expect(d4.active).toBe(true)
    await expectCode(questRepo.update(a.id, { active: true }), "daily-cap")
  })

  it("frees a slot when a daily is removed", async () => {
    const a = await daily(1)
    await daily(2)
    await daily(3)
    await questRepo.remove(a.id)
    await expect(daily(4)).resolves.toMatchObject({ title: "d4" })
  })

  it("re-checks the cap when a quest changes type into a full bucket", async () => {
    await daily(1)
    await daily(2)
    await daily(3)
    const t = await task(1)
    await expectCode(questRepo.update(t.id, { type: "daily" }), "daily-cap")
  })
})

describe("questRepo records", () => {
  it("adds with a full sync seam and zeroed streaks", async () => {
    const q = await daily(1)
    expect(q.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(q.createdAt).toBe(q.updatedAt)
    expect(q).toMatchObject({ deleted: 0, streak: 0, bestStreak: 0, lastCompletedOn: null, active: true })
  })

  it("soft-deletes: row stays in the store, hidden from reads", async () => {
    const q = await daily(1)
    await questRepo.remove(q.id)
    expect(await questRepo.listAll()).toHaveLength(0)
    const raw = await db.quests.get(q.id)
    expect(raw?.deleted).toBe(1)
    await expectCode(questRepo.get(q.id), "not-found")
  })

  it("update stamps updatedAt and keeps createdAt", async () => {
    const q = await daily(1)
    const next = await questRepo.update(q.id, { title: "renamed" })
    expect(next.title).toBe("renamed")
    expect(next.createdAt).toBe(q.createdAt)
    expect(next.updatedAt >= q.updatedAt).toBe(true)
  })

  it("lists by dungeon", async () => {
    await questRepo.add({ title: "x", type: "task", difficulty: "B", stat: "vit", dungeonId: "dg" })
    await task(2)
    expect(await questRepo.listByDungeon("dg")).toHaveLength(1)
  })
})
