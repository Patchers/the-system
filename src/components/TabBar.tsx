export const TABS = ["STATUS", "QUESTS", "TRAINING", "VITALS", "RECORDS"] as const
export type Tab = (typeof TABS)[number]

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

/** Bottom navigation. Every tab is a 56px-tall thumb target. */
export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      aria-label="Sections"
      className="fixed bottom-0 inset-x-0 z-40 flex bg-[var(--bg)]/95 border-t border-[var(--border)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const on = tab === active
        return (
          <button
            key={tab}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(tab)}
            className={`flex-1 font-heading text-xs tracking-widest transition-colors ${
              on ? "text-[var(--accent)] border-t-2 border-[var(--glow)]" : "text-[var(--accent)]/50 border-t-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        )
      })}
    </nav>
  )
}
