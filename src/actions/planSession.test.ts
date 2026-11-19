import { beforeEach, describe, expect, it } from "vitest"
import { STARTER_PROGRAMME } from "../db/seed"
import { workoutRepo } from "../repo/workoutRepo"
import { resetDb } from "../test/db"
import { loadStarterProgramme, nextUp, planTargets } from "./planSession"

beforeEach(resetDb)

describe("planSession", () => {
  it("has no next day until a programme exists", async () => {
    expect(await nextUp()).toBeNull()
  })

  it("rotates through the programme in order, waiting for missed days", async () => {
    const [a, l] = await loadStarterProgramme()
    expect((await nextUp())!.template.name).toBe(STARTER_PROGRAMME[0].name)
    await workoutRepo.create({ date: "2026-11-02", notes: "", templateId: a.id }, [])
    expect((await nextUp())!.template.name).toBe("Legs")
    await workoutRepo.create({ date: "2026-11-04", notes: "", templateId: l.id }, [])
    expect((await nextUp())!.template.name).toBe("Upper Volume")
  })

  it("plans targets from history, with separate progress for swap options", async () => {
    await workoutRepo.create({ date: "2026-11-01", notes: "" }, [
      { exerciseName: "Back squat", reps: 8, weightKg: 100 },
      { exerciseName: "Back squat", reps: 8, weightKg: 100 },
      { exerciseName: "Back squat", reps: 8, weightKg: 100 },
      { exerciseName: "Back squat", reps: 8, weightKg: 100 },
    ])
    const targets = await planTargets(STARTER_PROGRAMME[1].exercises)
    expect(targets["Back squat"]).toMatchObject({ weightKg: 105, status: "up" })
    expect(targets["Leg press"]).toMatchObject({ status: "new", weightKg: undefined })
  })
})
