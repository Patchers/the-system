import Dexie, { type EntityTable } from "dexie"
import type {
  Achievement,
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
import { createSyncOutboxMiddleware, type SyncQueueEntry } from "./syncOutbox"

/**
 * Dexie database. Only `src/repo/*` may import this. Components never do.
 *
 * Index strings list the primary key first, then secondary indexes.
 * `&` marks a unique index, `[a+b]` a compound index. Booleans cannot be
 * indexed in IndexedDB, so `active` and `recoveryMode` are filtered in code.
 */
export class SystemDB extends Dexie {
  hunter!: EntityTable<Hunter, "id">
  quests!: EntityTable<Quest, "id">
  completions!: EntityTable<Completion, "id">
  dungeons!: EntityTable<Dungeon, "id">
  workouts!: EntityTable<Workout, "id">
  workoutSets!: EntityTable<WorkoutSet, "id">
  templates!: EntityTable<Template, "id">
  nutrition!: EntityTable<Nutrition, "id">
  vitals!: EntityTable<Vitals, "id">
  achievements!: EntityTable<Achievement, "id">
  settings!: EntityTable<Settings, "id">
  /** Pending cloud pushes. Populated automatically by sync-outbox middleware below. */
  syncQueue!: EntityTable<SyncQueueEntry, "key">

  constructor(name = "the-system") {
    super(name)
    this.version(1).stores({
      hunter: "id, deleted",
      quests: "id, type, dungeonId, deleted",
      completions: "id, questId, date, deleted, [questId+date]",
      dungeons: "id, status, deadline, deleted",
      workouts: "id, date, templateId, deleted",
      workoutSets: "id, workoutId, exerciseName, deleted",
      templates: "id, deleted",
      nutrition: "id, &date, deleted",
      vitals: "id, &date, deleted",
      achievements: "id, &code, deleted",
      settings: "id",
    })
    // Additive: existing installs upgrade in place, no data loss.
    this.version(2).stores({ syncQueue: "key, table" })

    // Every write to a syncable table drops a "table:id" marker here. The
    // sync engine (added once cloud credentials exist) drains this queue;
    // until then it just grows harmlessly unread.
    this.use(
      createSyncOutboxMiddleware((table, ids) => {
        const now = new Date().toISOString()
        void this.table("syncQueue").bulkPut(
          ids.map((id) => ({ key: `${table}:${id}`, table, recordId: id, queuedAt: now })),
        )
      }),
    )
  }
}

export const db = new SystemDB()
