import { describe, expect, it } from "vitest"
import { nextTemplateId } from "./rotation"

const t = (id: string, createdAt: string) => ({ id, createdAt })
const days = [t("A", "1"), t("L", "2"), t("B", "3")]

describe("nextTemplateId", () => {
  it("starts with the first-created day", () => expect(nextTemplateId(days, new Map())).toBe("A"))

  it("moves to the next unused day", () => expect(nextTemplateId(days, new Map([["A", "2026-11-01T06:00"]]))).toBe("L"))

  it("cycles back to the least recently trained day", () => {
    const used = new Map([
      ["A", "2026-11-01T06:00"],
      ["L", "2026-11-03T06:00"],
      ["B", "2026-11-05T06:00"],
    ])
    expect(nextTemplateId(days, used)).toBe("A")
  })

  it("waits for a missed day instead of skipping it", () => {
    const used = new Map([
      ["A", "2026-11-10T06:00"],
      ["L", "2026-11-01T06:00"],
      ["B", "2026-11-03T06:00"],
    ])
    expect(nextTemplateId(days, used)).toBe("L")
  })

  it("returns undefined with no templates", () => expect(nextTemplateId([], new Map())).toBeUndefined())
})
