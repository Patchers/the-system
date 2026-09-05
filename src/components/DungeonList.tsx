import { useState } from "react"
import type { Dungeon } from "../db/types"
import { todayKey } from "../lib/date"
import { dungeonRepo } from "../repo/dungeonRepo"

const STATUS_STYLE: Record<Dungeon["status"], string> = {
  active: "text-[var(--xp)]",
  cleared: "text-[var(--glow)] opacity-70",
  failed: "text-[var(--danger)] opacity-70",
}

/** Dungeons with inline create and clear/fail controls. */
export function DungeonList({ dungeons }: { dungeons: Dungeon[] }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [bossName, setBossName] = useState("")
  const [deadline, setDeadline] = useState("")

  const add = async () => {
    const clean = name.trim()
    if (!clean) return
    await dungeonRepo.add({ name: clean, description: "", bossName: bossName.trim(), deadline: deadline || todayKey() })
    setName("")
    setBossName("")
    setDeadline("")
    setAdding(false)
  }

  const field = "bg-black/40 border border-[var(--border)] px-3 min-h-14 w-full"
  const chip = "font-heading tracking-widest text-sm border px-3"

  return (
    <div className="flex flex-col gap-3">
      {dungeons.length === 0 && !adding && <p className="opacity-70 px-1">No gates opened.</p>}
      {dungeons.map((d) => (
        <article key={d.id} className="sys-panel p-4 flex flex-col gap-2">
          <header className="flex justify-between items-baseline gap-2">
            <h3 className="text-lg truncate">{d.name}</h3>
            <span className={`font-heading text-xs tracking-widest ${STATUS_STYLE[d.status]}`}>{d.status.toUpperCase()}</span>
          </header>
          <p className="text-sm opacity-80">
            {d.bossName && <>Boss: {d.bossName} · </>}Deadline {d.deadline}
          </p>
          {d.status === "active" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void dungeonRepo.setStatus(d.id, "cleared")}
                className={`${chip} border-[var(--xp)] text-[var(--xp)] flex-1`}
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => void dungeonRepo.setStatus(d.id, "failed")}
                className={`${chip} border-[var(--danger)] text-[var(--danger)] flex-1`}
              >
                FAIL
              </button>
            </div>
          )}
        </article>
      ))}

      {adding ? (
        <div className="sys-panel p-4 flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dungeon name" aria-label="Dungeon name" className={field} maxLength={60} autoFocus />
          <input value={bossName} onChange={(e) => setBossName(e.target.value)} placeholder="Boss (optional)" aria-label="Boss name" className={field} maxLength={60} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-heading tracking-widest">Deadline</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Deadline" className={field} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={!name.trim()} className={`${chip} border-[var(--xp)] text-[var(--xp)] flex-1 disabled:opacity-30`}>
              OPEN GATE
            </button>
            <button type="button" onClick={() => setAdding(false)} className={`${chip} border-[var(--border)]`}>
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="sys-panel font-heading tracking-widest text-[var(--xp)]">
          + OPEN A GATE
        </button>
      )}
    </div>
  )
}
