import { db } from "../db/schema"
import { stamp, tombstone } from "../db/record"
import type { Workout, WorkoutSet } from "../db/types"
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

  async remove(id: string): Promise<void> {
    const now = nowIso()
    const { workout, sets } = await workoutRepo.get(id)
    await db.transaction("rw", [db.workouts, db.workoutSets], async () => {
      await db.workouts.put(tombstone(workout, now))
      await db.workoutSets.bulkPut(sets.map((s) => tombstone(s, now)))
    })
  },
}
