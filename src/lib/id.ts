/** UUID v4 for every record id. */
export function newId(): string {
  return crypto.randomUUID()
}
