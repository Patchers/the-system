import type { StatKey } from "../db/types"
import { allocateStatPoints } from "../engine/stats"
import { RepoError } from "../repo/errors"
import { hunterRepo } from "../repo/hunterRepo"

/** Spend one free stat point. Throws a RepoError the UI can show. */
export async function allocateStat(stat: StatKey): Promise<void> {
  const hunter = await hunterRepo.get()
  const result = allocateStatPoints(hunter, stat)
  if (!result.ok) {
    throw result.reason === "recovery"
      ? new RepoError("recovery-locked", "Stat points are locked in recovery mode.")
      : new RepoError("no-stat-points", "No stat points available.")
  }
  await hunterRepo.save(result.hunter)
}
