import { describe, expect, it } from "vitest"
import type { BaseRecord } from "./types"
import { BackupError, mergeRecords, parseBackup, summariseImport, TABLE_NAMES, type ImportSummary } from "./backup"

const rec = (id: string, updatedAt: string): BaseRecord => ({ id, createdAt: "2026-01-01", updatedAt, deleted: 0 })

const validBackup = JSON.stringify({
  format: "the-system-backup",
  version: 1,
  exportedAt: "2026-09-05T10:00:00.000Z",
  data: { quests: [rec("q1", "2026-09-05")] },
})

describe("parseBackup", () => {
  it("accepts a valid backup and zero-fills missing tables", () => {
    const b = parseBackup(validBackup)
    expect(b.data.quests).toHaveLength(1)
    expect(b.data.completions).toEqual([])
    expect(TABLE_NAMES.every((t) => Array.isArray(b.data[t]))).toBe(true)
  })
  it("rejects non-JSON", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError)
  })
  it("rejects a foreign file", () => {
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow(/not a System backup/)
  })
  it("rejects a newer format version", () => {
    expect(() => parseBackup(JSON.stringify({ format: "the-system-backup", version: 99, data: {} }))).toThrow(/newer than/)
  })
  it("rejects malformed rows", () => {
    const bad = JSON.stringify({ format: "the-system-backup", version: 1, data: { quests: [{ nope: true }] } })
    expect(() => parseBackup(bad)).toThrow(/malformed/)
  })
})

describe("mergeRecords", () => {
  it("adds records that do not exist locally", () => {
    const r = mergeRecords([], [rec("a", "2026-09-01")])
    expect(r).toMatchObject({ added: 1, updated: 0, skipped: 0 })
    expect(r.toWrite).toHaveLength(1)
  })
  it("updates when the incoming record is newer", () => {
    const r = mergeRecords([rec("a", "2026-09-01")], [rec("a", "2026-09-05")])
    expect(r).toMatchObject({ added: 0, updated: 1, skipped: 0 })
  })
  it("keeps the local copy when it is newer or equal", () => {
    expect(mergeRecords([rec("a", "2026-09-05")], [rec("a", "2026-09-01")])).toMatchObject({ skipped: 1 })
    expect(mergeRecords([rec("a", "2026-09-05")], [rec("a", "2026-09-05")])).toMatchObject({ skipped: 1 })
  })
  it("handles a mixed batch", () => {
    const r = mergeRecords([rec("a", "2026-09-05"), rec("b", "2026-09-01")], [rec("a", "2026-09-01"), rec("b", "2026-09-05"), rec("c", "2026-09-05")])
    expect(r).toMatchObject({ added: 1, updated: 1, skipped: 1 })
    expect(r.toWrite.map((x) => x.id).sort()).toEqual(["b", "c"])
  })
})

describe("summariseImport", () => {
  it("totals across tables and hides a zero skip count", () => {
    const empty = { added: 0, updated: 0, skipped: 0 }
    const summary = Object.fromEntries(TABLE_NAMES.map((t) => [t, { ...empty }])) as ImportSummary
    summary.quests = { added: 3, updated: 1, skipped: 0 }
    summary.completions = { added: 10, updated: 0, skipped: 2 }
    expect(summariseImport(summary)).toEqual(["13 records added.", "1 records updated.", "2 kept (local copy was newer)."])
    summary.completions.skipped = 0
    expect(summariseImport(summary)).toHaveLength(2)
  })
})
