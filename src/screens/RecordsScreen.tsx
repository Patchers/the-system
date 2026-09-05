import { BackupPanel } from "../components/BackupPanel"
import { CloudPanel } from "../components/CloudPanel"
import { DungeonList } from "../components/DungeonList"
import { Heatmap } from "../components/Heatmap"
import { WeeklyChart } from "../components/WeeklyChart"
import { ACHIEVEMENTS } from "../engine/achievements"
import { activeDays, dailySeries, heatmap, totalXp } from "../engine/charts"
import { addDays, todayKey } from "../lib/date"
import { achievementRepo } from "../repo/achievementRepo"
import { completionRepo } from "../repo/completionRepo"
import { dungeonRepo } from "../repo/dungeonRepo"
import { useLive } from "../repo/useLive"
import { workoutRepo } from "../repo/workoutRepo"

const CHART_DAYS = 14
const HEATMAP_DAYS = 119 // 17 whole weeks

export function RecordsScreen() {
  const today = todayKey()
  const data = useLive(async () => {
    const [completions, dungeons, achievements, workouts] = await Promise.all([
      completionRepo.listBetween(addDays(today, -(HEATMAP_DAYS - 1)), today),
      dungeonRepo.list(),
      achievementRepo.list(),
      workoutRepo.count(),
    ])
    return { completions, dungeons, achievements, workouts }
  }, [today])

  if (!data) return null

  const unlocked = new Set(data.achievements.map((a) => a.code))
  const stats = [
    { label: "XP EARNED", value: totalXp(data.completions) },
    { label: "COMPLETIONS", value: data.completions.length },
    { label: "ACTIVE DAYS", value: activeDays(data.completions) },
    { label: "SESSIONS", value: data.workouts },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="sys-panel p-4" aria-labelledby="totals-heading">
        <h1 id="totals-heading" className="text-xl mb-3">
          Records
        </h1>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-heading tracking-widest opacity-60">{s.label}</dt>
              <dd className="font-heading text-3xl tabular-nums text-[var(--xp)]">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs opacity-50 mt-3">Last {HEATMAP_DAYS} days.</p>
      </section>

      <section className="sys-panel p-4" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="text-lg mb-2">
          XP · last {CHART_DAYS} days
        </h2>
        <WeeklyChart data={dailySeries(data.completions, today, CHART_DAYS)} />
      </section>

      <section className="sys-panel p-4" aria-labelledby="heat-heading">
        <h2 id="heat-heading" className="text-lg mb-3">
          Activity
        </h2>
        <Heatmap cells={heatmap(data.completions, today, HEATMAP_DAYS)} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="dungeons-heading">
        <h2 id="dungeons-heading" className="text-lg px-1">
          Dungeons
        </h2>
        <DungeonList dungeons={data.dungeons} />
      </section>

      <section className="sys-panel p-4" aria-labelledby="ach-heading">
        <h2 id="ach-heading" className="text-lg mb-1">
          Achievements
        </h2>
        <p className="text-xs font-heading tracking-widest opacity-60 mb-3">
          {unlocked.size} / {ACHIEVEMENTS.length} UNLOCKED
        </p>
        <ul className="flex flex-col gap-2">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.code)
            return (
              <li key={a.code} className={`flex gap-3 ${on ? "" : "opacity-40"}`}>
                <span aria-hidden className="font-heading">
                  {on ? "★" : "☆"}
                </span>
                <span>
                  <span className={`font-heading tracking-widest ${on ? "text-[var(--xp)]" : ""}`}>{a.name}</span>
                  <span className="block text-sm opacity-80">{a.description}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <CloudPanel />
      <BackupPanel />
    </div>
  )
}
