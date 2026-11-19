import { useId } from "react"

interface CalorieRingProps {
  calories: number
  goal: number
}

const SIZE = 248
const CENTER = SIZE / 2
const STROKE = 14
const R = 98
const TICK_R = 118
const TICK_STROKE = 7
const TICK_COUNT = 72
const TICK_WIDTH = 1.6
const CIRC = 2 * Math.PI * R
const TICK_CIRC = 2 * Math.PI * TICK_R

/** HUD dial: calories logged today against the goal, with a lit end cap. Turns danger when over. */
export function CalorieRing({ calories, goal }: CalorieRingProps) {
  const gradientId = useId()
  const pct = goal > 0 ? Math.min(1, calories / goal) : 0
  const over = goal > 0 && calories > goal
  const color = over ? "var(--danger)" : "var(--xp)"
  const angle = (pct * 360 - 90) * (Math.PI / 180)
  const capX = CENTER + R * Math.cos(angle)
  const capY = CENTER + R * Math.sin(angle)
  const left = Math.max(0, goal - calories)

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${calories} of ${goal} calories`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: over ? "var(--danger)" : "var(--glow)" }} />
            <stop offset="1" style={{ stopColor: color }} />
          </linearGradient>
        </defs>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={TICK_R}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.6}
          strokeWidth={TICK_STROKE}
          strokeDasharray={`${TICK_WIDTH} ${TICK_CIRC / TICK_COUNT - TICK_WIDTH}`}
        />
        <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="var(--border)" strokeOpacity={0.22} strokeWidth={STROKE} />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dashoffset 400ms" }}
        />
        {pct > 0 && pct < 1 && <circle cx={capX} cy={capY} r={STROKE * 0.62} fill="#fff" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-5xl tabular-nums" style={{ color, textShadow: `0 0 22px ${color}` }}>
          {calories}
        </span>
        <span className="text-sm opacity-70 font-heading tracking-widest">/ {goal} KCAL</span>
        <span className={`text-xs font-heading tracking-widest mt-1 ${over ? "text-[var(--danger)]" : "opacity-60"}`}>
          {over ? `OVER BY ${calories - goal}` : `${left} LEFT`}
        </span>
      </div>
    </div>
  )
}
