import { beforeEach, describe, expect, it } from "vitest"
import { db } from "../db/schema"
import { resetDb } from "../test/db"
import { completionRepo } from "./completionRepo"

const add = (questId: string, date: string) => completionRepo.add({ questId, date, xpAwarded: 10, statAwarded: 1 })

beforeEach(resetDb)

describe("completionRepo", () => {
  it("counts completions per quest per day for habit decay", async () => {
    await add("q", "2026-09-05")
    await add("q", "2026-09-05")
    await add("q", "2026-09-04")
    await add("other", "2026-09-05")
    expect(await completionRepo.countForQuestOn("q", "2026-09-05")).toBe(2)
    expect(await completionRepo.countForQuestOn("q", "2026-09-06")).toBe(0)
  })

  it("lists since a date inclusive", async () => {
    await add("q", "2026-09-01")
    await add("q", "2026-09-03")
    await add("q", "2026-09-05")
    const since = await completionRepo.listSince("2026-09-03")
    expect(since.map((c) => c.date).sort()).toEqual(["2026-09-03", "2026-09-05"])
  })

  it("lists between two dates inclusive", async () => {
    await add("q", "2026-09-01")
    await add("q", "2026-09-03")
    await add("q", "2026-09-05")
    const rows = await completionRepo.listBetween("2026-09-01", "2026-09-03")
    expect(rows.map((c) => c.date).sort()).toEqual(["2026-09-01", "2026-09-03"])
  })

  it("hides soft-deleted completions", async () => {
    const c = await add("q", "2026-09-05")
    await db.completions.put({ ...c, deleted: 1 })
    expect(await completionRepo.listForDate("2026-09-05")).toHaveLength(0)
    expect(await completionRepo.countForQuestOn("q", "2026-09-05")).toBe(0)
  })
})
