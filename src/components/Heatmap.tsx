import type { HeatCell } from "../engine/charts"

const SHADES = ["rgba(47,127,212,0.12)", "rgba(0,229,255,0.30)", "rgba(0,229,255,0.50)", "rgba(0,229,255,0.72)", "rgba(0,229,255,1)"]
const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

/** Calendar grid of completion activity. Columns are weeks, rows are weekdays. */
export function Heatmap({ cells }: { cells: (HeatCell | null)[] }) {
  return (
    <div className="flex flex-col gap-3">
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="grid grid-rows-7 gap-1 shrink-0" aria-hidden>
        {DAYS.map((d, i) => (
          <span key={i} className="text-[10px] opacity-50 font-heading h-3 leading-3">
            {d}
          </span>
        ))}
      </div>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1"
        role="img"
        aria-label={`Activity over the last ${cells.filter(Boolean).length} days`}
      >
        {cells.map((cell, i) =>
          cell ? (
            <span
              key={cell.date}
              title={`${cell.date}: ${cell.count} completion${cell.count === 1 ? "" : "s"}`}
              className="w-3 h-3"
              style={{ background: SHADES[cell.level], boxShadow: cell.level > 2 ? "0 0 6px var(--xp)" : undefined }}
            />
          ) : (
            <span key={`pad-${i}`} className="w-3 h-3" />
          ),
        )}
      </div>
    </div>
    <div className="flex items-center justify-end gap-1.5" aria-hidden>
      <span className="eyebrow">Less</span>
      {SHADES.map((c) => (
        <span key={c} className="w-3 h-3" style={{ background: c }} />
      ))}
      <span className="eyebrow">More</span>
    </div>
    </div>
  )
}
