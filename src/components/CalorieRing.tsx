interface CalorieRingProps {
  calories: number
  goal: number
}

const SIZE = 220
const STROKE = 16
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

/** Large progress ring: calories logged today against the goal. Turns danger when over. */
export function CalorieRing({ calories, goal }: CalorieRingProps) {
  const pct = goal > 0 ? Math.min(1, calories / goal) : 0
  const over = goal > 0 && calories > goal
  const color = over ? "var(--danger)" : "var(--xp)"
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${calories} of ${goal} calories`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--border)" strokeOpacity={0.35} strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dashoffset 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-5xl tabular-nums" style={{ color }}>
          {calories}
        </span>
        <span className="text-sm opacity-70 font-heading tracking-widest">/ {goal} KCAL</span>
        {over && <span className="text-xs text-[var(--danger)] font-heading tracking-widest mt-1">OVER GOAL</span>}
      </div>
    </div>
  )
}
