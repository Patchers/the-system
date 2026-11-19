import type { CSSProperties } from "react"

interface BarProps {
  label: string
  value: number
  max: number
  /** CSS colour, usually a theme token like var(--xp). */
  color: string
  /** Unit shown after the numbers, e.g. "ml". */
  unit?: string
}

/** Resource bar: coloured label, tabular numbers, slanted segmented track. */
export function Bar({ label, value, max, color, unit }: BarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline font-heading tracking-widest text-sm">
        <span style={{ color }}>{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}
          <span className="opacity-55">
            {" "}
            / {Math.round(max)}
            {unit ? ` ${unit}` : ""}
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        className="bar-track"
        style={{ "--bar": color } as CSSProperties}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
