import { supabase } from "./supabaseClient"
import { useAuthStore } from "../store/authStore"

/**
 * Subscribe the auth store to Supabase's session state. When cloud sync
 * isn't configured, resolves straight to "signed out" so the rest of the
 * app treats it exactly like local-only mode. Returns an unsubscribe fn.
 */
export function watchAuth(): () => void {
  if (!supabase) {
    useAuthStore.getState().setUser(null)
    return () => {}
  }
  void supabase.auth.getSession().then(({ data }) => useAuthStore.getState().setUser(data.session?.user ?? null))
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setUser(session?.user ?? null)
  })
  return () => sub.subscription.unsubscribe()
}
