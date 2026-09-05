import { db } from "../db/schema"
import { stamp, tombstone, touch } from "../db/record"
import type { Template, TemplateExercise } from "../db/types"
import { nowIso } from "../lib/date"
import { RepoError } from "./errors"

const live = (t: Template) => !t.deleted

export const templateRepo = {
  async get(id: string): Promise<Template> {
    const t = await db.templates.get(id)
    if (!t || t.deleted) throw new RepoError("not-found", "Template not found.")
    return t
  },

  async list(): Promise<Template[]> {
    return db.templates.filter(live).toArray()
  },

  async add(name: string, exercises: TemplateExercise[]): Promise<Template> {
    const template: Template = { ...stamp(nowIso()), name, exercises }
    await db.templates.add(template)
    return template
  },

  async update(id: string, patch: Partial<Pick<Template, "name" | "exercises">>): Promise<Template> {
    const next = touch({ ...(await templateRepo.get(id)), ...patch }, nowIso())
    await db.templates.put(next)
    return next
  },

  async remove(id: string): Promise<void> {
    await db.templates.put(tombstone(await templateRepo.get(id), nowIso()))
  },
}
