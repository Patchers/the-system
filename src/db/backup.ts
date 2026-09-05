/**
 * Backup shape and pure merge logic for JSON export/import.
 * Import is last-write-wins per record on `updatedAt`, so a restore never
 * silently drops newer local edits. Same rule a future Supabase sync will use.
 */
import type {
  Achievement,
  BaseRecord,
  Completion,
  Dungeon,
  Hunter,
  Nutrition,
  Quest,
  Settings,
  Template,
  Vitals,
  Workout,
  WorkoutSet,
} from "./types"

export const BACKUP_VERSION = 1

export interface BackupData {
  hunter: Hunter[]
  quests: Quest[]
  completions: Completion[]
  dungeons: Dungeon[]
  workouts: Workout[]
  workoutSets: WorkoutSet[]
  templates: Template[]
  nutrition: Nutrition[]
  vitals: Vitals[]
  achievements: Achievement[]
  settings: Settings[]
}

export interface Backup {
  format: "the-system-backup"
  version: number
  exportedAt: string
  data: BackupData
}

export const TABLE_NAMES = [
  "hunter",
  "quests",
  "completions",
  "dungeons",
  "workouts",
  "workoutSets",
  "templates",
  "nutrition",
  "vitals",
  "achievements",
  "settings",
] as const

export type TableName = (typeof TABLE_NAMES)[number]

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BackupError"
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

const looksLikeRecord = (v: unknown): v is BaseRecord =>
  isRecord(v) && typeof v.id === "string" && typeof v.updatedAt === "string" && (v.deleted === 0 || v.deleted === 1)

/** Parse and validate untrusted JSON into a Backup. Throws BackupError with a readable reason. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError("That file is not valid JSON.")
  }
  if (!isRecord(raw) || raw.format !== "the-system-backup") {
    throw new BackupError("That file is not a System backup.")
  }
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) {
    throw new BackupError(`Backup version ${String(raw.version)} is newer than this app understands.`)
  }
  if (!isRecord(raw.data)) throw new BackupError("The backup has no data.")

  const data = {} as BackupData
  for (const table of TABLE_NAMES) {
    const rows = raw.data[table]
    if (rows === undefined) {
      data[table] = [] as never
      continue
    }
    if (!Array.isArray(rows) || !rows.every(looksLikeRecord)) {
      throw new BackupError(`The "${table}" section is malformed.`)
    }
    data[table] = rows as never
  }
  return {
    format: "the-system-backup",
    version: raw.version,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    data,
  }
}

export interface MergeOutcome<T extends BaseRecord> {
  /** Rows to write: incoming records that are new or newer than the local copy. */
  toWrite: T[]
  added: number
  updated: number
  skipped: number
}

/** Last-write-wins merge of incoming rows over existing ones. Pure. */
export function mergeRecords<T extends BaseRecord>(existing: readonly T[], incoming: readonly T[]): MergeOutcome<T> {
  const byId = new Map(existing.map((r) => [r.id, r]))
  const outcome: MergeOutcome<T> = { toWrite: [], added: 0, updated: 0, skipped: 0 }
  for (const row of incoming) {
    const current = byId.get(row.id)
    if (!current) {
      outcome.toWrite.push(row)
      outcome.added++
    } else if (row.updatedAt > current.updatedAt) {
      outcome.toWrite.push(row)
      outcome.updated++
    } else {
      outcome.skipped++
    }
  }
  return outcome
}

export type ImportSummary = Record<TableName, Omit<MergeOutcome<BaseRecord>, "toWrite">>

/** Human-readable summary lines for the import panel. */
export function summariseImport(summary: ImportSummary): string[] {
  const lines: string[] = []
  let added = 0
  let updated = 0
  let skipped = 0
  for (const table of TABLE_NAMES) {
    const s = summary[table]
    added += s.added
    updated += s.updated
    skipped += s.skipped
  }
  lines.push(`${added} records added.`)
  lines.push(`${updated} records updated.`)
  if (skipped > 0) lines.push(`${skipped} kept (local copy was newer).`)
  return lines
}
