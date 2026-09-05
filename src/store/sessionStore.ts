import { create } from "zustand"
import type { TemplateExercise } from "../db/types"
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

interface SessionState {
  active: boolean
  templateId?: string
  templateName?: string
  plan: TemplateExercise[]
  sets: DraftSet[]
  start: (template?: { id: string; name: string; exercises: TemplateExercise[] }) => void
  addSet: (set: Omit<DraftSet, "key">) => void
  removeSet: (key: string) => void
  clear: () => void
}

const empty = { active: false, templateId: undefined, templateName: undefined, plan: [], sets: [] }

/** UI-only: the in-progress, unsaved training session. Survives tab switches. */
export const useSessionStore = create<SessionState>((set) => ({
  ...empty,
  start: (template) =>
    set({
      active: true,
      templateId: template?.id,
      templateName: template?.name,
      plan: template?.exercises ?? [],
      sets: [],
    }),
  addSet: (s) => set((st) => ({ sets: [...st.sets, { ...s, key: newId() }] })),
  removeSet: (key) => set((st) => ({ sets: st.sets.filter((s) => s.key !== key) })),
  clear: () => set(empty),
}))
