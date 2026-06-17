# Supabase Cloud Storage for the Finance App — Design

- Date: 2026-06-01
- Status: Approved (design)

## Problem

Finance data is stored only in the browser (IndexedDB), which is scoped to one
exact origin (scheme + host + port). The Vite dev server's port changes between
sessions, so data saved on one port (e.g. `localhost:5191`) is invisible on
another (`localhost:5173`). Data also can't follow the user across devices or
browsers.

## Goal

Move the finance dataset to a hosted database (Supabase) so it persists across
devices and origins, behind a login so the financial data stays private.
Recover the data stranded on `:5191`.

## Non-goals (deferred)

- Normalized relational tables (we store one JSON bundle per user for now).
- Offline support / local cache mirror.
- Multi-user sharing (single owner; magic-link login locked to one email).

## Architecture

The app already abstracts persistence behind a storage *driver* exposing
`load()` and `save(data)` — see `createIndexedDbStorageDriver` and
`createMemoryStorageDriver` in `src/finance/storage/localFinanceStore.js`. We
add a third driver, `createSupabaseStorageDriver`, with the same interface, and
inject it into `createFinanceRepository({ driver })`. No changes to repository
logic or to the Ledger / Reports / Import / Subscriptions / Categories screens.

### Components

1. **supabaseClient** (new, `src/finance/storage/supabaseClient.js`): builds the
   Supabase browser client from `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Throws a clear error at startup if either is
   missing.
2. **createSupabaseStorageDriver** (new): same `load`/`save` shape as the
   existing drivers.
   - `load()`: select `data` from `finance_state` for the signed-in user;
     return the bundle, or `null` if no row exists yet.
   - `save(data)`: upsert `{ user_id, data, updated_at }` for the signed-in user.
3. **AuthGate** (new): wraps `FinanceImportScreen`. No session → render a single
   email input that calls `supabase.auth.signInWithOtp({ email })` (magic link).
   Clicking the emailed link establishes the session and the app renders. A
   small **Sign out** control calls `supabase.auth.signOut()`.
4. **Restore from backup** (new): a file input in the Import screen that reads a
   backup JSON file, calls the existing `restoreJsonBackup` (`src/finance/backup.js`),
   and writes the bundle via `repository.saveData`. Doubles as the `:5191`
   recovery mechanism.
5. **Driver selection**: the app uses the Supabase driver (login now required).
   The IndexedDB driver stays in the code but is unused by default.

### Data model (Supabase)

Table `public.finance_state`:

- `user_id uuid` primary key, references `auth.users(id)`
- `data jsonb` — the whole finance bundle
- `updated_at timestamptz`

Row-Level Security ON; select/insert/update policies restrict access to
`auth.uid() = user_id`. One row per user holds the entire bundle, mirroring how
the IndexedDB driver stores one record today.

### Data flow

- App start → AuthGate checks session → if signed in, `FinanceImportScreen`
  mounts → `repository.loadData()` → Supabase driver `load()` → returns the
  user's bundle (or defaults if no row yet).
- Any save (import, edit, category, subscription) → repository writes the whole
  bundle → driver `save()` → upsert to Supabase.

### Recovery flow (:5191)

1. Run a second dev server bound to port 5191; open `localhost:5191` → the app
   loads with the stranded IndexedDB data.
2. Export it with **Backup JSON**.
3. In the Supabase version, sign in, then **Restore from backup** with that file
   → writes the bundle to the user's Supabase row.

### Error handling

- Missing env vars → throw at startup with a readable message.
- Network/auth errors on load/save → surface via the existing `errorMessage` UI
  pattern; never silently swallowed.
- Concurrent writes: single user, last-write-wins via upsert (acceptable here).

### Security

- Only the publishable key is in the frontend (safe to expose). The secret key
  is never used client-side.
- RLS is the real guard: a user can read/write only their own row.
- Sign-ups disabled in Supabase after the owner's first login, so only the
  owner's email can authenticate.

### Testing

- Unit-test `createSupabaseStorageDriver` against a mocked Supabase client
  (`load` returns row / null; `save` upserts the bundle).
- Existing repository tests keep using the in-memory driver (unchanged).
- Manual: magic-link login; save an import; reload; confirm persistence;
  restore-from-backup populates the ledger.

## Responsibilities

- **User:** create the Supabase project (done); env vars in `.env.local` (done);
  run `supabase/migrations/0001_create_finance_state.sql` in the Supabase SQL
  editor; disable email sign-ups in Supabase Auth settings after first login.
- **Me:** `supabaseClient`, `createSupabaseStorageDriver`, `AuthGate` + login UI,
  Sign out, Restore-from-backup button, driver wiring, tests; the SQL migration
  file; and the `:5191` recovery.
