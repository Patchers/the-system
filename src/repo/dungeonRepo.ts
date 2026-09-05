import { db } from "../db/schema"
import { stamp, tombstone, touch } from "../db/record"
import type { Dungeon, DungeonStatus } from "../db/types"
import { nowIso } from "../lib/date"
import { RepoError } from "./errors"

export type NewDungeon = Pick<Dungeon, "name" | "description" | "bossName" | "deadline">
export type DungeonPatch = Partial<NewDungeon>

const live = (d: Dungeon) => !d.deleted

export const dungeonRepo = {
  async get(id: string): Promise<Dungeon> {
    const d = await db.dungeons.get(id)
    if (!d || d.deleted) throw new RepoError("not-found", "Dungeon not found.")
    return d
  },

  async list(): Promise<Dungeon[]> {
    return db.dungeons.orderBy("deadline").filter(live).toArray()
  },

  async listByStatus(status: DungeonStatus): Promise<Dungeon[]> {
    return db.dungeons.where("status").equals(status).filter(live).toArray()
  },

  async countCleared(): Promise<number> {
    return db.dungeons.where("status").equals("cleared").filter(live).count()
  },

  async add(input: NewDungeon): Promise<Dungeon> {
    const dungeon: Dungeon = { ...stamp(nowIso()), ...input, status: "active" }
    await db.dungeons.add(dungeon)
    return dungeon
  },

  async update(id: string, patch: DungeonPatch): Promise<Dungeon> {
    const next = touch({ ...(await dungeonRepo.get(id)), ...patch }, nowIso())
    await db.dungeons.put(next)
    return next
  },

  async setStatus(id: string, status: DungeonStatus): Promise<Dungeon> {
    const next = touch({ ...(await dungeonRepo.get(id)), status }, nowIso())
    await db.dungeons.put(next)
    return next
  },

  async remove(id: string): Promise<void> {
    await db.dungeons.put(tombstone(await dungeonRepo.get(id), nowIso()))
  },
}
