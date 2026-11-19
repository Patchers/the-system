import type { Rank } from "../db/types"
import type { RankAssessment } from "../engine/rank"
import { RankEmblem } from "./RankEmblem"

interface RankBadgeProps {
  rank: Rank
  assessment?: RankAssessment
}

/** Current rank to next rank, with a progress bar per requirement. */
export function RankBadge({ rank, assessment }: RankBadgeProps) {
  return (
    <section className="sys-panel p-5 flex flex-col gap-4" aria-labelledby="rank-heading">
      <h2 id="rank-heading" className="text-lg">
        Rank assessment
      </h2>
      <div className="flex items-center gap-3">
        <RankEmblem rank={rank} size={52} />
        {assessment?.next && (
          <>
            <span aria-hidden className="font-display text-[var(--xp)] opacity-70 tracking-tighter">
              ››
            </span>
            <RankEmblem rank={assessment.next} size={52} locked />
          </>
        )}
        <p className="text-sm opacity-80 flex-1 min-w-0 pl-1">
          {assessment?.next
            ? assessment.atCeiling
              ? "Level ceiling reached. Assessment pending."
              : `Next assessment: Rank ${assessment.next}`
            : "Highest rank attained."}
        </p>
      </div>
      {assessment && assessment.checklist.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label={`Requirements for rank ${assessment.next}`}>
          {assessment.checklist.map((item) => {
            const pct = item.required > 0 ? Math.min(100, (item.current / item.required) * 100) : 100
            return (
              <li key={item.key} className="flex flex-col gap-1.5">
                <div className={`flex justify-between gap-3 text-sm ${item.met ? "opacity-70" : ""}`}>
                  <span>
                    <span aria-hidden className="inline-block w-5 text-[var(--xp)]">
                      {item.met ? "✓" : "▢"}
                    </span>
                    {item.label}
                  </span>
                  <span className="font-heading tabular-nums whitespace-nowrap">
                    {item.current} / {item.required}
                  </span>
                </div>
                <div className="mini" aria-hidden>
                  <i style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
