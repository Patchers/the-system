import { useEffect, useRef, useState } from "react"
import { useSessionStore } from "../store/sessionStore"

const TICK_MS = 250
const EXTEND_SEC = 30
/** How long "GO" stays up after the rest ends before the bar clears itself. */
const DONE_LINGER_MS = 4000

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`

/** Countdown between sets. Starts on its own after a lift set; buzzes when rest is over. */
export function RestTimer() {
  const rest = useSessionStore((s) => s.rest)
  const extend = useSessionStore((s) => s.extendRest)
  const clear = useSessionStore((s) => s.clearRest)
  const [now, setNow] = useState(() => Date.now())
  const buzzed = useRef<number | null>(null)

  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [rest])

  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (!rest || left > 0 || buzzed.current === rest.endsAt) return
    buzzed.current = rest.endsAt
    try {
      navigator.vibrate?.([200, 100, 200])
    } catch {
      /* not supported */
    }
    const t = setTimeout(clear, DONE_LINGER_MS)
    return () => clearTimeout(t)
  }, [left, rest, clear])

  if (!rest) return null
  const pct = rest.totalSec > 0 ? (left / rest.totalSec) * 100 : 0
  const done = left === 0

  return (
    <div className="sticky z-10 sys-panel bg-[var(--bg)]! p-3 flex items-center gap-3" style={{ top: "calc(env(safe-area-inset-top, 0px) + 52px)" }} role="timer" aria-label="Rest timer">
      <div className="flex-1 flex flex-col gap-1">
        <span className={`font-heading tracking-widest text-sm ${done ? "text-[var(--xp)]" : "opacity-80"}`}>{done ? "REST OVER · GO" : "REST"}</span>
        <div className="h-1.5 bg-black/50 overflow-hidden">
          <div className="h-full bg-[var(--xp)] transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <output className="font-heading text-3xl tabular-nums w-20 text-right" aria-live="off">
        {mmss(left)}
      </output>
      {!done && (
        <button type="button" onClick={() => extend(EXTEND_SEC)} className="font-heading tracking-widest text-sm border border-[var(--border)] px-3">
          +30
        </button>
      )}
      <button type="button" onClick={clear} className="font-heading tracking-widest text-sm border border-[var(--border)] px-3">
        {done ? "OK" : "SKIP"}
      </button>
    </div>
  )
}
