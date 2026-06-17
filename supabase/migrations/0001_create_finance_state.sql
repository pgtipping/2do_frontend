-- Finance app cloud storage: one JSON bundle per user, locked down with RLS.
-- Run once: Supabase Dashboard > SQL Editor > New query > paste this > Run.

create table if not exists public.finance_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-Level Security: a row is readable/writable only by its owner.
alter table public.finance_state enable row level security;

-- (select auth.uid()) is the Supabase-recommended form — evaluated once per query.
create policy "Owners can read their finance row"
  on public.finance_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can insert their finance row"
  on public.finance_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their finance row"
  on public.finance_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
