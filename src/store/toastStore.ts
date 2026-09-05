import { create } from "zustand"

interface ToastState {
  message: string | null
  show: (message: string, ms?: number) => void
  clear: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

/** UI-only: a single transient line for small feedback like "+56 XP". */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message, ms = 2200) => {
    clearTimeout(timer)
    set({ message })
    timer = setTimeout(() => set({ message: null }), ms)
  },
  clear: () => {
    clearTimeout(timer)
    set({ message: null })
  },
}))
