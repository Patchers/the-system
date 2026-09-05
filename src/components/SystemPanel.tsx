import { useEffect, useState } from "react"
import { prefersReducedMotion } from "../lib/motion"
import { ping } from "../lib/sound"
import { settingsRepo } from "../repo/settingsRepo"
import { useLive } from "../repo/useLive"
import { usePanelStore } from "../store/panelStore"

const TYPE_MS = 14

/**
 * Fixed overlay that plays queued system events one at a time.
 * Tap once to finish the reveal, tap again to dismiss.
 */
export function SystemPanel() {
  const panel = usePanelStore((s) => s.queue[0])
  const dismiss = usePanelStore((s) => s.dismiss)
  const settings = useLive(() => settingsRepo.get())
  const [shown, setShown] = useState(0)

  const full = panel ? panel.lines.join("\n") : ""
  const done = shown >= full.length

  useEffect(() => {
    if (!panel) return
    if (panel.ping && settings?.soundEnabled !== false) ping()
    if (prefersReducedMotion()) {
      setShown(full.length)
      return
    }
    setShown(0)
    const timer = setInterval(() => {
      setShown((n) => {
        if (n + 1 >= full.length) clearInterval(timer)
        return n + 1
      })
    }, TYPE_MS)
    return () => clearInterval(timer)
    // Re-run only when a new panel becomes visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel?.id])

  if (!panel) return null

  const onTap = () => (done ? dismiss() : setShown(full.length))
  const visible = full.slice(0, shown).split("\n")

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-label={panel.title}
      onClick={onTap}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5"
    >
      <section
        className={`sys-panel panel-enter w-full max-w-md p-6 tone-${panel.tone}`}
        style={{ minHeight: "12rem" }}
      >
        <h2 className="text-xl mb-4 tracking-widest">{panel.title}</h2>
        <div className="whitespace-pre-wrap leading-relaxed font-body">
          {visible.map((line, i) => (
            <p key={i} className="min-h-[1.6em]">
              {line}
              {i === visible.length - 1 && !done && <span className="caret">▌</span>}
            </p>
          ))}
        </div>
        <p className="mt-5 text-xs opacity-60 tracking-widest text-right">{done ? "TAP TO CONTINUE" : "TAP TO SKIP"}</p>
      </section>
    </div>
  )
}
