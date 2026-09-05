import { beforeEach, describe, expect, it } from "vitest"
import { xpToNext } from "../engine/xp"
import { bootstrap } from "../repo/bootstrap"
import { completionRepo } from "../repo/completionRepo"
import { RepoError } from "../repo/errors"
import { hunterRepo } from "../repo/hunterRepo"
import { questRepo } from "../repo/questRepo"
import { usePanelStore } from "../store/panelStore"
import { resetDb } from "../test/db"
import { completeQuest } from "./completeQuest"

beforeEach(async () => {
  await resetDb()
  usePanelStore.setState({ queue: [] })
  await bootstrap()
})

const firstDaily = async () => (await questRepo.listActive()).find((q) => q.title === "100 push-ups")!

describe("completeQuest", () => {
  it("records the completion, starts the streak and awards XP + tagged stat", async () => {
    const q = await firstDaily() // C, str, level 1: 50 * 1.1 * 1.02 = 56
    const r = await completeQuest(q.id)
    expect(r).toMatchObject({ xp: 56, statPoints: 1, stat: "str", streak: 1, levelsGained: [], recovered: false })
    const hunter = await hunterRepo.get()
    expect(hunter).toMatchObject({ xp: 56, str: 1, statPoints: 0 })
    const quest = await questRepo.get(q.id)
    expect(quest).toMatchObject({ streak: 1, bestStreak: 1 })
    expect(await completionRepo.countForQuestOn(q.id, quest.lastCompletedOn!)).toBe(1)
  })

  it("refuses a second daily completion in the same day", async () => {
    const q = await firstDaily()
    await completeQuest(q.id)
    await expect(completeQuest(q.id)).rejects.toMatchObject({ code: "already-done" })
    expect((await hunterRepo.get()).xp).toBe(56)
  })

  it("decays habit XP within a day", async () => {
    const h = await questRepo.add({ title: "Water", type: "habit", difficulty: "E", stat: "vit" })
    // E, level 1, streak 1: 10 * 1.1 * 1.02 = 11.22
    expect((await completeQuest(h.id)).xp).toBe(11)
    expect((await completeQuest(h.id)).xp).toBe(6)
    expect((await completeQuest(h.id)).xp).toBe(3)
    const fourth = await completeQuest(h.id)
    expect(fourth.xp).toBe(0)
    expect(fourth.statPoints).toBe(0)
  })

  it("deactivates a task once completed", async () => {
    const t = await questRepo.add({ title: "Ship it", type: "task", difficulty: "B", stat: "int" })
    await completeQuest(t.id)
    expect((await questRepo.get(t.id)).active).toBe(false)
    await expect(completeQuest(t.id)).rejects.toBeInstanceOf(RepoError)
  })

  it("queues one LEVEL UP panel per level gained", async () => {
    const hunter = await hunterRepo.get()
    await hunterRepo.save({ ...hunter, xp: xpToNext(1) - 1 })
    const q = await firstDaily()
    const r = await completeQuest(q.id)
    expect(r.levelsGained).toEqual([2])
    const titles = usePanelStore.getState().queue.map((p) => p.title)
    expect(titles).toEqual(["LEVEL UP"])
    expect((await hunterRepo.get()).level).toBe(2)
  })

  it("clears recovery mode and still awards the completion", async () => {
    const hunter = await hunterRepo.get()
    await hunterRepo.save({ ...hunter, hp: 0, recoveryMode: true })
    const q = await firstDaily()
    const r = await completeQuest(q.id)
    expect(r.recovered).toBe(true)
    expect(r.xp).toBeGreaterThan(0)
    expect((await hunterRepo.get()).recoveryMode).toBe(false)
    expect(usePanelStore.getState().queue[0]?.title).toBe("RECOVERY COMPLETE")
  })

  it("rolls back everything if a write fails", async () => {
    await expect(completeQuest("missing")).rejects.toMatchObject({ code: "not-found" })
    expect((await hunterRepo.get()).xp).toBe(0)
  })
})
