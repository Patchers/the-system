import { create } from "zustand"
import { newId } from "../lib/id"

export type PanelTone = "info" | "danger" | "success"

export interface PanelSpec {
  id: string
  title: string
  lines: string[]
  tone: PanelTone
  ping: boolean
}

export type PanelInput = Pick<PanelSpec, "title" | "lines"> & Partial<Pick<PanelSpec, "tone" | "ping">>

interface PanelState {
  /** Head of the queue is the visible panel. */
  queue: PanelSpec[]
  push: (panel: PanelInput) => void
  pushMany: (panels: PanelInput[]) => void
  dismiss: () => void
}

const toSpec = (p: PanelInput): PanelSpec => ({ id: newId(), tone: "info", ping: false, ...p })

/** UI-only: the SystemPanel queue. Events play in order, never stacked. */
export const usePanelStore = create<PanelState>((set) => ({
  queue: [],
  push: (panel) => set((s) => ({ queue: [...s.queue, toSpec(panel)] })),
  pushMany: (panels) => set((s) => ({ queue: [...s.queue, ...panels.map(toSpec)] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
}))
