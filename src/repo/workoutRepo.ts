import { db } from "../db/schema"
import { stamp, tombstone } from "../db/record"
import type { Workout, WorkoutSet } from "../db/types"
import type { ExerciseSession } from "../engine/progression"
import { nowIso } from "../lib/date"
import { RepoError } from "./errors"

export type NewWorkout = Pick<Workout, "date" | "notes"> & Partial<Pick<Workout, "templateId">>
export type NewSet = Pick<WorkoutSet, "exerciseName"> &
  Partial<Pick<WorkoutSet, "reps" | "weightKg" | "distanceKm" | "durationMin">>

export interface WorkoutWithSets {
  workout: Workout
  sets: WorkoutSet[]
}

const live = (r: { deleted: 0 | 1 }) => !r.deleted

export const workoutRepo = {
  async get(id: string): Promise<WorkoutWithSets> {
    const workout = await db.workouts.get(id)
    if (!workout || workout.deleted) throw new RepoError("not-found", "Workout not found.")
    return { workout, sets: await workoutRepo.setsFor(id) }
  },

  /** Newest first. */
  async list(limit = 50): Promise<Workout[]> {
    return db.workouts.orderBy("date").reverse().filter(live).limit(limit).toArray()
  },

  async count(): Promise<number> {
    return db.workouts.filter(live).count()
  },

  async setsFor(workoutId: string): Promise<WorkoutSet[]> {
    return db.workoutSets.where("workoutId").equals(workoutId).filter(live).toArray()
  },

  /** Create a workout and its sets atomically. */
  async create(input: NewWorkout, sets: readonly NewSet[]): Promise<WorkoutWithSets> {
    const now = nowIso()
    const workout: Workout = { ...stamp(now), ...input }
    const rows: WorkoutSet[] = sets.map((s) => ({ ...stamp(now), workoutId: workout.id, ...s }))
    await db.transaction("rw", [db.workouts, db.workoutSets], async () => {
      await db.workouts.add(workout)
      await db.workoutSets.bulkAdd(rows)
    })
    return { workout, sets: rows }
  },

  async addSet(workoutId: string, set: NewSet): Promise<WorkoutSet> {
    const row: WorkoutSet = { ...stamp(nowIso()), workoutId, ...set }
    await db.workoutSets.add(row)
    return row
  },

  /**
   * Lift history per exercise name, oldest session first. Only sets with reps
   * count; a set with no weight is bodyweight (0 kg).
   */
  async liftHistory(names: readonly string[]): Promise<Map<string, ExerciseSession[]>> {
    const out = new Map<string, ExerciseSession[]>(names.map((n) => [n, []]))
    if (names.length === 0) return out
    const sets = await db.workoutSets.where("exerciseName").anyOf([...names]).filter(live).toArray()
    const ids = [...new Set(sets.map((s) => s.workoutId))]
    const workouts = (await db.workouts.bulkGet(ids))
      .filter((w): w is Workout => w !== undefined && !w.deleted)
      .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
    for (const w of workouts) {
      const mine = sets.filter((s) => s.workoutId === w.id && s.reps !== undefined)
      for (const name of names) {
        const lifts = mine.filter((s) => s.exerciseName === name)
        if (lifts.length > 0) out.get(name)!.push({ date: w.date, sets: lifts.map((s) => ({ reps: s.reps!, weightKg: s.weightKg ?? 0 })) })
      }
    }
    return out
  },

  /** Exercise names that have at least one weighted set, most recently used first. */
  async liftNames(): Promise<string[]> {
    const sets = await db.workoutSets.filter((s) => !s.deleted && s.reps !== undefined && (s.weightKg ?? 0) > 0).toArray()
    const latest = new Map<string, string>()
    for (const s of sets) if ((latest.get(s.exerciseName) ?? "") < s.createdAt) latest.set(s.exerciseName, s.createdAt)
    return [...latest].sort((a, b) => b[1].localeCompare(a[1])).map(([n]) => n)
  },

  /** Template id → when its most recent session was logged. */
  async lastUsedByTemplate(): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    const workouts = await db.workouts.filter((w) => !w.deleted && w.templateId !== undefined).toArray()
    for (const w of workouts) {
      const key = `${w.date}T${w.createdAt}`
      if ((out.get(w.templateId!) ?? "") < key) out.set(w.templateId!, key)
    }
    return out
  },

  async remove(id: string): Promise<void> {
    const now = nowIso()
    const { workout, sets } = await workoutRepo.get(id)
    await db.transaction("rw", [db.workouts, db.workoutSets], async () => {
      await db.workouts.put(tombstone(workout, now))
      await db.workoutSets.bulkPut(sets.map((s) => tombstone(s, now)))
    })
  },
}
