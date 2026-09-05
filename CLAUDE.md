# THE SYSTEM — Project Instructions

A solo-hunter progression PWA. Habitica mechanics, Solo Leveling presentation.
Single user, offline-first, installable to a phone home screen.

## Non-negotiables
- **No component touches Dexie directly.** All reads/writes go through `src/repo/*.ts`.
- **Game logic is pure.** Everything in `src/engine/` is pure functions over plain
  objects — no React, no Dexie, no Date.now() (pass `today: string` in). Unit tested.
- **Every record carries a sync seam**: `id` (uuid), `createdAt`, `updatedAt`, `deleted: 0|1`.
  Never hard-delete. This lets us bolt on Supabase later without a rewrite.
- **All tunables live in `src/engine/constants.ts`.** No magic numbers anywhere else.
- Mobile-first. Base font 18px, min tap target 56×56px, primary actions thumb-reachable.

## Stack
Vite + React 18 + TypeScript · Tailwind · Dexie 4 · Zustand (UI state only) ·
Recharts · vite-plugin-pwa · Vitest

## Day rollover
The "day" starts at 04:00 local. `todayKey()` in `src/lib/date.ts` returns `YYYY-MM-DD`
adjusted for this. Never call `new Date().toISOString().slice(0,10)` anywhere else.

---

## Schema (`src/db/schema.ts`)

```ts
hunter        id, level, xp, hp, maxHp, rank, statPoints,
              str, agi, vit, int, per, title, recoveryMode, lastSeenDate
quests        id, title, type:'daily'|'task'|'habit', difficulty:'E'..'S',
              stat:'str'|'agi'|'vit'|'int'|'per', dungeonId?, dueAt?,
              streak, bestStreak, lastCompletedOn, active
completions   id, questId, date, xpAwarded, statAwarded
dungeons      id, name, description, bossName, deadline, status:'active'|'cleared'|'failed'
workouts      id, templateId?, date, notes
workoutSets   id, workoutId, exerciseName, reps?, weightKg?, distanceKm?, durationMin?
templates     id, name, exercises: {name, targetSets?, targetReps?, targetDistanceKm?, targetDurationMin?}[]
nutrition     id, date (unique idx), calories, goal
vitals        id, date (unique idx), weightKg?, sleepHours?, waterMl?
achievements  id, code, unlockedAt
settings      id:'singleton', calorieGoal, penaltyEnabled, soundEnabled, dayRolloverHour
```

---

## Engine rules

### XP
```ts
xpToNext(level) = Math.round(100 * level ** 1.5)
```

Award for a completion:
```ts
xp = round(BASE_XP[difficulty] * (1 + level * 0.1) * streakMultiplier * habitDecay)
streakMultiplier = 1 + min(streak, 30) * 0.02        // caps 1.6x
```

| difficulty | BASE_XP | statPoints |
|---|---|---|
| E | 10 | 0 |
| D | 25 | 1 |
| C | 50 | 1 |
| B | 100 | 2 |
| A | 200 | 3 |
| S | 400 | 5 |

**Level up:** loop while `xp >= xpToNext(level)` — subtract, `level++`,
`statPoints += 3`, `maxHp += 10`, `hp = maxHp`. Emit one panel per level gained,
queued not stacked.

### Anti-farm caps (enforce in repo layer, surface as UI errors)
- Max **3** active `daily` quests
- Max **8** active `task` quests
- `habit` completions decay within a day: 1st = 100%, 2nd = 50%, 3rd = 25%, 4th+ = 0 XP

### Penalty engine (`engine/penalty.ts`)
Runs on app open. Iterates every date from `hunter.lastSeenDate` to `todayKey()`, exclusive of today.

For each missed date, per daily quest with no completion:
- `xp -= floor(xpToNext(level) * 0.10)`, floored at 0 — **never de-level**
- `hp -= 20`
- `quest.streak = 0`

Then:
- `hp <= 0` → `recoveryMode = true`, hp = 0. All XP gain blocked, stat points locked,
  UI shifts to `--danger`. Clears on the next completion of any kind.
- Any day with ≥1 completion → `hp = min(maxHp, hp + 10)`
- Batch the whole catch-up into **one** `⚠ SYSTEM PENALTY` panel. Never fire a barrage.
- Respect `settings.penaltyEnabled`.

### Ranks (`engine/rank.ts`)
Rank-up is an **assessment**, not accumulation. It requires level AND conditions.
Rank never demotes. When level threshold is met but conditions aren't, hunter sits at
the ceiling and the UI shows the outstanding requirements as a checklist.

| Rank | Level | Conditions |
|---|---|---|
| E | 1 | — |
| D | 10 | 14-day daily streak |
| C | 20 | 30-day streak, 20 workouts |
| B | 35 | 60-day streak, 1 dungeon cleared |
| A | 50 | 90-day streak, 3 dungeons, calorie goal met 60 of last 90 days |
| S | 75 | 180-day streak, 10 dungeons |

"Streak" here = the longest current streak across active daily quests.

### Stats (`engine/stats.ts`)
Accumulate raw units, convert at 1 stat point per 10 units. Thresholds in constants.
- STR ← `weightKg * reps / 100` summed across sets
- VIT ← `durationMin / 10`
- AGI ← `distanceKm`
- Quest completions → the stat tagged on that quest

---

## Screens — bottom tab bar, 5 tabs

1. **STATUS** — hunter card, HP + XP bars, stat radar chart, rank badge with
   assessment checklist, stat point allocation
2. **QUESTS** — Daily Quest block pinned top with countdown to 04:00 rollover;
   then tasks, then habits. Swipe-right completes, long-press edits.
3. **TRAINING** — start from template or freestyle. Big +/- steppers, avoid raw
   keyboard input. Session history below.
4. **VITALS** — large calorie ring (today vs goal) with quick-add chips
   (+100 / +250 / +500) and a manual field. Weight, sleep, water below.
5. **RECORDS** — dungeons, achievements, weekly Recharts, streak heatmap calendar,
   JSON export/import.

## Visual system
```css
--bg: #05070d;      --panel: rgba(16,32,58,0.72);
--border: #2f7fd4;  --glow: #4da8ff;
--accent: #7fd4ff;  --xp: #00e5ff;      --danger: #ff3b52;
```
- Panels: 1px `--border`, `box-shadow: 0 0 24px rgba(77,168,255,.35)`, backdrop-blur,
  notched corners via `clip-path` (top-left + bottom-right)
- Headings Rajdhani/Orbitron, body Inter
- `<SystemPanel>`: fixed overlay, scale-in + typewriter reveal, optional ping,
  tap to dismiss, **queued** so multiple events play in sequence
- Honour `prefers-reduced-motion` — skip typewriter and scale, fade only

---

## Build order — one commit per step, tests before UI

1. Scaffold Vite+TS+Tailwind, theme tokens, `lib/date.ts` with `todayKey()`
2. `db/schema.ts`, `db/seed.ts`, `engine/constants.ts`
3. `engine/xp.ts` + `engine/rank.ts` + Vitest suites — **stop and show me the tests**
4. `engine/penalty.ts` + `engine/stats.ts` + tests
5. `repo/*.ts` wrapping Dexie, enforcing quest caps
6. Status screen + `SystemPanel` component
7. Quests screen, completion flow, streaks, habit decay
8. Wire penalty engine to app-open, batched panel
9. Training + templates
10. Vitals
11. Records, charts, achievements
12. PWA manifest, icons, offline shell
13. JSON export/import

## Working style
- Stop after step 3 and step 5 for review before continuing.
- Ask before adding any dependency not listed above.
- No placeholder or mock data outside `db/seed.ts`.
- Prefer small files. One screen per file, one engine concern per file.
