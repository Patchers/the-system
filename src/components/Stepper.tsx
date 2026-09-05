import { useEffect, useRef } from "react"

interface StepperProps {
  label: string
  value: number
  onChange: (next: number) => void
  step: number
  min?: number
  max?: number
  unit?: string
}

const HOLD_DELAY_MS = 400
const HOLD_REPEAT_MS = 90

const round = (n: number) => Math.round(n * 100) / 100

/** Big +/- control. Tap to step, hold to repeat. No keyboard needed. */
export function Stepper({ label, value, onChange, step, min = 0, max = Number.POSITIVE_INFINITY, unit }: StepperProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const latest = useRef(value)
  latest.current = value

  const clamp = (n: number) => round(Math.max(min, Math.min(max, n)))
  const bump = (dir: 1 | -1) => {
    const next = clamp(latest.current + dir * step)
    latest.current = next
    onChange(next)
  }

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    if (interval.current) clearInterval(interval.current)
    timer.current = null
    interval.current = null
  }

  const hold = (dir: 1 | -1) => {
    bump(dir)
    timer.current = setTimeout(() => {
      interval.current = setInterval(() => bump(dir), HOLD_REPEAT_MS)
    }, HOLD_DELAY_MS)
  }

  useEffect(() => stop, [])

  const btn = "font-heading text-3xl border border-[var(--border)] active:bg-[var(--glow)]/30 select-none"
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-heading tracking-widest text-sm w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className={btn}
          onPointerDown={() => hold(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
        >
          −
        </button>
        <output className="font-heading text-2xl tabular-nums w-24 text-center" aria-label={label}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {unit && <span className="text-sm opacity-70 ml-1">{unit}</span>}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className={btn}
          onPointerDown={() => hold(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
        >
          +
        </button>
      </div>
    </div>
  )
}
