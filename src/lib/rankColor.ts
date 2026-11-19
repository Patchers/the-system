import type { Difficulty, Rank } from "../db/types"

/** CSS colour for a rank or quest difficulty. One token per letter in index.css. */
export const rankColor = (r: Rank | Difficulty): string => `var(--rank-${r.toLowerCase()})`
