# THE SYSTEM

A solo-hunter progression PWA. Habitica mechanics, Solo Leveling presentation.
Single user, offline-first, installable to a phone home screen.

See `CLAUDE.md` for the full specification.

## Commands

    npm install       # once
    npm run dev       # dev server on :5173
    npm test          # Vitest, one pass
    npm run test:watch
    npm run build     # typecheck + production build with service worker
    npm run preview   # serve the built app on :4173 (needed to exercise the PWA)
    npm run icons     # regenerate PWA icons into public/

## Architecture

    src/lib/        date keys (04:00 rollover), ids, formatting, motion, sound
    src/db/         record types, Dexie schema, first-run seed, backup format
    src/engine/     pure game logic: xp, rank, penalty, stats, streak,
                    achievements, charts, nutrition. No React, no Dexie, no clock.
    src/repo/       the only code that touches Dexie. Enforces quest caps,
                    stamps updatedAt, soft-deletes, gathers rank evidence.
    src/actions/    engine + repo together in one transaction, then UI panels.
    src/store/      Zustand, UI state only: panel queue, toast, live session.
    src/components/ presentational pieces
    src/screens/    one file per tab

Components never import Dexie. They read through `useLive`, which subscribes to
a repo query and re-renders when the underlying tables change.

## Data and backup

Everything is stored locally in IndexedDB. Nothing leaves the device.

Every record carries `id`, `createdAt`, `updatedAt` and `deleted: 0 | 1`, and
nothing is ever hard-deleted. Records tombstone instead. Export and import in
the Records tab use that seam: import merges per record, last write wins, so a
restore never overwrites newer local work and deletions survive a round trip.
The same rule will drive a server sync if one is added later.

## Tuning

Every number that shapes the game lives in `src/engine/constants.ts`: the XP
curve, difficulty rewards, streak cap, quest caps, habit decay, penalty rates,
rank requirements, stat conversion rates and rank titles.
