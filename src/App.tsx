import { Suspense, lazy, useEffect, useState } from "react"
import { checkAchievements } from "./actions/checkAchievements"
import { runRankAssessment } from "./actions/promote"
import { settlePenalties } from "./actions/settlePenalties"
import { SystemPanel } from "./components/SystemPanel"
import { TabBar, type Tab } from "./components/TabBar"
import { Toast } from "./components/Toast"
import { UpdatePrompt } from "./components/UpdatePrompt"
import { watchAuth } from "./lib/authWatch"
import { bootstrap } from "./repo/bootstrap"
import { hunterRepo } from "./repo/hunterRepo"
import { useLive } from "./repo/useLive"
import { PendingScreen } from "./screens/PendingScreen"
import { QuestsScreen } from "./screens/QuestsScreen"
import { TrainingScreen } from "./screens/TrainingScreen"
import { VitalsScreen } from "./screens/VitalsScreen"
import { useAuthStore } from "./store/authStore"
import { usePanelStore } from "./store/panelStore"
import { startSync, stopSync } from "./sync/engine"

const RecordsScreen = lazy(() => import("./screens/RecordsScreen").then((m) => ({ default: m.RecordsScreen })))
const StatusScreen = lazy(() => import("./screens/StatusScreen").then((m) => ({ default: m.StatusScreen })))

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>("STATUS")
  const hunter = useLive(() => (ready ? hunterRepo.get() : undefined), [ready])

  useEffect(() => {
    // The panel queue is global, so events are pushed regardless of whether this
    // particular effect run was cancelled. StrictMode mounts twice in dev and
    // only the run that actually seeded reports seeded: true.
    let cancelled = false
    ;(async () => {
      const { seeded } = await bootstrap()
      if (seeded) {
        usePanelStore.getState().push({
          title: "SYSTEM INITIALISED",
          lines: ["You have been registered as a Hunter.", "Rank E. Level 1.", "Daily quests are now active."],
          ping: true,
        })
      }
      await settlePenalties()
      await runRankAssessment()
      await checkAchievements()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-settle when the app comes back to the foreground or the day rolls over while open.
  useEffect(() => {
    if (!ready) return
    const onVisible = () => {
      if (document.visibilityState === "visible") void settlePenalties()
    }
    document.addEventListener("visibilitychange", onVisible)
    const tick = setInterval(() => void settlePenalties(), 60_000)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(tick)
    }
  }, [ready])

  useEffect(() => {
    document.documentElement.classList.toggle("recovery", Boolean(hunter?.recoveryMode))
  }, [hunter?.recoveryMode])

  useEffect(() => watchAuth(), [])

  const authStatus = useAuthStore((s) => s.status)
  const authUserId = useAuthStore((s) => s.user?.id)

  useEffect(() => {
    if (authStatus === "signedIn" && authUserId) {
      void startSync(authUserId)
    } else {
      stopSync()
    }
    return stopSync
  }, [authStatus, authUserId])

  return (
    <>
      <main className="min-h-dvh p-4 pb-24 max-w-lg mx-auto">
        <Suspense fallback={<p className="font-heading tracking-widest opacity-60">LOADING…</p>}>
        {!ready ? (
          <p className="font-heading tracking-widest opacity-60">CONNECTING TO THE SYSTEM…</p>
        ) : tab === "STATUS" ? (
          <StatusScreen />
        ) : tab === "QUESTS" ? (
          <QuestsScreen />
        ) : tab === "TRAINING" ? (
          <TrainingScreen />
        ) : tab === "VITALS" ? (
          <VitalsScreen />
        ) : tab === "RECORDS" ? (
          <RecordsScreen />
        ) : (
          <PendingScreen name={tab} />
        )}
        </Suspense>
      </main>
      <TabBar active={tab} onChange={setTab} />
      <Toast />
      <UpdatePrompt />
      <SystemPanel />
    </>
  )
}
