import { useToastStore } from "../store/toastStore"

export function Toast() {
  const message = useToastStore((s) => s.message)
  if (!message) return null
  return (
    <div role="status" className="fixed inset-x-0 z-40 flex justify-center pointer-events-none px-4" style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}>
      <span className="sys-panel panel-enter px-5 py-3 font-heading tracking-widest text-[var(--xp)]">{message}</span>
    </div>
  )
}
