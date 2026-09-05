-- THE SYSTEM — Supabase schema
-- Run this once in your project's SQL Editor (Project → SQL Editor → New query → Run).
-- Mirrors src/db/schema.ts exactly. Every row belongs to one auth user via
-- user_id, enforced by Row Level Security, so this scales to more than one
-- person's data safely even though the app is built for one hunter at a time.

create extension if not exists pgcrypto;

-- One function, reused by every table's trigger, keeps "updatedAt" server-side
-- authoritative on write so clocks skewed between devices can't win a merge.
create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'hunter', 'quests', 'completions', 'dungeons', 'workouts', 'workoutSets',
    'templates', 'nutrition', 'vitals', 'achievements', 'settings'
  ]
  loop
    execute format('drop trigger if exists trg_updated_at on %I', t);
  end loop;
end $$;

-- ---------- hunter ----------
create table if not exists hunter (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  level int not null, xp int not null, hp int not null, "maxHp" int not null,
  rank text not null, "statPoints" int not null,
  str int not null, agi int not null, vit int not null, "int" int not null, per int not null,
  "statUnits" jsonb not null,
  title text not null, "recoveryMode" boolean not null, recoveries int not null default 0,
  "lastSeenDate" text not null
);

-- ---------- quests ----------
create table if not exists quests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  title text not null, type text not null, difficulty text not null, stat text not null,
  "dungeonId" uuid, "dueAt" text,
  streak int not null, "bestStreak" int not null, "lastCompletedOn" text,
  active boolean not null
);

-- ---------- completions ----------
create table if not exists completions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  "questId" uuid not null, date text not null,
  "xpAwarded" int not null, "statAwarded" int not null
);

-- ---------- dungeons ----------
create table if not exists dungeons (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  name text not null, description text not null, "bossName" text not null,
  deadline text not null, status text not null
);

-- ---------- workouts ----------
create table if not exists workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  "templateId" uuid, date text not null, notes text not null
);

-- ---------- workoutSets ----------
create table if not exists "workoutSets" (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  "workoutId" uuid not null, "exerciseName" text not null,
  reps int, "weightKg" numeric, "distanceKm" numeric, "durationMin" numeric
);

-- ---------- templates ----------
create table if not exists templates (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  name text not null, exercises jsonb not null
);

-- ---------- nutrition ----------
create table if not exists nutrition (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  date text not null, calories int not null, goal int not null
);

-- ---------- vitals ----------
create table if not exists vitals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  date text not null, "weightKg" numeric, "sleepHours" numeric, "waterMl" int
);

-- ---------- achievements ----------
create table if not exists achievements (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  code text not null, "unlockedAt" text not null
);

-- ---------- settings ----------
create table if not exists settings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  deleted smallint not null default 0,
  "calorieGoal" int not null, "penaltyEnabled" boolean not null,
  "soundEnabled" boolean not null, "dayRolloverHour" int not null
);

-- Trigger + RLS + realtime, applied identically to every table above.
do $$
declare
  t text;
begin
  foreach t in array array[
    'hunter', 'quests', 'completions', 'dungeons', 'workouts', 'workoutSets',
    'templates', 'nutrition', 'vitals', 'achievements', 'settings'
  ]
  loop
    execute format('create trigger trg_updated_at before update on %I for each row execute function set_updated_at()', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner full access" on %I', t);
    execute format(
      'create policy "owner full access" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
exception
  when duplicate_object then null; -- table already in the realtime publication
end $$;

create index if not exists idx_quests_user on quests(user_id);
create index if not exists idx_completions_user_date on completions(user_id, date);
create index if not exists idx_workoutsets_workout on "workoutSets"("workoutId");
