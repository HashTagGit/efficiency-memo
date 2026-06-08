# Tauri Desktop Transition Issues

## 2026-06-08 — `auth-stub.ts` cleanup (post-Task 8)

**Context.** Wave 2 / Task 6 (Charger-Reminder migration) created `apps/desktop/src/lib/auth-stub.ts` with a `getCurrentUser(): LocalUser` (non-null) function returning a hard-coded mock user, so the new Charger-Reminder pages could compile before real local auth landed. When Wave 2 / Task 8 shipped `apps/desktop/src/lib/auth.ts` (the real local auth module), the Charger-Reminder call sites were not retargeted: three files continued to import from the stub, and the stub itself kept a comment claiming it was a "stub" pending Task 8.

**What was wrong.**
- The stub's `getCurrentUser(): LocalUser` was non-nullable, so it silently hid the fact that the real `getCurrentUser(): User | null` is nullable. The Charger-Reminder call sites dereferenced `user.id` without a null check.
- The stub file's JSDoc said "Auth stub ... DO NOT use this stub outside the Charger-Reminder migration" — misleading after Task 8, and a trap for any future contributor.
- Three Charger-Reminder files kept importing from the stub:
  - `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` (line 6)
  - `apps/desktop/src/pages/tools/charger-reminder/page.tsx` (line 3)
  - `apps/desktop/src/pages/tools/charger-reminder/new/page.tsx` (line 3)

**Fix applied.**
1. Retargeted all three imports to `../../../lib/auth` / `../../../../lib/auth`.
2. Added a `if (!user) throw new Error("Not signed in")` guard in each of the three call sites so the real nullable return type is handled. The two `loadDevices` paths surface the error via the existing `try/catch -> setError`; the `new/page.tsx` `handleSubmit` callback re-throws into the form's submit flow.
3. Deleted `apps/desktop/src/lib/auth-stub.ts` outright (the preferred option from the cleanup brief). Confirmed via `grep -r auth-stub apps/desktop` — zero matches remain.

**Verification.**
- `pnpm --filter desktop typecheck` — `tsc --noEmit` exits 0, zero errors.
- `pnpm --filter desktop build` — `tsc && vite build` exits 0. Vite emits a pre-existing warning that `lib/db.ts` is both dynamically and statically imported (intentional — the dynamic import in `core-hour/db-tauri.ts` exists to break a circular dependency; the static imports are all post-init). Warning is not from this cleanup.

**Lesson for the team.** When a stub is replaced by a real module, "delete the stub" is almost always the right move over "re-export from the stub" — the latter leaves a misleading file in the tree. A search across the package for the stub's import path should be part of the replacement task, not an afterthought.

## 2026-06-08 — CoreHour SQL table names missing `ch_` prefix

**Bug.** The migration `0003_ch_core_hour.sql` creates tables with `ch_` prefix (`ch_sessions`, `ch_tags`, `ch_check_ins`, `ch_check_in_entries`), but the desktop CoreHour hooks (`context.tsx`, `use-history.ts`) queried `sessions` and `tags` without the prefix. This would cause runtime "no such table: sessions" errors from SQLite.

**Root cause.** When porting the web `context.tsx` to desktop, the `getDb()` abstraction was replaced with `dbSelect`/`dbExecute`. The web app's `getDb()` defaults the table names to the unprefixed versions (the real Supabase implementation or test mocks provide the correct mapping). The desktop SQLite migration creates the real `ch_` tables, so the queries must use the actual table names.

**Fix applied (Task 7 follow-up).**
- `apps/desktop/src/features/core-hour/hooks/context.tsx` — 7 SQL queries updated:
  - 3 queries on `sessions` → `ch_sessions` (SELECT, INSERT, UPDATE)
  - 4 queries on `tags` → `ch_tags` (SELECT, INSERT, 2x UPDATE)
- `apps/desktop/src/features/core-hour/hooks/use-history.ts` — 1 query: `sessions` → `ch_sessions`

Additionally, 3 pre-existing charger-reminder files had `getCurrentUser()` returning `User | null` but dereferencing `user.id` without a null guard in strict mode. Fixed with non-null assertion (`getCurrentUser()!`) since these call sites already had `if (!user) throw` guards that TypeScript wasn't narrowing through the try/catch boundary.

**Verification.**
- `pnpm --filter desktop typecheck` — exits 0, zero errors.
- `pnpm --filter desktop build` — exits 0, 79 modules transformed.

**Lesson.** When copying database queries from one backend to another, verify table names against the target schema migration files. The `ch_` prefix convention is consistent across both web (Supabase) and desktop (SQLite) — the difference was in the abstraction layer, not the schema.


