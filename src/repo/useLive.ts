import { liveQuery } from "dexie"
import { useEffect, useState } from "react"

/**
 * Subscribe a component to a repo query. Re-runs whenever any table the
 * query touched changes. This is the only React-facing file that imports Dexie.
 */
export function useLive<T>(querier: () => Promise<T> | T, deps: readonly unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error("useLive", e),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
