import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts"
import type { Hunter } from "../db/types"
import { STAT_KEYS } from "../engine/constants"

/** Five-axis stat radar. Scales to the hunter's highest stat so a fresh hunter still draws a shape. */
export function StatRadar({ hunter }: { hunter: Hunter }) {
  const data = STAT_KEYS.map((k) => ({ stat: k.toUpperCase(), value: hunter[k] }))
  const max = Math.max(5, ...data.map((d) => d.value))
  return (
    <div className="h-64 w-full" aria-label="Stat radar">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
          <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--accent)", fontSize: 14, fontFamily: "var(--font-heading)" }} />
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="var(--glow)" fill="var(--glow)" fillOpacity={0.35} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
