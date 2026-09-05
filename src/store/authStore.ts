import type { User } from "@supabase/supabase-js"
import { create } from "zustand"

export type AuthStatus = "loading" | "signedOut" | "signedIn"

interface AuthState {
  user: User | null
  status: AuthStatus
  setUser: (user: User | null) => void
}

/** UI-only: the current Supabase auth user, if cloud sync is configured at all. */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: user ? "signedIn" : "signedOut" }),
}))
