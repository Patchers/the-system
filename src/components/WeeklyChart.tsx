import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { DayPoint } from "../engine/charts"

/** XP earned per day over the recent window. */
export function WeeklyChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-56 w-full" aria-label="XP per day">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: "var(--glow)", fillOpacity: 0.12 }}
            contentStyle={{ background: "#0a1526", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            labelStyle={{ color: "var(--accent)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            formatter={(value) => [`${Number(value)} XP`, ""]}
          />
          <Bar dataKey="xp" fill="var(--xp)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
