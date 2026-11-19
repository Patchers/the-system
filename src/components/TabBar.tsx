import type { ReactNode } from "react"

export const TABS = ["STATUS", "QUESTS", "TRAINING", "VITALS", "RECORDS"] as const
export type Tab = (typeof TABS)[number]

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

/** Line icons, 24px grid, square caps to match the angular panels. */
const ICONS: Record<Tab, ReactNode> = {
  STATUS: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c.9-4.2 3.8-6.3 7.5-6.3s6.6 2.1 7.5 6.3" />
    </>
  ),
  QUESTS: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" />
      <path d="M9 4.5V2.8h6v1.7" />
      <path d="M8.5 13.2l2.6 2.6 4.4-5" />
    </>
  ),
  TRAINING: <path d="M2.8 9.5v5M6 7v10M18 7v10M21.2 9.5v5M6 12h12" />,
  VITALS: <path d="M2.5 12.5h4.2l2.6-6.6 4 12.2 2.6-5.6h5.6" />,
  RECORDS: <path d="M5 20.5V11.5M12 20.5V4M19 20.5V14.5M3 20.5h18" />,
}

/** Bottom navigation. Every tab is a thumb-sized target with an icon and label. */
export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav aria-label="Sections" className="tabbar">
      <div className="mx-auto max-w-lg flex">
        {TABS.map((tab) => {
          const on = tab === active
          return (
            <button key={tab} type="button" aria-current={on ? "page" : undefined} onClick={() => onChange(tab)} className={`tab ${on ? "tab-on" : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[tab]}
              </svg>
              <span>{tab}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
