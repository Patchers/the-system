import type { Rank } from "../db/types"
import type { RankAssessment } from "../engine/rank"

interface RankBadgeProps {
  rank: Rank
  assessment?: RankAssessment
}

/** Big rank letter plus the assessment checklist for the next rank. */
export function RankBadge({ rank, assessment }: RankBadgeProps) {
  return (
    <section className="sys-panel p-5 flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <div
          className="flex items-center justify-center w-20 h-20 font-heading text-5xl border-2 border-[var(--glow)]"
          style={{ boxShadow: "0 0 18px var(--glow) inset, 0 0 18px var(--glow)" }}
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </div>
        <div>
          <h2 className="text-lg">Rank {rank}</h2>
          {assessment?.next ? (
            <p className="text-sm opacity-80">
              {assessment.atCeiling ? "Level ceiling reached. Assessment pending:" : `Next assessment: Rank ${assessment.next}`}
            </p>
          ) : (
            <p className="text-sm opacity-80">Highest rank attained.</p>
          )}
        </div>
      </div>
      {assessment && assessment.checklist.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={`Requirements for rank ${assessment.next}`}>
          {assessment.checklist.map((item) => (
            <li key={item.key} className={`flex justify-between gap-3 text-sm ${item.met ? "opacity-60" : ""}`}>
              <span>
                <span aria-hidden className="inline-block w-5">
                  {item.met ? "✓" : "▢"}
                </span>
                {item.label}
              </span>
              <span className="font-heading tabular-nums whitespace-nowrap">
                {item.current} / {item.required}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
