import { useState } from "react"
import { allocateStat } from "../actions/allocateStat"
import { Bar } from "../components/Bar"
import { RankBadge } from "../components/RankBadge"
import { RankEmblem } from "../components/RankEmblem"
import { StatRadar } from "../components/StatRadar"
import type { StatKey } from "../db/types"
import { STAT_KEYS, STAT_UNITS_PER_POINT } from "../engine/constants"
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
  const toNext = Math.max(0, xpToNext(hunter.level) - hunter.xp)

  return (
    <div className="flex flex-col gap-4">
      <section className="sys-panel p-5 flex flex-col gap-5" aria-labelledby="hunter-heading">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 id="hunter-heading" className="text-sm opacity-80">
              Hunter
            </h1>
            <p className="lvl" aria-label={`Level ${hunter.level}`}>
              <small>LV</small>
              {hunter.level}
            </p>
            <p className="font-heading tracking-widest text-sm opacity-80">{hunter.title}</p>
          </div>
          <RankEmblem rank={hunter.rank} size={76} />
        </header>

        {hunter.recoveryMode && (
          <p role="status" className="text-[var(--danger)] font-heading tracking-widest">
            RECOVERY MODE — complete any quest to resume
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Bar label="XP" value={hunter.xp} max={xpToNext(hunter.level)} color="var(--xp)" />
          <Bar label="HP" value={hunter.hp} max={hunter.maxHp} color={hunter.recoveryMode ? "var(--danger)" : "var(--glow)"} />
        </div>
        <p className="eyebrow">
          {toNext} XP to level {hunter.level + 1}
        </p>
      </section>

      <section className="sys-panel p-5 flex flex-col gap-4" aria-labelledby="attr-heading">
        <header className="flex items-center justify-between gap-3">
          <h2 id="attr-heading" className="text-lg">
            Attributes
          </h2>
          <span className={`chip ${canSpend ? "chip-hot" : ""}`}>{hunter.statPoints} POINTS</span>
        </header>
        <StatRadar hunter={hunter} />
        <ul className="flex flex-col gap-2">
          {STAT_KEYS.map((k) => {
            const units = hunter.statUnits[k]
            return (
              <li key={k} className="sys-row flex items-center gap-3 py-2 pl-3 pr-2">
                <span className="font-display font-bold text-sm w-11 shrink-0 text-[var(--xp)]">{k.toUpperCase()}</span>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm opacity-80 truncate">{STAT_NAMES[k]}</span>
                    <span className="font-display font-bold text-xl tabular-nums">{hunter[k]}</span>
                  </div>
                  <div
                    className="mini"
                    role="progressbar"
                    aria-label={`${STAT_NAMES[k]} progress to next point`}
                    aria-valuenow={Math.round(units)}
                    aria-valuemin={0}
                    aria-valuemax={STAT_UNITS_PER_POINT}
                  >
                    <i style={{ width: `${Math.min(100, (units / STAT_UNITS_PER_POINT) * 100)}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => spend(k)}
                  disabled={!canSpend}
                  aria-label={`Add one point to ${STAT_NAMES[k]}`}
                  className={`font-heading text-2xl border disabled:opacity-30 ${canSpend ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)]"}`}
                >
                  +
                </button>
              </li>
            )
          })}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </section>

      <RankBadge rank={hunter.rank} assessment={assessment} />
    </div>
  )
}
