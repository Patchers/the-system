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
  }
}

export const db = new SystemDB()
