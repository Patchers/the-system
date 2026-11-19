import type { CSSProperties } from "react"
import type { Rank } from "../db/types"
import { rankColor } from "../lib/rankColor"

interface RankEmblemProps {
  rank: Rank
  /** Edge length in px. */
  size?: number
  /** Dim it: used for a rank that has not been earned yet. */
  locked?: boolean
}

/** The rank letter in a notched tile coloured for that rank. */
export function RankEmblem({ rank, size = 72, locked = false }: RankEmblemProps) {
  return (
    <div
      className="rank-tile"
      role="img"
      aria-label={`Rank ${rank}`}
      style={{ "--rc": rankColor(rank), width: size, height: size, fontSize: size * 0.46, opacity: locked ? 0.45 : 1 } as CSSProperties}
    >
      {rank}
    </div>
  )
}
