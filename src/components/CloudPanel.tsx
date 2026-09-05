import { useState, type FormEvent } from "react"
import { cloudConfigured, supabase } from "../lib/supabaseClient"
import { syncQueueRepo } from "../repo/syncQueueRepo"
import { useLive } from "../repo/useLive"
import { useAuthStore } from "../store/authStore"

type Mode = "signIn" | "signUp"

/** Sign in / sign up / status, shown in Records. A no-op panel when cloud sync isn't configured. */
export function CloudPanel() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const pending = useLive(() => syncQueueRepo.count())
  const [mode, setMode] = useState<Mode>("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!cloudConfigured) {
    return (
      <section className="sys-panel p-4 flex flex-col gap-2" aria-labelledby="cloud-heading">
        <h2 id="cloud-heading" className="text-lg">
          Cloud Sync
        </h2>
        <p className="text-sm opacity-70">Not set up. Everything above stays on this device only.</p>
      </section>
    )
  }

  const field = "bg-black/40 border border-[var(--border)] px-3 min-h-14"

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === "signIn") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) setError(err.message)
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) setError(err.message)
        else setNotice("Check your email to confirm the account, then sign in.")
      }
    } finally {
      setBusy(false)
    }
  }

  if (status === "loading") {
    return (
      <section className="sys-panel p-4" aria-labelledby="cloud-heading">
        <h2 id="cloud-heading" className="text-lg">
          Cloud Sync
        </h2>
      </section>
    )
  }

  if (status === "signedIn") {
    return (
      <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="cloud-heading">
        <h2 id="cloud-heading" className="text-lg">
          Cloud Sync
        </h2>
        <p className="text-sm opacity-80">Signed in as {user?.email}</p>
        <p className="text-xs font-heading tracking-widest opacity-60">
          {pending === undefined ? "…" : pending === 0 ? "ALL SYNCED" : `${pending} PENDING`}
        </p>
        <button
          type="button"
          onClick={() => void supabase?.auth.signOut()}
          className="font-heading tracking-widest border border-[var(--danger)] text-[var(--danger)]"
        >
          SIGN OUT
        </button>
      </section>
    )
  }

  return (
    <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="cloud-heading">
      <h2 id="cloud-heading" className="text-lg">
        Cloud Sync
      </h2>
      <p className="text-sm opacity-70">Sign in to sync this hunter across every device.</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          className={field}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className={field}
        />
        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-[var(--xp)]">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="font-heading tracking-widest border border-[var(--xp)] text-[var(--xp)] disabled:opacity-40"
        >
          {mode === "signIn" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          className="text-xs font-heading tracking-widest opacity-70 min-h-0 min-w-0"
        >
          {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </section>
  )
}
