import { useRegisterSW } from "virtual:pwa-register/react"

/**
 * Service worker status. Confirms the app is installed for offline use and
 * offers a reload when a new build is waiting.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const dismiss = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div role="status" className="fixed bottom-24 inset-x-0 z-40 flex justify-center px-4">
      <div className="sys-panel panel-enter flex items-center gap-3 px-4 py-3">
        <span className="text-sm">{needRefresh ? "A new version is ready." : "Ready to work offline."}</span>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="font-heading tracking-widest text-sm border border-[var(--xp)] text-[var(--xp)] px-3 min-h-0"
          >
            RELOAD
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="font-heading opacity-70 min-h-0 min-w-0 px-2">
          ×
        </button>
      </div>
    </div>
  )
}
