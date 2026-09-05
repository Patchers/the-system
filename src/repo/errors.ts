export type RepoErrorCode =
  | "daily-cap"
  | "task-cap"
  | "not-found"
  | "recovery-locked"
  | "no-stat-points"
  | "already-done"
  | "inactive"

/** Thrown by the repo layer; surfaced to the user as a UI error. */
export class RepoError extends Error {
  readonly code: RepoErrorCode

  constructor(code: RepoErrorCode, message: string) {
    super(message)
    this.name = "RepoError"
    this.code = code
  }
}

export const isRepoError = (e: unknown): e is RepoError => e instanceof RepoError
