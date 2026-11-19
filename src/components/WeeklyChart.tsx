import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { DayPoint } from "../engine/charts"

/** XP earned per day over the recent window. */
export function WeeklyChart({ data }: { data: DayPoint[] }) {
  const empty = data.every((d) => d.xp === 0)
  return (
    <div className="relative h-56 w-full" aria-label="XP per day">
      {empty && (
        <p className="absolute inset-0 z-10 flex items-center justify-center pb-6 eyebrow pointer-events-none">No XP yet. Complete a quest.</p>
      )}
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="xp-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--xp)" }} />
              <stop offset="1" style={{ stopColor: "var(--glow)", stopOpacity: 0.45 }} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, (max: number) => Math.max(10, max)]} allowDecimals={false} tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: "var(--glow)", fillOpacity: 0.12 }}
            contentStyle={{ background: "#0a1526", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            labelStyle={{ color: "var(--accent)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            formatter={(value) => [`${Number(value)} XP`, ""]}
          />
          <Bar dataKey="xp" fill="url(#xp-bar)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
