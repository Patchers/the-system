import { useState, type FormEvent } from "react"
import { Bar } from "../components/Bar"
import { CalorieRing } from "../components/CalorieRing"
import { Stepper } from "../components/Stepper"
import { WATER_TARGET_ML } from "../engine/constants"
import { todayKey } from "../lib/date"
import { nutritionRepo } from "../repo/nutritionRepo"
import { settingsRepo } from "../repo/settingsRepo"
import { useLive } from "../repo/useLive"
import { vitalsRepo } from "../repo/vitalsRepo"
import { useToastStore } from "../store/toastStore"

const QUICK_ADD = [100, 250, 500]
const WATER_ADD = [250, 500]

export function VitalsScreen() {
  const today = todayKey()
  const data = useLive(async () => {
    const [settings, nutrition, vitals] = await Promise.all([
      settingsRepo.get(),
      nutritionRepo.getForDate(today),
      vitalsRepo.getForDate(today),
    ])
    return { settings, nutrition, vitals }
  }, [today])
  const showToast = useToastStore((s) => s.show)
  const [manual, setManual] = useState("")
  const [editGoal, setEditGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(0)
  const [weight, setWeight] = useState<number | null>(null)
  const [sleep, setSleep] = useState<number | null>(null)

  if (!data) return null
  const goal = data.settings.calorieGoal
  const calories = data.nutrition?.calories ?? 0

  const addCalories = async (n: number) => {
    await nutritionRepo.addCalories(today, n, goal)
    showToast(`${n > 0 ? "+" : ""}${n} KCAL`)
  }

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const n = Math.round(Number(manual))
    if (!Number.isFinite(n) || n === 0) return
    setManual("")
    void addCalories(n)
  }

  const saveGoal = async () => {
    await settingsRepo.update({ calorieGoal: goalDraft })
    if (data.nutrition) await nutritionRepo.setCalories(today, data.nutrition.calories, goalDraft)
    setEditGoal(false)
    showToast("GOAL UPDATED")
  }

  const saveBody = async () => {
    await vitalsRepo.upsert(today, {
      ...(weight !== null ? { weightKg: weight } : {}),
      ...(sleep !== null ? { sleepHours: sleep } : {}),
    })
    setWeight(null)
    setSleep(null)
    showToast("VITALS SAVED")
  }

  const weightValue = weight ?? data.vitals?.weightKg ?? 70
  const sleepValue = sleep ?? data.vitals?.sleepHours ?? 7
  const water = data.vitals?.waterMl ?? 0
  const chip = "font-heading tracking-widest border border-[var(--border)]"

  return (
    <div className="flex flex-col gap-5">
      <section className="sys-panel p-5 flex flex-col gap-4" aria-labelledby="cal-heading">
        <header className="flex justify-between items-baseline">
          <h1 id="cal-heading" className="text-xl">
            Calories
          </h1>
          <button
            type="button"
            onClick={() => {
              setGoalDraft(goal)
              setEditGoal((v) => !v)
            }}
            className="text-xs font-heading tracking-widest opacity-70 min-h-0 min-w-0 px-2"
          >
            {editGoal ? "CLOSE" : "GOAL"}
          </button>
        </header>

        {editGoal ? (
          <div className="flex flex-col gap-3">
            <Stepper label="GOAL" value={goalDraft} onChange={setGoalDraft} step={50} min={500} max={10000} unit="kcal" />
            <button type="button" onClick={saveGoal} className="font-heading tracking-widest border border-[var(--xp)] text-[var(--xp)]">
              SAVE GOAL
            </button>
          </div>
        ) : (
          <CalorieRing calories={calories} goal={goal} />
        )}

        <div className="grid grid-cols-3 gap-2">
          {QUICK_ADD.map((n) => (
            <button key={n} type="button" onClick={() => void addCalories(n)} className={chip}>
              +{n}
            </button>
          ))}
        </div>
        <form onSubmit={submitManual} className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Manual amount"
            aria-label="Manual calories"
            className="flex-1 min-w-0 bg-black/40 border border-[var(--border)] px-3 min-h-14 font-display"
          />
          <button type="submit" className={chip + " px-4"}>
            ADD
          </button>
        </form>
      </section>

      <section className="sys-panel p-5 flex flex-col gap-4" aria-labelledby="body-heading">
        <h2 id="body-heading" className="text-lg">
          Body
        </h2>
        <Stepper label="WEIGHT" value={weightValue} onChange={setWeight} step={0.1} min={20} max={400} unit="kg" />
        <Stepper label="SLEEP" value={sleepValue} onChange={setSleep} step={0.5} min={0} max={24} unit="h" />
        <button
          type="button"
          disabled={weight === null && sleep === null}
          onClick={saveBody}
          className="font-heading tracking-widest border border-[var(--xp)] text-[var(--xp)] disabled:opacity-30"
        >
          SAVE
        </button>
        <p className="text-xs opacity-60 font-heading tracking-widest">
          TODAY: {data.vitals?.weightKg !== undefined ? `${data.vitals.weightKg} KG` : "NO WEIGHT"} ·{" "}
          {data.vitals?.sleepHours !== undefined ? `${data.vitals.sleepHours} H SLEEP` : "NO SLEEP"}
        </p>
      </section>

      <section className="sys-panel p-5 flex flex-col gap-4" aria-labelledby="water-heading">
        <h2 id="water-heading" className="text-lg">
          Water
        </h2>
        <Bar label="HYDRATION" value={water} max={WATER_TARGET_ML} color="var(--glow)" unit="ml" />
        <div className="grid grid-cols-2 gap-2">
          {WATER_ADD.map((n) => (
            <button
              key={n}
              type="button"
              onClick={async () => {
                await vitalsRepo.addWater(today, n)
                showToast(`+${n} ML`)
              }}
              className={chip}
            >
              +{n} ml
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
