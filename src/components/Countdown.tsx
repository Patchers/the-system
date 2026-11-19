import { useEffect, useState } from "react"
import { msUntilRollover } from "../lib/date"

const pad = (n: number) => String(n).padStart(2, "0")

function format(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** HH:MM:SS until the 04:00 rollover. Calls `onRollover` once the day flips. */
export function Countdown({ onRollover }: { onRollover?: () => void }) {
  const [ms, setMs] = useState(() => msUntilRollover(new Date()))

  useEffect(() => {
    const id = setInterval(() => {
      const next = msUntilRollover(new Date())
      setMs((prev) => {
        if (next > prev) onRollover?.()
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onRollover])

  return (
    <span className="tabular-nums tracking-widest" aria-label="Time until reset">
      {format(ms)}
    </span>
  )
}
