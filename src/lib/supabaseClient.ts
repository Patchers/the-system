import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once real project credentials are configured. Sync features no-op without them. */
export const cloudConfigured = Boolean(url && anonKey)

/**
 * Single Supabase client for the app. `null` when unconfigured, so every
 * caller can check `cloudConfigured` (or the null itself) and fall back to
 * local-only behaviour instead of throwing.
 */
export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
