import { useState } from "react"
import { allocateStat } from "../actions/allocateStat"
import { Bar } from "../components/Bar"
import { RankBadge } from "../components/RankBadge"
import { StatRadar } from "../components/StatRadar"
import type { StatKey } from "../db/types"
import { STAT_KEYS } from "../engine/constants"
import { assessRank } from "../engine/rank"
import { xpToNext } from "../engine/xp"
import { todayKey } from "../lib/date"
import { isRepoError } from "../repo/errors"
import { gatherRankEvidence } from "../repo/evidence"
import { hunterRepo } from "../repo/hunterRepo"
import { useLive } from "../repo/useLive"

const STAT_NAMES: Record<StatKey, string> = {
  str: "Strength",
  agi: "Agility",
  vit: "Vitality",
  int: "Intelligence",
  per: "Perception",
}

export function StatusScreen() {
  const hunter = useLive(() => hunterRepo.get())
  const assessment = useLive(async () => {
    const [h, evidence] = await Promise.all([hunterRepo.get(), gatherRankEvidence(todayKey())])
    return assessRank(h.rank, evidence)
  })
  const [error, setError] = useState<string | null>(null)

  if (!hunter) return null

  const spend = async (stat: StatKey) => {
    setError(null)
    try {
      await allocateStat(stat)
    } catch (e) {
      setError(isRepoError(e) ? e.message : "Something went wrong.")
    }
  }

  const canSpend = hunter.statPoints > 0 && !hunter.recoveryMode

  return (
    <div className="flex flex-col gap-4">
      <section className="sys-panel p-5 flex flex-col gap-4">
        <header className="flex justify-between items-baseline">
          <h1 className="text-2xl">Hunter</h1>
          <span className="font-heading text-sm tracking-widest opacity-80">{hunter.title}</span>
        </header>
        <p className="font-heading text-4xl">
          LV <span className="text-[var(--xp)]">{hunter.level}</span>
        </p>
        {hunter.recoveryMode && (
          <p role="status" className="text-[var(--danger)] font-heading tracking-widest">
            RECOVERY MODE — complete any quest to resume
          </p>
        )}
        <Bar label="HP" value={hunter.hp} max={hunter.maxHp} color={hunter.recoveryMode ? "var(--danger)" : "var(--glow)"} />
        <Bar label="XP" value={hunter.xp} max={xpToNext(hunter.level)} color="var(--xp)" />
      </section>

      <section className="sys-panel p-5">
        <h2 className="text-lg mb-2">Stats</h2>
        <StatRadar hunter={hunter} />
        <p className="font-heading tracking-widest text-sm mb-3">
          STAT POINTS: <span className="text-[var(--xp)]">{hunter.statPoints}</span>
        </p>
        <ul className="flex flex-col gap-2">
          {STAT_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-3">
              <span>
                <span className="font-heading tracking-widest">{k.toUpperCase()}</span>
                <span className="text-sm opacity-70 ml-2">{STAT_NAMES[k]}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-heading text-2xl tabular-nums w-10 text-right">{hunter[k]}</span>
                <button
                  type="button"
                  onClick={() => spend(k)}
                  disabled={!canSpend}
                  aria-label={`Add one point to ${STAT_NAMES[k]}`}
                  className="font-heading text-2xl border border-[var(--border)] disabled:opacity-30 active:bg-[var(--glow)]/30"
                >
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </section>

      <RankBadge rank={hunter.rank} assessment={assessment} />
    </div>
  )
}
