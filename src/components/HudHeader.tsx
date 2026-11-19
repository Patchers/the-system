import type { Hunter } from "../db/types"
import { xpToNext } from "../engine/xp"

/** Always-visible HUD: wordmark, rank and level, and a thin XP line. */
export function HudHeader({ hunter }: { hunter?: Hunter }) {
  const pct = hunter ? Math.max(0, Math.min(100, (hunter.xp / xpToNext(hunter.level)) * 100)) : 0
  return (
    <header className="hud">
      <div className="hud-row">
        <span className="hud-mark">THE SYSTEM</span>
        {hunter && (
          <span className="hud-lv">
            RANK {hunter.rank} · LV<b>{hunter.level}</b>
          </span>
        )}
      </div>
      <div
        className="hud-xp"
        role="progressbar"
        aria-label="XP to next level"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </header>
  )
}
