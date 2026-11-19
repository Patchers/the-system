/**
 * Which programme day comes next. No calendar: the least recently trained
 * template is up next, so a missed day simply waits its turn. Pure.
 */
export interface RotationTemplate {
  id: string
  createdAt: string
}

/** `lastUsed` maps template id → date of its most recent logged session. */
export function nextTemplateId(templates: readonly RotationTemplate[], lastUsed: ReadonlyMap<string, string>): string | undefined {
  if (templates.length === 0) return undefined
  const sorted = [...templates].sort((a, b) => {
    const da = lastUsed.get(a.id) ?? ""
    const db = lastUsed.get(b.id) ?? ""
    if (da !== db) return da < db ? -1 : 1
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })
  return sorted[0].id
}
