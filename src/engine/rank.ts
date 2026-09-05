/**
 * Rank assessment. Rank-up requires level AND conditions; rank never demotes.
 * Pure functions over plain objects.
 */
import type { Quest, Rank } from "../db/types"
import { CALORIE_WINDOW_DAYS, RANK_ORDER, RANK_REQUIREMENTS, type RankRequirement } from "./constants"

/** Everything the assessment looks at. Gathered by the repo layer. */
export interface RankEvidence {
  level: number
  /** Longest current streak across active daily quests. */
  streakDays: number
  workouts: number
  dungeonsCleared: number
  /** Days the calorie goal was met within the last CALORIE_WINDOW_DAYS. */
  calorieDaysMet: number
}

export interface ChecklistItem {
  key: keyof RankRequirement
  label: string
  required: number
  current: number
  met: boolean
}

export interface RankAssessment {
  /** Rank after assessment (>= input rank). */
  rank: Rank
  /** Ranks passed through in this assessment, in order. One panel each. */
  promotions: Rank[]
  /** The rank being worked toward, or null at S. */
  next: Rank | null
  /** Level threshold for `next` is met but conditions are not. */
  atCeiling: boolean
  /** Outstanding + satisfied requirements for `next`. Empty at S. */
  checklist: ChecklistItem[]
}

export function nextRank(rank: Rank): Rank | null {
  const i = RANK_ORDER.indexOf(rank)
  return RANK_ORDER[i + 1] ?? null
}

export function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank)
}

const LABELS: Record<keyof RankRequirement, (n: number) => string> = {
  level: (n) => `Reach level ${n}`,
  streakDays: (n) => `${n}-day daily streak`,
  workouts: (n) => `Log ${n} workouts`,
  dungeonsCleared: (n) => `Clear ${n} dungeon${n === 1 ? "" : "s"}`,
  calorieDaysMet: (n) => `Hit calorie goal ${n} of last ${CALORIE_WINDOW_DAYS} days`,
}

/** Checklist for promotion from `rank` to the one above it. Only non-zero requirements appear. */
export function rankChecklist(rank: Rank, evidence: RankEvidence): ChecklistItem[] {
  const target = nextRank(rank)
  if (!target) return []
  const req = RANK_REQUIREMENTS[target]
  return (Object.keys(req) as (keyof RankRequirement)[])
    .filter((key) => req[key] > 0)
    .map((key) => ({
      key,
      label: LABELS[key](req[key]),
      required: req[key],
      current: evidence[key],
      met: evidence[key] >= req[key],
    }))
}

export function meetsRequirements(target: Rank, evidence: RankEvidence): boolean {
  const req = RANK_REQUIREMENTS[target]
  return (Object.keys(req) as (keyof RankRequirement)[]).every((key) => evidence[key] >= req[key])
}

/**
 * Assess the hunter. Promotes through every rank whose full requirements are
 * met, then reports the checklist for the next one. Never demotes.
 */
export function assessRank(current: Rank, evidence: RankEvidence): RankAssessment {
  let rank = current
  const promotions: Rank[] = []
  for (let target = nextRank(rank); target && meetsRequirements(target, evidence); target = nextRank(rank)) {
    rank = target
    promotions.push(target)
  }
  const next = nextRank(rank)
  const checklist = rankChecklist(rank, evidence)
  const atCeiling = next !== null && evidence.level >= RANK_REQUIREMENTS[next].level
  return { rank, promotions, next, atCeiling, checklist }
}

/** Longest current streak across active, non-deleted daily quests. */
export function longestCurrentStreak(quests: readonly Quest[]): number {
  return quests.reduce(
    (max, q) => (q.type === "daily" && q.active && !q.deleted ? Math.max(max, q.streak) : max),
    0,
  )
}
