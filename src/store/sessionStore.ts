import { create } from "zustand"
import type { TemplateExercise } from "../db/types"
import type { Target } from "../engine/progression"
import { newId } from "../lib/id"

export type SetKind = "lift" | "cardio" | "timed"

export interface DraftSet {
  key: string
  exerciseName: string
  kind: SetKind
  reps?: number
  weightKg?: number
  distanceKm?: number
  durationMin?: number
}

export interface RestState {
  /** Epoch ms when the rest period ends. */
  endsAt: number
  totalSec: number
}

interface SessionState {
  active: boolean
  templateId?: string
  templateName?: string
  plan: TemplateExercise[]
  /** Today's targets by exercise name, including swap options. */
  targets: Record<string, Target>
  /** Exercise the set editor is on. */
  current: string
  sets: DraftSet[]
  rest: RestState | null
  start: (template?: { id: string; name: string; exercises: TemplateExercise[] }, targets?: Record<string, Target>) => void
  select: (name: string) => void
  /** Replace the plan entry at `index` with one of its alternatives for this session. */
  swap: (index: number, name: string) => void
  addSet: (set: Omit<DraftSet, "key">) => void
  removeSet: (key: string) => void
  startRest: (sec: number) => void
  extendRest: (sec: number) => void
  clearRest: () => void
  clear: () => void
}

const empty = {
  active: false,
  templateId: undefined,
  templateName: undefined,
  plan: [],
  targets: {},
  current: "",
  sets: [],
  rest: null,
}

/** UI-only: the in-progress, unsaved training session. Survives tab switches. */
export const useSessionStore = create<SessionState>((set) => ({
  ...empty,
  start: (template, targets = {}) =>
    set({
      ...empty,
      active: true,
      templateId: template?.id,
      templateName: template?.name,
      plan: template?.exercises ?? [],
      targets,
      current: template?.exercises[0]?.name ?? "",
    }),
  select: (name) => set({ current: name }),
  swap: (index, name) =>
    set((st) => {
      const old = st.plan[index]
      if (!old) return st
      const alternatives = [old.name, ...(old.alternatives ?? []).filter((a) => a !== name)]
      const plan = st.plan.map((e, i) => (i === index ? { ...e, name, alternatives, startWeightKg: undefined } : e))
      return { plan, current: st.current === old.name ? name : st.current }
    }),
  addSet: (s) => set((st) => ({ sets: [...st.sets, { ...s, key: newId() }] })),
  removeSet: (key) => set((st) => ({ sets: st.sets.filter((s) => s.key !== key) })),
  startRest: (sec) => set({ rest: { endsAt: Date.now() + sec * 1000, totalSec: sec } }),
  extendRest: (sec) => set((st) => (st.rest ? { rest: { endsAt: st.rest.endsAt + sec * 1000, totalSec: st.rest.totalSec + sec } } : st)),
  clearRest: () => set({ rest: null }),
  clear: () => set(empty),
}))
