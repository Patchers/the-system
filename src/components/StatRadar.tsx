import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts"
import type { Hunter } from "../db/types"
import { STAT_KEYS } from "../engine/constants"

/** Five-axis stat radar. Scales to the hunter's highest stat so a fresh hunter still draws a shape. */
export function StatRadar({ hunter }: { hunter: Hunter }) {
  const data = STAT_KEYS.map((k) => ({ stat: k.toUpperCase(), value: hunter[k] }))
  const max = Math.max(5, ...data.map((d) => d.value))
  return (
    <div className="h-56 w-full" aria-label="Stat radar">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.55} />
          <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--accent)", fontSize: 13, fontFamily: "var(--font-display)", letterSpacing: 1 }} />
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--xp)"
            strokeWidth={2}
            fill="var(--glow)"
            fillOpacity={0.32}
            dot={{ r: 3.5, fill: "var(--xp)", stroke: "none" }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
