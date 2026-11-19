import { useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { workingWeight } from "../engine/progression"
import { e1rmSeries } from "../engine/records"
import { useLive } from "../repo/useLive"
import { workoutRepo } from "../repo/workoutRepo"

const kg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Per-lift strength trend: best estimated one-rep max per session. */
export function LiftProgress() {
  const [picked, setPicked] = useState<string | null>(null)
  const data = useLive(async () => {
    const names = await workoutRepo.liftNames()
    const name = picked && names.includes(picked) ? picked : names[0]
    const history = name ? ((await workoutRepo.liftHistory([name])).get(name) ?? []) : []
    return { names, name, history }
  }, [picked])

  if (!data || data.names.length === 0) return null
  const { names, name, history } = data
  const series = e1rmSeries(history).map((p) => ({ ...p, label: p.date.slice(5) }))
  const best = series.reduce((m, p) => Math.max(m, p.e1rm), 0)
  const last = history[history.length - 1]

  return (
    <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="lifts-heading">
      <h2 id="lifts-heading" className="text-lg">
        Lift progress
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a lift">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPicked(n)}
            aria-pressed={n === name}
            className={`shrink-0 font-heading tracking-widest text-sm border px-3 ${n === name ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] opacity-70"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs font-heading tracking-widest opacity-70">EST. MAX</dt>
          <dd className="font-heading text-2xl tabular-nums">{best ? `${kg(best)}` : "–"}</dd>
        </div>
        <div>
          <dt className="text-xs font-heading tracking-widest opacity-70">WORKING</dt>
          <dd className="font-heading text-2xl tabular-nums">{last ? kg(workingWeight(last)) : "–"}</dd>
        </div>
        <div>
          <dt className="text-xs font-heading tracking-widest opacity-70">SESSIONS</dt>
          <dd className="font-heading text-2xl tabular-nums">{history.length}</dd>
        </div>
      </dl>
      {series.length >= 2 ? (
        <div className="h-48 w-full" aria-label={`${name} estimated max per session`}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.25} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: "var(--accent)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0a1526", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                labelStyle={{ color: "var(--accent)" }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                formatter={(value) => [`${kg(Number(value))} kg`, "Est. max"]}
              />
              <Line type="monotone" dataKey="e1rm" stroke="var(--xp)" strokeWidth={2} dot={{ r: 3, fill: "var(--xp)" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm opacity-70">Log this lift twice to see its trend.</p>
      )}
    </section>
  )
}
