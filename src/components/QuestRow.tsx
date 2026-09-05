import { useRef, useState, type PointerEvent } from "react"
import type { Quest } from "../db/types"
import { HABIT_DECAY } from "../engine/constants"
import { habitDecay } from "../engine/xp"

const SWIPE_COMPLETE_PX = 80
const SWIPE_MAX_PX = 140
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 8

interface QuestRowProps {
  quest: Quest
  done: boolean
  /** Habit completions so far today. */
  countToday: number
  onComplete: (quest: Quest) => void
  onEdit: (quest: Quest) => void
}

/** One quest. Swipe right to complete, long-press to edit, or use the button. */
export function QuestRow({ quest, done, countToday, onComplete, onEdit }: QuestRowProps) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return
    start.current = { x: e.clientX, y: e.clientY }
    longPressed.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* synthetic or already-released pointer */
    }
    timer.current = setTimeout(() => {
      longPressed.current = true
      setDx(0)
      onEdit(quest)
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current || longPressed.current) return
    const mx = e.clientX - start.current.x
    const my = e.clientY - start.current.y
    if (Math.abs(mx) > MOVE_TOLERANCE_PX || Math.abs(my) > MOVE_TOLERANCE_PX) cancelTimer()
    if (!done) setDx(Math.max(0, Math.min(SWIPE_MAX_PX, mx)))
  }

  const onPointerUp = () => {
    cancelTimer()
    if (!longPressed.current && dx >= SWIPE_COMPLETE_PX && !done) onComplete(quest)
    setDx(0)
    start.current = null
  }

  const nextHabitPct = quest.type === "habit" ? Math.round(habitDecay(countToday) * 100) : null
  const habitExhausted = quest.type === "habit" && countToday >= HABIT_DECAY.length

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative select-none"
      style={{ touchAction: "pan-y" }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 flex items-center pl-4 font-heading tracking-widest text-[var(--xp)]"
        style={{ opacity: Math.min(1, dx / SWIPE_COMPLETE_PX) }}
      >
        COMPLETE
      </div>
      <div
        className={`sys-panel flex items-center gap-3 p-3 pl-4 transition-transform ${done ? "opacity-50" : ""}`}
        style={{ transform: `translateX(${dx}px)`, transitionDuration: dx ? "0ms" : "150ms" }}
      >
        <span
          className="font-heading text-xl w-8 h-8 flex items-center justify-center border border-[var(--border)] shrink-0"
          aria-label={`Difficulty ${quest.difficulty}`}
        >
          {quest.difficulty}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`truncate ${done ? "line-through" : ""}`}>{quest.title}</p>
          <p className="text-xs opacity-70 font-heading tracking-widest">
            {quest.stat.toUpperCase()}
            {quest.type !== "task" && quest.streak > 0 && ` · STREAK ${quest.streak}`}
            {quest.type === "habit" && countToday > 0 && ` · TODAY ×${countToday}`}
            {quest.type === "habit" && !habitExhausted && ` · NEXT ${nextHabitPct}%`}
            {habitExhausted && " · NO MORE XP TODAY"}
            {quest.type === "task" && quest.dueAt && ` · DUE ${quest.dueAt}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onComplete(quest)}
          disabled={done}
          aria-label={done ? `${quest.title} completed` : `Complete ${quest.title}`}
          className={`shrink-0 font-heading text-2xl border ${
            done ? "border-[var(--xp)] text-[var(--xp)]" : "border-[var(--border)] active:bg-[var(--glow)]/30"
          }`}
        >
          ✓
        </button>
      </div>
    </div>
  )
}
