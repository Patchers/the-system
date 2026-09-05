import { beforeEach, describe, expect, it } from "vitest"
import { PENALTY_HP } from "../engine/constants"
import { addDays, todayKey } from "../lib/date"
import { bootstrap } from "../repo/bootstrap"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { settingsRepo } from "../repo/settingsRepo"
import { usePanelStore } from "../store/panelStore"
import { resetDb } from "../test/db"
import { completeQuest } from "./completeQuest"
import { settlePenalties } from "./settlePenalties"

const today = todayKey()

beforeEach(async () => {
  await resetDb()
  usePanelStore.setState({ queue: [] })
  await bootstrap()
})

const lastSeen = async (daysAgo: number) => {
  const h = await hunterRepo.get()
  await hunterRepo.save({ ...h, lastSeenDate: addDays(today, -daysAgo) })
}

describe("settlePenalties", () => {
  it("does nothing on the same day", async () => {
    expect(await settlePenalties()).toBeNull()
    expect(usePanelStore.getState().queue).toHaveLength(0)
  })

  it("settles missed days into one panel and moves lastSeenDate to today", async () => {
    await lastSeen(2)
    const quests = await questRepo.listActive()
    await questRepo.saveMany(quests.map((q) => ({ ...q, streak: 5, lastCompletedOn: addDays(today, -3) })))

    const r = await settlePenalties()
    expect(r?.misses).toHaveLength(6) // 2 days x 3 dailies
    const hunter = await hunterRepo.get()
    expect(hunter.lastSeenDate).toBe(today)
    expect(hunter.hp).toBe(0)
    expect(hunter.recoveryMode).toBe(true)
    expect((await questRepo.listActive()).every((q) => q.streak === 0)).toBe(true)

    const queue = usePanelStore.getState().queue
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ title: "⚠ SYSTEM PENALTY", tone: "danger" })
    expect(queue[0].lines[0]).toBe("2 days with missed daily quests.")
  })

  it("is idempotent: a second call the same day changes nothing", async () => {
    await lastSeen(1)
    await settlePenalties()
    const after = await hunterRepo.get()
    expect(await settlePenalties()).toBeNull()
    expect(await hunterRepo.get()).toEqual(after)
    expect(usePanelStore.getState().queue).toHaveLength(1)
  })

  it("respects the penaltyEnabled setting but still stamps lastSeenDate", async () => {
    await settingsRepo.update({ penaltyEnabled: false })
    await lastSeen(3)
    await settlePenalties()
    const hunter = await hunterRepo.get()
    expect(hunter).toMatchObject({ hp: 100, lastSeenDate: today })
    expect(usePanelStore.getState().queue).toHaveLength(0)
  })

  it("exempts dailies completed on the missed day and gives the active-day HP bonus", async () => {
    // Complete one daily "yesterday" by completing today then rewinding the clock on the records.
    const quests = await questRepo.listActive()
    const target = quests.find((q) => q.title === "100 push-ups")!
    await completeQuest(target.id)
    const h = await hunterRepo.get()
    await hunterRepo.save({ ...h, hp: 100, lastSeenDate: addDays(today, -1) })
    await questRepo.saveMany([{ ...(await questRepo.get(target.id)), lastCompletedOn: addDays(today, -1) }])
    // Move today's completion back a day (only the date matters to the engine).
    const { db } = await import("../db/schema")
    await db.completions.toCollection().modify({ date: addDays(today, -1) })

    const r = await settlePenalties()
    expect(r?.misses.map((m) => m.title).sort()).toEqual(["10 km run", "Read 30 minutes"])
    expect(r?.hpLost).toBe(PENALTY_HP * 2)
    expect(r?.hpRecovered).toBe(10)
    expect((await questRepo.get(target.id)).streak).toBe(1)
  })
})
