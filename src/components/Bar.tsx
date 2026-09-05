interface BarProps {
  label: string
  value: number
  max: number
  /** CSS colour, usually a theme token like var(--xp). */
  color: string
}

/** Horizontal resource bar with the numbers alongside. */
export function Bar({ label, value, max, color }: BarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm tracking-widest font-heading">
        <span>{label}</span>
        <span>
          {Math.round(value)} / {Math.round(max)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        className="h-3 w-full bg-black/40 border border-[var(--border)]"
      >
        <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  )
}
