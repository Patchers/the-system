import { describe, expect, it } from "vitest"
import { addDays, dateRange, dayKeyFor, daysBetween, msUntilRollover, toDateKey } from "./date"

describe("dayKeyFor", () => {
  it("assigns 03:59 to the previous day", () => {
    expect(dayKeyFor(new Date(2026, 8, 6, 3, 59))).toBe("2026-09-05")
  })
  it("assigns 04:00 to the current day", () => {
    expect(dayKeyFor(new Date(2026, 8, 6, 4, 0))).toBe("2026-09-06")
  })
  it("crosses month boundaries", () => {
    expect(dayKeyFor(new Date(2026, 9, 1, 1, 0))).toBe("2026-09-30")
  })
  it("crosses year boundaries", () => {
    expect(dayKeyFor(new Date(2027, 0, 1, 2, 30))).toBe("2026-12-31")
  })
})

describe("date arithmetic", () => {
  it("toDateKey pads", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
  it("addDays handles month rollover", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })
  it("dateRange is inclusive-exclusive", () => {
    expect(dateRange("2026-09-01", "2026-09-04")).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"])
    expect(dateRange("2026-09-04", "2026-09-04")).toEqual([])
  })
  it("daysBetween", () => {
    expect(daysBetween("2026-09-01", "2026-09-08")).toBe(7)
  })
  it("msUntilRollover", () => {
    expect(msUntilRollover(new Date(2026, 8, 6, 3, 0))).toBe(3_600_000)
    expect(msUntilRollover(new Date(2026, 8, 6, 4, 0))).toBe(24 * 3_600_000)
  })
})
