# Tauri Desktop Transition Decisions

## 2026-06-08 -- Plan Execution Started
- Wave 1: Tasks 1-5 (scaffold, migrations, plugin, DB layer, shared/ui integration)
- Wave 2: Tasks 6-9 (feature migration, local auth, shell)
- Wave 3: Tasks 10-12 (WebDAV sync, sync UI, Windows build)

## 2026-06-08 -- Task 2 Migrations
- SQLite DDL ported directly from `supabase/migrations/001|002|003` into `apps/desktop/src-tauri/migrations/0001|0002|0003` with one canonical type mapping: uuid/timestamptz -> TEXT, numeric -> REAL, boolean/integer -> INTEGER.
- Client (not server) supplies UUIDs and ISO timestamps. Keeps the Rust side free of UUID/timestamp generation helpers and keeps the desktop schema aligned with what the web app already inserts.
- `users` table lives in the CR migration (`0001`) and is reused by the CH migration (`0003`) via shared FK. Single users table, no duplication.
- For seed-style upserts against UNIQUE/PK columns, prefer `INSERT OR REPLACE` over `ON CONFLICT ... DO UPDATE` — fewer moving parts and the original SQL's "always set to this exact row" semantics match.

## 2026-06-08 -- Task 8 Local Auth
- No passwords, no email verification, no Supabase. `signIn(email)` is a single `INSERT OR REPLACE` into the local `users` table plus a `localStorage` write. No magic-link round-trip, no server call. Acceptable for v1 because there is no remote backend and the only threat model is a single-user desktop install.
- `getCurrentUser()` is sync (reads `localStorage`) so React components and route guards can call it during render without a `Suspense` boundary. `requireSessionUser()` is the async entry point for protected routes — it returns `Promise<User>` and throws on missing session, so callers `await` it like the web `requireSessionUser()`.
- Mock auth is localStorage + query-param based (`?mock_session=1`) on desktop, NOT the web `efficiency-memo-mock-auth` cookie. The web cookie contract stays locked per its own AGENTS.md; the desktop mock is a different surface.
- Skipped the optional `auth-context.tsx` React Context file. The spec marked it as optional and the existing call sites (Task 9 shell auth gate, the two CRUD modules) can call `getCurrentUser()` / `requireSessionUser()` directly. If a consumer needs reactive auth state later, the cleanest path is a `useSyncExternalStore` hook built on top of the existing `localStorage` key — add it then, not preemptively.
- The `pnpm --filter desktop build` step currently fails with a pre-existing `component-loader.ts` → `pages/device-list-page` import error from Task 6. NOT fixed here (out of scope). `tsc --noEmit` (the `typecheck` step) passes clean, which is the contract this task is responsible for.


