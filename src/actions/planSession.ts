import { STARTER_PROGRAMME } from "../db/seed"
import type { Template, TemplateExercise } from "../db/types"
import { isProgressive, nextTarget, type Target } from "../engine/progression"
import { nextTemplateId } from "../engine/rotation"
import { templateRepo } from "../repo/templateRepo"
import { workoutRepo } from "../repo/workoutRepo"

export type Targets = Record<string, Target>

export interface NextUp {
  template: Template
  targets: Targets
}

/**
 * Today's target for every progressive exercise in the plan, and for each of
 * its swap options. A swap option inherits the rep range and increment but
 * keeps its own history and never inherits the start weight.
 */
export async function planTargets(exercises: readonly TemplateExercise[]): Promise<Targets> {
  const lifts = exercises.filter(isProgressive)
  const names = [...new Set(lifts.flatMap((e) => [e.name, ...(e.alternatives ?? [])]))]
  const history = await workoutRepo.liftHistory(names)
  const targets: Targets = {}
  for (const ex of lifts) {
    targets[ex.name] = nextTarget(ex, history.get(ex.name) ?? [])
    for (const alt of ex.alternatives ?? []) {
      if (!(alt in targets)) targets[alt] = nextTarget({ ...ex, name: alt, startWeightKg: undefined }, history.get(alt) ?? [])
    }
  }
  return targets
}

/** The programme day that is up next: the least recently trained progressive template. */
export async function nextUp(): Promise<NextUp | null> {
  const programme = (await templateRepo.list()).filter((t) => t.exercises.some(isProgressive))
  const id = nextTemplateId(programme, await workoutRepo.lastUsedByTemplate())
  const template = programme.find((t) => t.id === id)
  if (!template) return null
  return { template, targets: await planTargets(template.exercises) }
}

export async function loadStarterProgramme(): Promise<Template[]> {
  return templateRepo.addMany(STARTER_PROGRAMME)
}
