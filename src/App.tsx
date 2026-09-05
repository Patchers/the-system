import { useEffect, useState } from "react"
import { runRankAssessment } from "./actions/promote"
import { SystemPanel } from "./components/SystemPanel"
import { TabBar, type Tab } from "./components/TabBar"
import { bootstrap } from "./repo/bootstrap"
import { hunterRepo } from "./repo/hunterRepo"
import { useLive } from "./repo/useLive"
import { PendingScreen } from "./screens/PendingScreen"
import { StatusScreen } from "./screens/StatusScreen"
import { usePanelStore } from "./store/panelStore"

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>("STATUS")
  const hunter = useLive(() => (ready ? hunterRepo.get() : undefined), [ready])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { seeded } = await bootstrap()
      if (cancelled) return
      if (seeded) {
        usePanelStore.getState().push({
          title: "SYSTEM INITIALISED",
          lines: ["You have been registered as a Hunter.", "Rank E. Level 1.", "Daily quests are now active."],
          ping: true,
        })
      }
      await runRankAssessment()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("recovery", Boolean(hunter?.recoveryMode))
  }, [hunter?.recoveryMode])

  return (
    <>
      <main className="min-h-dvh p-4 pb-24 max-w-lg mx-auto">
        {!ready ? (
          <p className="font-heading tracking-widest opacity-60">CONNECTING TO THE SYSTEM…</p>
        ) : tab === "STATUS" ? (
          <StatusScreen />
        ) : (
          <PendingScreen name={tab} />
        )}
      </main>
      <TabBar active={tab} onChange={setTab} />
      <SystemPanel />
    </>
  )
}
