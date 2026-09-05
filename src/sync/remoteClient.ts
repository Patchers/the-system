/**
 * Minimal shape the sync engine needs from a Postgrest-style client.
 * The real Supabase client satisfies this structurally, so production code
 * passes it straight through; tests pass a small fake instead.
 */
export interface RemoteError {
  message: string
}

export interface RemoteTable {
  select(columns: string): PromiseLike<{ data: unknown[] | null; error: RemoteError | null }>
  upsert(rows: unknown[]): PromiseLike<{ error: RemoteError | null }>
}

export interface RemoteClient {
  from(table: string): RemoteTable
}
