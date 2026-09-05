import { describe, expect, it } from "vitest"
import type { Completion } from "../db/types"
import { activeDays, dailySeries, heatmap, totalXp } from "./charts"

const c = (date: string, xpAwarded = 10, deleted: 0 | 1 = 0): Completion => ({
  id: `${date}-${xpAwarded}-${Math.random()}`,
  createdAt: "",
  updatedAt: "",
  deleted,
  questId: "q",
  date,
  xpAwarded,
  statAwarded: 0,
})

describe("dailySeries", () => {
  it("returns one row per day, ending on today, zero-filled", () => {
    const rows = dailySeries([c("2026-09-05", 50), c("2026-09-05", 25), c("2026-09-03", 10)], "2026-09-05", 7)
    expect(rows).toHaveLength(7)
    expect(rows[0].date).toBe("2026-08-30")
    expect(rows[6]).toMatchObject({ date: "2026-09-05", xp: 75, completions: 2 })
    expect(rows[4]).toMatchObject({ date: "2026-09-03", xp: 10, completions: 1 })
    expect(rows[5]).toMatchObject({ xp: 0, completions: 0 })
  })
  it("labels weekdays", () => {
    expect(dailySeries([], "2026-09-05", 1)[0].label).toBe("Sat")
  })
  it("ignores deleted and out-of-window rows", () => {
    const rows = dailySeries([c("2026-09-05", 50, 1), c("2026-01-01", 99)], "2026-09-05", 7)
    expect(rows.every((r) => r.xp === 0)).toBe(true)
  })
})

describe("heatmap", () => {
  it("pads the start so the grid begins on a Sunday", () => {
    const cells = heatmap([], "2026-09-05", 7) // window starts Sun 2026-08-30
    expect(cells).toHaveLength(7)
    expect(cells[0]?.date).toBe("2026-08-30")
    const midweek = heatmap([], "2026-09-05", 5) // window starts Tue 2026-09-01
    expect(midweek.slice(0, 2)).toEqual([null, null])
    expect(midweek[2]?.date).toBe("2026-09-01")
  })
  it("scales intensity against the busiest day", () => {
    const cells = heatmap([c("2026-09-05"), c("2026-09-05"), c("2026-09-05"), c("2026-09-05"), c("2026-09-04")], "2026-09-05", 7)
    const byDate = new Map(cells.filter(Boolean).map((x) => [x!.date, x!]))
    expect(byDate.get("2026-09-05")).toMatchObject({ count: 4, level: 4 })
    expect(byDate.get("2026-09-04")).toMatchObject({ count: 1, level: 1 })
    expect(byDate.get("2026-09-03")).toMatchObject({ count: 0, level: 0 })
  })
})

describe("totals", () => {
  it("sums XP and counts distinct active days, skipping deleted", () => {
    const rows = [c("2026-09-05", 50), c("2026-09-05", 25), c("2026-09-04", 10), c("2026-09-03", 99, 1)]
    expect(totalXp(rows)).toBe(85)
    expect(activeDays(rows)).toBe(2)
  })
})
