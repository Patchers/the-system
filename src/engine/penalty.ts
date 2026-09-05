/**
 * Penalty engine. Runs on app open and settles every app-day the hunter was
 * away, from `hunter.lastSeenDate` (inclusive) up to `today` (exclusive).
 * Pure: the caller gathers records and persists the result.
 *
 * Because this runs on every open, `lastSeenDate` is always >= the date of any
 * stored completion, so a miss can never be followed by a completion inside
 * the range being settled.
 */
import type { Completion, Hunter, Quest } from "../db/types"
import { dateRange } from "../lib/date"
import { PENALTY_HP, PENALTY_XP_FRACTION, RECOVERY_HP_PER_ACTIVE_DAY } from "./constants"
import { xpToNext } from "./xp"

export interface PenaltyInput {
  hunter: Hunter
  quests: readonly Quest[]
  /** Completions dated on or after `hunter.lastSeenDate`. Others are ignored. */
  completions: readonly Completion[]
  today: string
  penaltyEnabled: boolean
}

export interface MissedQuest {
  questId: string
  title: string
  date: string
}

export interface PenaltyResult {
  /** Hunter with penalties applied and `lastSeenDate` moved to `today`. */
  hunter: Hunter
  /** Every input quest, with streaks reset where missed. */
  quests: Quest[]
  /** Days on which at least one daily quest was missed. */
  missedDays: string[]
  misses: MissedQuest[]
  xpLost: number
  hpLost: number
  hpRecovered: number
  streaksReset: string[]
  enteredRecovery: boolean
  /** Body lines for the single ⚠ SYSTEM PENALTY panel. Empty = no panel. */
  lines: string[]
}

const isActiveDaily = (q: Quest) => q.type === "daily" && q.active && !q.deleted

export function runPenalty(input: PenaltyInput): PenaltyResult {
  const { hunter, today, penaltyEnabled } = input
  const days = dateRange(hunter.lastSeenDate, today)
  const quests = input.quests.map((q) => ({ ...q }))
  const result: PenaltyResult = {
    hunter: { ...hunter, lastSeenDate: today },
    quests,
    missedDays: [],
    misses: [],
    xpLost: 0,
    hpLost: 0,
    hpRecovered: 0,
    streaksReset: [],
    enteredRecovery: false,
    lines: [],
  }
  if (!penaltyEnabled || days.length === 0) return result

  const live = input.completions.filter((c) => !c.deleted)
  const done = new Set(live.map((c) => `${c.questId}|${c.date}`))
  const activeDays = new Set(live.map((c) => c.date))
  const dailies = quests.filter(isActiveDaily)

  // Level is frozen for the whole settlement: penalties never de-level.
  const lossPerMiss = Math.floor(xpToNext(hunter.level) * PENALTY_XP_FRACTION)
  let { xp, hp } = hunter
  const reset = new Set<string>()

  for (const day of days) {
    let missedThisDay = false
    for (const q of dailies) {
      if (done.has(`${q.id}|${day}`)) continue
      missedThisDay = true
      result.misses.push({ questId: q.id, title: q.title, date: day })
      const loss = Math.min(xp, lossPerMiss)
      xp -= loss
      result.xpLost += loss
      hp -= PENALTY_HP
      result.hpLost += PENALTY_HP
      if (!q.lastCompletedOn || q.lastCompletedOn < day) {
        q.streak = 0
        reset.add(q.id)
      }
    }
    if (missedThisDay) result.missedDays.push(day)
    if (activeDays.has(day)) {
      const gain = Math.min(hunter.maxHp, hp + RECOVERY_HP_PER_ACTIVE_DAY) - hp
      if (gain > 0) {
        hp += gain
        result.hpRecovered += gain
      }
    }
  }

  let recoveryMode = hunter.recoveryMode
  if (hp <= 0) {
    hp = 0
    if (!recoveryMode) {
      recoveryMode = true
      result.enteredRecovery = true
    }
  }

  result.hunter = { ...result.hunter, xp, hp, recoveryMode }
  result.streaksReset = [...reset]
  result.lines = buildLines(result, quests)
  return result
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function buildLines(r: PenaltyResult, quests: readonly Quest[]): string[] {
  if (r.misses.length === 0) return []
  const titles = r.streaksReset
    .map((id) => quests.find((q) => q.id === id)?.title)
    .filter((t): t is string => Boolean(t))
  const lines = [
    `${plural(r.missedDays.length, "day")} with missed daily quests.`,
    `${plural(r.misses.length, "quest")} failed.`,
    `-${r.xpLost} XP`,
    `-${r.hpLost} HP`,
  ]
  if (r.hpRecovered > 0) lines.push(`+${r.hpRecovered} HP recovered on active days.`)
  if (titles.length > 0) lines.push(`Streaks reset: ${titles.join(", ")}.`)
  if (r.enteredRecovery) {
    lines.push("HP depleted. RECOVERY MODE engaged.", "XP gain suspended until your next completion.")
  }
  return lines
}
