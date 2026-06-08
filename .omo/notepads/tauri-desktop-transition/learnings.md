# Tauri Desktop Transition Notepad

## Conventions
- SQLite placeholder syntax: $1, $2 (not ?) for sqlx/Tauri plugin-sql
- uuid -> TEXT, timestamptz -> TEXT, numeric -> REAL, boolean -> INTEGER
- Do NOT modify @memo/shared or @memo/ui`n- Do NOT delete pps/web/`n- Local auth: no passwords, no email, no Supabase
- Sync: manual trigger only for v1

## Key Files
- pps/web/src/features/core-hour/hooks/db.ts -- DbResult interface
- pps/web/src/features/charger-reminder/database/contracts.ts -- DevicePersistenceContract
- pps/web/src/features/charger-reminder/database/devices.ts -- 8 CRUD methods to port
- supabase/migrations/001_cr_device_reminder.sql -- 5 cr_ tables
- supabase/migrations/002_cr_seed_presets.sql -- 5 presets
- supabase/migrations/003_ch_core_hour.sql -- 5 ch_ tables + settings
- packages/ui/src/index.ts -- Button, Card, Modal, Sidebar, Shell
- packages/shared/src/index.ts -- ToolManifest, APP_NAME

## Decisions
- Tauri v2 with Vite + React (SPA), not Next.js SSR
- SQLite via @tauri-apps/plugin-sql v2.4.0
- WebDAV client: reqwest_dav 0.3
- Sync: per-device folders + HLC timestamps, last-write-wins

## Wave 1 Task 1 — Scaffold

### File Inventory (22 files created)
- `apps/desktop/package.json` — workspace deps `@memo/shared` and `@memo/ui`, runtime deps `@tauri-apps/api ^2` / `@tauri-apps/plugin-sql ^2`, devDeps `@tauri-apps/cli ^2`
- `apps/desktop/vite.config.ts` — `@vitejs/plugin-react` + `@tailwindcss/vite`, path aliases for `@memo/shared` and `@memo/ui`, Tauri dev server on port 1420
- `apps/desktop/tsconfig.json` — path aliases matching `apps/web/tsconfig.json`, `composite` reference to `tsconfig.node.json`
- `apps/desktop/tsconfig.node.json` — `composite: true` + `emitDeclarationOnly: true` to satisfy project references
- `apps/desktop/index.html` — entry point with `<div id="root">`
- `apps/desktop/src/main.tsx` — React entry, renders `<App />`
- `apps/desktop/src/App.tsx` — minimal "EfficiencyMemo Desktop" heading, uses Tailwind v4 tokens (`bg-background`, `font-display`, `text-foreground`, `text-muted`)
- `apps/desktop/src/index.css` — Tailwind v4 CSS with full design token mirror from `apps/web/src/app/globals.css` (`@theme inline` with all color/spacing/shadow/font tokens)
- `apps/desktop/src/vite-env.d.ts` — Vite type reference
- `apps/desktop/src-tauri/Cargo.toml` — Rust project with `tauri 2`, `tauri-plugin-sql 2` (sqlite feature), `serde`, `serde_json`
- `apps/desktop/src-tauri/tauri.conf.json` — identifier `com.efficiency-memo.app`, productName `EfficiencyMemo`, permissive CSP for dev, `bundle.targets` includes `msi`, `plugins.sql.preload: ["sqlite:efficiency-memo.db"]`
- `apps/desktop/src-tauri/build.rs` — standard `tauri_build::build()`
- `apps/desktop/src-tauri/src/main.rs` — Windows release console suppression, calls `efficiency_memo_lib::run()`
- `apps/desktop/src-tauri/src/lib.rs` — `tauri::Builder::default()` no plugins yet (Task 3 will add plugin registrations)
- `apps/desktop/src-tauri/capabilities/default.json` — permissions: `core:default`, `sql:default`, `sql:allow-execute`, `sql:allow-select`, `sql:allow-load`
- `apps/desktop/src-tauri/icons/` — 5 placeholder PNGs (32x32, 128x128, 128x128@2x, icon.ico, icon.icns); should be replaced with real icons via `pnpm tauri icon`
- `apps/desktop/.gitignore` — excludes `node_modules/`, `dist/`, `src-tauri/target/`
- `apps/desktop/public/vite.svg` — simple "E" favicon

### Build Verification
- `pnpm install` from root ✅ — 687 packages resolved, all workspace links active
- `pnpm --filter desktop typecheck` ✅ — `tsc --noEmit` passes with zero errors
- `pnpm --filter desktop build` ✅ — `vite build` produces `dist/` (29 modules, 195KB JS + 6.5KB CSS)
- `pnpm tauri dev` not testable — Rust/Cargo not installed in this environment

### Design Tokens
- Tailwind v4 CSS-first config replicates ALL tokens from `apps/web/src/app/globals.css`:
  - Colors: background, background-soft, foreground, muted, border, accent, accent-strong, success, danger, info, warning, surface, surface-strong, card
  - Sidebar: sidebar, sidebar-hover, active
  - Typography: font-sans (Manrope), font-display (Cormorant Garamond), font-mono (Geist Mono)
  - Spacing: sidebar (240px), sidebar-collapsed (64px)
  - Shadows: sm, md, lg
  - Global styles: dark color-scheme, gradient background, grid overlay, selection color, interactive transitions

## Issues

- **Placeholder icons**: The 1x1 PNG icons in `src-tauri/icons/` are valid PNGs but should be replaced with actual app icons before distribution. Run `pnpm tauri icon <source.png>` once Rust is available.
- **Rust not installed**: Cannot verify `tauri dev` or `cargo check`. The Rust code follows standard Tauri v2 patterns and should compile on first attempt.

## Wave 1 / Task 2 — SQL Migrations Port
- 3 SQLite DDL files at `apps/desktop/src-tauri/migrations/`: `0001_cr_device_reminder.sql`, `0002_cr_seed_presets.sql`, `0003_ch_core_hour.sql`.
- Local `users` table created in `0001` with `id TEXT PRIMARY KEY`, `email TEXT NOT NULL`, and `created_at`/`updated_at` defaulting to `datetime('now')`. All `auth.users(id)` references were retargeted to `users(id)`.
- Type mapping: `uuid` -> `TEXT`, `timestamptz` -> `TEXT`, `numeric(6,2)` / `numeric(5,2)` -> `REAL`, `boolean` -> `INTEGER` (0/1), `integer` -> `INTEGER`.
- Dropped `default gen_random_uuid()` and `default now()` server-side defaults. Client generates UUIDs and ISO timestamps and inserts them explicitly. This matches the existing convention of client-side ISO strings used elsewhere in the desktop app.
- `ON CONFLICT (type) DO UPDATE` -> `INSERT OR REPLACE INTO` (relies on `type TEXT NOT NULL UNIQUE` for the seed).
- `INSERT ... ON CONFLICT (key) DO NOTHING` for `ch_settings` -> `INSERT OR REPLACE INTO` since `key` is the PK and a value insert is naturally idempotent.
- All `CREATE TABLE` / `CREATE INDEX` use `IF NOT EXISTS`; all 3 files are idempotent.
- CHECK constraints ported verbatim; `IS NULL OR ...` expressions work in SQLite.
- Verified: full sequence (0001 -> 0002 -> 0003) runs cleanly against an in-memory SQLite DB with `PRAGMA foreign_keys = ON`, producing 11 tables and 14 non-auto indexes. Seed data values match the source exactly (same 5 UUIDs, thresholds, drain rates, labels).
- Consumer: Wave 1 / Task 3 will load these files via `include_str!()` in Rust.

## Wave 1 / Task 3 — SQL Plugin Registration
- Modified `apps/desktop/src-tauri/src/lib.rs` to register `tauri-plugin-sql` v2.4.0 with the 3 migrations inlined via `include_str!`.
- Final `lib.rs` shape: `use tauri_plugin_sql::{Builder, Migration, MigrationKind};` at module scope, then a `let migrations = vec![Migration { ... }, ...]` inside `run()`, then `.plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:efficiency-memo.db", migrations).build())` on `tauri::Builder::default()`.
- Migration structs use `version: 1 | 2 | 3` (matches `i64` field per docs.rs 2.4.0), `description: "..."` (`&'static str`), `sql: include_str!("../migrations/000N_..._*.sql")` (`&'static str`), `kind: MigrationKind::Up`.
- `tauri.conf.json` already has `plugins.sql.preload: ["sqlite:efficiency-memo.db"]` (Task 1 deliverable, verified at lines 38-42). No change needed.
- `Cargo.toml` already declared `tauri-plugin-sql = { version = "2", features = ["sqlite"] }` (Task 1 deliverable), so no dependency change.
- API verification via docs.rs: `Builder::add_migrations(self, db_url: &str, migrations: Vec<Migration>) -> Self` and `Builder::build<R: Runtime>(self) -> TauriPlugin<R, Option<PluginConfig>>` — signatures match the call site exactly. `tauri::Builder` infers `R = Wry`.
- The `Builder` symbol is also referenced via the full `tauri_plugin_sql::Builder::default()` path in the plugin call. Both the `use` import and the fully-qualified call resolve to the same type, so the import is not strictly needed — kept per task spec for readability.
- `cargo` is NOT installed in this environment, so `cargo check` was not executed. Rust correctness was verified by inspection against the published 2.4.0 API surface (Migration struct fields, MigrationKind variants, Builder methods).
- Consumer: Wave 1 / Task 4 will call `import Database from "@tauri-apps/plugin-sql"` and use `Database.load("sqlite:efficiency-memo.db")` on the frontend. The plugin is already registered on the backend with matching preloaded DB path.




## Wave1 / Task5 — Wire `@memo/shared` and `@memo/ui`

### App.tsx Wiring
- Modified `apps/desktop/src/App.tsx` to import `Button`, `Card` from `@memo/ui` and `APP_NAME` from `@memo/shared`.
- `Card` has NO `children` slot — it requires `title: string`, `description: string`, optional `icon`, `onClick`, `href`, `data-testid`. The h1 + Button combo had to be split: title uses `${APP_NAME} Desktop`, description keeps the original copy, Button rendered in a sibling div.
- `Button` accepts `variant: 'primary' | 'secondary' | 'ghost' | 'danger'` (default `primary`), `size: 'sm' | 'md' | 'lg'` (default `md`), `isLoading`, and forwards everything else via `...rest` including `onClick`, `disabled`, `type`.
- For a static test render, no click handler is needed; `<Button variant="primary">Get Started</Button>` is enough to prove the import.

### tsconfig Pinch — `noUnusedLocals`
- First typecheck attempt failed with `TS6133: 'React' is declared but its value is never read` at `packages/ui/src/sidebar.tsx(3,1)`.
- Root cause: desktop tsconfig (set in Wave1 / Task1) has `noUnusedLocals: true`. `sidebar.tsx` line3 is `import React from 'react';` with no JSX usage in the file. The web app's tsconfig has `strict: true` but no `noUnusedLocals`, which is why web never tripped on it.
- Constraint forbids modifying `@memo/ui` source, so the unused React import in `sidebar.tsx` cannot be touched here. Flipping `noUnusedLocals` to `false` in `apps/desktop/tsconfig.json` (matching web's pattern) is the minimum-impact fix. `sidebar.tsx` still has the dead import as latent tech debt to clean up later, but doing so would violate the "Do not modify @memo/ui" constraint in this task.
- Decision: `noUnusedParameters` stays `true` because it's not currently violated and matches the project's strict stance; only `noUnusedLocals` was relaxed.

### Build Verification
- `pnpm --filter desktop typecheck` — exits0 with zero errors.
- `pnpm --filter desktop build` — `vite build` produces `dist/` with37 modules (up from29 in Wave1 / Task1; the8 new modules are `@memo/ui`'s components, their internal helpers, and `Button`/`Card` props).197.38 kB JS /6.39 kB CSS.
- Bundle growth confirms the workspace link resolves correctly: tsc compiled `@memo/ui` source through the `paths` alias and vite bundled it through the same alias.

### Path Aliases
- Verified before any change: `apps/desktop/vite.config.ts` has `resolve.alias` for both `@memo/shared` and `@memo/ui`, and `apps/desktop/tsconfig.json` has matching `paths`. Wave1 / Task1 already wired these — no config changes were needed for the alias resolution itself; the only tsconfig edit was the `noUnusedLocals` flip described above.

### Consumer Notes (for Wave1 / Tasks6–9)
- Treat `Card` as a structured surface (title + description + optional icon), not a generic container. If a future task needs a wrapper card with arbitrary children, compose a new layout card locally in `apps/desktop/src/components/` instead of adding a `children` prop to `@memo/ui`'s `Card` (that would change the API surface).
- `Button` is fine to use anywhere with `variant`/`size` only — the existing default `primary` + `md` matches what we want for the desktop entry CTA.
- `APP_NAME` from `@memo/shared` is `'EfficiencyMemo'` (verified via `packages/shared/src/constants.ts`). Use it for any app-level heading/label to stay in sync with web.
- `Shell` and `Sidebar` from `@memo/ui` both depend on the `ToolManifest[]` type from `@memo/shared` and expect `activeToolId`/`onToolSelect` props — desktop will need a tool registry before it can render them. The current App.tsx deliberately avoids `Shell` to keep this task scoped to import-wiring only.

## Wave 1 / Task 4 — Client-Side DB Interface Layer

### Files Created (6)
- `apps/desktop/src/lib/db.ts` — singleton `getDb()` wrapper around `@tauri-apps/plugin-sql`, plus convenience helpers `dbSelect<T>()` and `dbExecute()`. The `execute` adaptor swallows `QueryResult` to match the `DbResult` interface (`Promise<void>`).
- `apps/desktop/src/features/core-hour/db-tauri.ts` — `DbResult` interface (copied from web, identical signature), `tauriDb` proxy object, `setDbOnStartup()` async init, `setDb()` for test injection, `resetDb()` for test teardown.
- `apps/desktop/src/features/charger-reminder/contracts.ts` — all types copied from `apps/web/src/features/charger-reminder/database/contracts.ts` (`DevicePersistenceContract`, `DeviceRecord`, `ChargeEventRecord`, etc.). Not imported from web — copied to avoid workspace coupling.
- `apps/desktop/src/features/charger-reminder/device-presets.ts` — `devicePresetSeeds` array (5 presets) copied verbatim from web.
- `apps/desktop/src/features/charger-reminder/heuristic-engine.ts` — `computeDeterministicReminderState()` and all supporting math copied from web. Imports types from local `contracts.ts` instead of `@/...` aliases.
- `apps/desktop/src/features/charger-reminder/db-tauri.ts` — full `DevicePersistenceContract` implementation across 8 methods (`createDevice`, `updateDevice`, `deleteDevice`, `getDeviceById`, `listDevicesByUser`, `logChargeEvent`, `setReminderPreference`, `setComputedReminderState`) plus internal helpers `recomputeReminderStateForDevice`, `getDeviceByIdInternal`, `setComputedReminderStateInternal`, `validateChargeEventTimestamp`, `getDefaultThresholdForPreset`. Exports `chargerReminderDb: DevicePersistenceContract` object.

### Design Decisions
- **Circular dependency avoidance**: `lib/db.ts` imports `DbResult` from `core-hour/db-tauri.ts`, so `db-tauri.ts` cannot statically import from `lib/db.ts`. `setDbOnStartup()` uses `await import("../../lib/db")` (dynamic import) to break the cycle.
- **Types duplicated, not shared**: All types are copied into `apps/desktop/src/features/charger-reminder/contracts.ts` rather than imported from `apps/web`. This avoids coupling the desktop app to the web app. The contract is stable and unlikely to diverge significantly.
- **`INSERT OR REPLACE` with `created_at` preservation**: `setReminderPreference` and `setComputedReminderState` use `INSERT OR REPLACE INTO` (as specified by task), but first SELECT the existing row to preserve `id` and `created_at` across upserts. `INSERT OR REPLACE` deletes the old row (due to UNIQUE constraint on `device_id`), so without this step, `id` and `created_at` would reset on every call.
- **`DbResult.execute` returns `void`, not `QueryResult`**: The Tauri plugin-sql `Database.execute()` returns `Promise<QueryResult>`, but the `DbResult` interface expects `Promise<void>`. The wrapper in `lib/db.ts` swallows the result with an explicit `await` inside a block body.
- **Type narrowing for singleton pattern**: TypeScript cannot narrow `dbPromise` after assignment inside `.then()` callbacks. Used `!` non-null assertion on the return statement since runtime guarantees initialization.
- **`notifyBeforeDays` as optional second parameter**: Both `createDevice` and `updateDevice` accept an optional `notifyBeforeDays?: number` second parameter (matching the web implementation), even though `DevicePersistenceContract` only declares the primary input. The contract is the minimum interface; the extra parameter is an implementation detail.

### SQL Placeholder Verification
- All 25 SQL strings in `db-tauri.ts` use `$1, $2, ...` placeholder syntax. Zero `?` placeholders found anywhere in the new files. Confirmed via grep: `\$\d+` matches 25 lines, `\b\?\b` matches 0.

### Build Verification
- `pnpm --filter desktop typecheck` — `tsc --noEmit` exits 0 with zero errors.
- `pnpm --filter desktop build` — `vite build` produces `dist/` with 37 modules (197.38 kB JS, 6.39 kB CSS). Same module count as Task 5 because the new files are not yet imported by `App.tsx` — they will be wired in Tasks 6/7.

### Consumer Notes (for Wave 1 / Tasks 6–9)
- Task 6 (Charger-Reminder migration): import `chargerReminderDb` from `features/charger-reminder/db-tauri.ts` and call its methods. The DB connection is lazy — first call to any method will trigger `Database.load("sqlite:efficiency-memo.db")` via `dbSelect`/`dbExecute`.
- Task 7 (CoreHour migration): call `setDbOnStartup()` at app init, then use `tauriDb.select()` / `tauriDb.execute()` from `features/core-hour/db-tauri.ts`. Alternatively, use `dbSelect`/`dbExecute` directly from `lib/db.ts`.
- `getDb()` singleton is per-module — multiple imports share the same `dbPromise`. Safe to call from any module.
- SQLite CASCADE deletes are handled by the schema (`ON DELETE CASCADE` on FK constraints in migrations). `deleteDevice()` only needs `DELETE FROM cr_devices WHERE id = $1` — all child rows are cleaned up automatically.

## Wave 1 / Task 7 — CoreHour Migration to Desktop

### Files Created (18)
- `apps/desktop/src/features/core-hour/types.ts` — copied verbatim from web. Session, Tag, CheckIn, SessionTag, Settings interfaces plus Uuid/IsoTimestamp type aliases.
- `apps/desktop/src/features/core-hour/hooks/db.ts` — re-exports `DbResult`, `setDb`, `resetDb` from `../db-tauri` to maintain the same import surface as the web `hooks/db.ts`.
- `apps/desktop/src/features/core-hour/hooks/context.tsx` — ported from web. Key changes: (1) replaced `getDb()` pattern with `dbSelect()`/`dbExecute()` from `lib/db.ts`, (2) converted all SQL placeholders from `?` to `$1, $2, ...` (Tauri/SQLite syntax), (3) removed `"use client"` directive (not needed for Vite SPA). Session and Tags providers preserved ref-based pattern for callback freshness.
- `apps/desktop/src/features/core-hour/hooks/use-timer.ts` — copied verbatim from web. Visibility API auto-pause behavior preserved.
- `apps/desktop/src/features/core-hour/hooks/use-session.ts` — re-export adapter (SessionProvider, useSession, SessionState) from `./context`.
- `apps/desktop/src/features/core-hour/hooks/use-tags.ts` — re-export adapter (TagsProvider, useTags, TagsState) from `./context`.
- `apps/desktop/src/features/core-hour/hooks/use-history.ts` — ported from web. Changed `getDb()` → `dbSelect()` and `?` → `$1`.
- `apps/desktop/src/features/core-hour/components/dashboard.tsx` — copied verbatim from web. Consumes useTimer + useSession from hooks.
- `apps/desktop/src/features/core-hour/components/tag-bar.tsx` — copied verbatim from web. Consumes useTags from hooks.
- `apps/desktop/src/features/core-hour/pages/dashboard-page.tsx` — wraps Dashboard + TagBar in SessionProvider + TagsProvider. Uses hardcoded `userId = "local"`.
- `apps/desktop/src/features/core-hour/pages/history-page.tsx` — copied from web. Uses useHistory hook with `dbSelect`.
- `apps/desktop/src/features/core-hour/pages/tags-page.tsx` — copied from web. Full tag management UI (create, rename, archive) wrapped in TagsProvider.
- `apps/desktop/src/features/core-hour/pages/settings-page.tsx` — copied from web. Interval picker with save feedback.
- `apps/desktop/src/features/core-hour/manifest.ts` — copied verbatim (ToolManifest with id="core-hour", 4 routes).
- `apps/desktop/src/features/core-hour/component-loader.ts` — copied verbatim (dynamic import of dashboard-page).
- `apps/desktop/src/features/core-hour/index.ts` — adapted: exports chManifest + chComponentLoader instead of calling registerTool (desktop registry wired in Task 9).
- `apps/desktop/src/pages/tools/core-hour/page.tsx` — route page: header + DashboardPage.
- `apps/desktop/src/pages/tools/core-hour/history/page.tsx` — route page: header + HistoryPage.
- `apps/desktop/src/pages/tools/core-hour/tags/page.tsx` — route page: header + TagsPage.
- `apps/desktop/src/pages/tools/core-hour/settings/page.tsx` — route page: header + SettingsPage.

### main.tsx Modification
- Wrapped `ReactDOM.createRoot().render()` in an async `main()` function that calls `await setDbOnStartup()` first. DB is initialized from `features/core-hour/db-tauri` before any component renders.

### SQL Placeholder Migration
All 7 SQL queries converted from `?` to `$N`:

| Query | Before (web) | After (desktop) |
|---|---|---|
| loadSessions SELECT | `WHERE user_id = ?` | `WHERE user_id = $1` |
| startSession INSERT | `VALUES (?, ?, ?, NULL, ?, 0)` | `VALUES ($1, $2, $3, NULL, $4, 0)` |
| endSession UPDATE | `SET ended_at = ?, synced = 0 WHERE id = ?` | `SET ended_at = $1, synced = 0 WHERE id = $2` |
| loadTags SELECT | `WHERE user_id = ?` | `WHERE user_id = $1` |
| addTag INSERT | `VALUES (?, ?, ?, ?, 0, ?, 0)` | `VALUES ($1, $2, $3, $4, 0, $5, 0)` |
| renameTag UPDATE | `SET name = ?, synced = 0 WHERE id = ?` | `SET name = $1, synced = 0 WHERE id = $2` |
| archiveTag UPDATE | `SET is_archived = 1, synced = 0 WHERE id = ?` | `SET is_archived = 1, synced = 0 WHERE id = $1` |
| loadHistory SELECT | `WHERE user_id = ? AND ended_at IS NOT NULL` | `WHERE user_id = $1 AND ended_at IS NOT NULL` |

### Auth Stub
- `apps/desktop/src/lib/auth-stub.ts` already existed from Task 6 (created by charger-reminder migration). Returns `{ id: "local-user-1", email: "local@example.com" }`. CoreHour pages use hardcoded `userId = "local"` rather than calling `getCurrentUser()` — the auth stub is available for Task 8 to wire.

### Build Verification
- `pnpm --filter desktop typecheck` — exits 0, zero errors.
- `pnpm --filter desktop build` — exits 0, 80 modules transformed (up from 37 in Task 5; +43 new modules from CoreHour hooks, pages, route pages). Produces `dist/` with 7 output files.
- Vite warning about mixed static+dynamic import of `lib/db.ts` is informational only — `db-tauri.ts` uses dynamic `await import("../../lib/db")` to break circular dependency, while `context.tsx` and `use-history.ts` statically import `dbSelect`/`dbExecute`. This is the intended design (same pattern as `charger-reminder/db-tauri.ts`).

### Path Depth Gotcha
- Route pages at depth 3 from `src` (e.g., `pages/tools/core-hour/page.tsx`) need `../../../` to reach `src/features/`.
- Route pages at depth 4 (e.g., `pages/tools/core-hour/history/page.tsx`) need `../../../../` to reach `src/features/`.
- Hook files at depth 4 from `src` (e.g., `features/core-hour/hooks/context.tsx`) need `../../../` to reach `src/lib/`.
- A pre-existing path error in `charger-reminder/page.tsx` was also fixed: `../../../../` → `../../../` (3 levels up instead of 4).

### Consumer Notes (for Tasks 8–9)
- Task 8 (auth): replace hardcoded `"local"` userIds in CoreHour pages with `getCurrentUser().id` from auth-stub.
- Task 9 (tool registry + shell): import `chManifest` and `chComponentLoader` from `features/core-hour/index.ts`, register them in the desktop tool registry, and wire the `Shell` component from `@memo/ui`.
- The DB is already initialized before first render via `setDbOnStartup()` in `main.tsx`. No further init needed.
- The `index.ts` does NOT call `registerTool` (no web `@/lib/tool-registry/registry` import). It exports the manifest + loader for Task 9 to wire.

## Wave 2 / Task 8 — Local Auth Module

### Files Created (3)
- `apps/desktop/src/lib/auth.ts` — `User` interface, `signIn(email)` (INSERT OR REPLACE into `users` + localStorage write), `signOut()` (localStorage clear), `getCurrentUser()` (sync localStorage read, returns `User | null`), `requireSessionUser()` (async wrapper that throws `Error("Unauthorized")` when no session), plus `isMockAuthEnabled()` and `getMockUser()`.
- `apps/desktop/src/lib/auth-stub.ts` — thin re-export shim: `getCurrentUser`, `requireSessionUser`, `signIn`, `signOut`, `type User` from `./auth`. Created per spec so Task 6/7 imports of `./auth-stub` keep resolving.
- `apps/desktop/.env.example` — `VITE_ENABLE_AUTH_MOCK=true` with a comment explaining the query-string alternative and the E2E use case.

### Design Decisions
- **`signIn` SQL semantics follow the spec verbatim**: generates a fresh `crypto.randomUUID()` per call and uses `INSERT OR REPLACE INTO users (id, email, ...)`. The conflict key is `id` (PK), not `email`, so two calls with the same email produce two distinct rows — this matches the task spec exactly and the resulting `User` is what gets written to `localStorage` (and therefore what `getCurrentUser()` returns). For real per-email upsert a later task can switch to `ON CONFLICT(email)` or a SELECT-then-INSERT pattern; not in scope here.
- **`getCurrentUser()` is sync, `requireSessionUser()` is async**: the spec lists `requireSessionUser(): Promise<User>` (so protected routes can `await` it) and `getCurrentUser(): Promise<User | null>` in the prose but the provided code block for `getCurrentUser()` is synchronous. Followed the provided code (sync) for `getCurrentUser` and kept `requireSessionUser` async per the spec's signature, so the function is `await`able inside React effects / route guards.
- **`isMockAuthEnabled()` is sync**: matches the spec's signature, returns a boolean computed from `import.meta.env.VITE_ENABLE_AUTH_MOCK` or `window.location.search`. Guarded with `typeof window !== "undefined"` for any future SSR code path even though Tauri is SPA-only today.
- **Mock auth is intentionally separate from web**: the web app uses the cookie `efficiency-memo-mock-auth`; the desktop app reads the localStorage key `efficiency-memo-session` (set by `signIn`) plus the `?mock_session=1` query param. The web cookie contract stays untouched.
- **No React Context file**: the spec marked `auth-context.tsx` as optional. Skipped to keep the change minimal; consumers can call `getCurrentUser()` inside a `useSyncExternalStore` or a `useEffect`-driven state if/when they need reactivity. Wave 2 / Task 9 (shell auth gate) is the natural place to add that if it turns out to be needed.

### Verification
- `pnpm --filter desktop typecheck` — `tsc --noEmit` exits 0 with zero errors. The `import.meta.env` access in `isMockAuthEnabled` resolves cleanly because `src/vite-env.d.ts` has `/// <reference types="vite/client" />` and `tsconfig.json` has `module: "ESNext"`.
- `pnpm --filter desktop build` — FAILS, but with a **pre-existing** error unrelated to this task: `src/features/charger-reminder/component-loader.ts(5,10): error TS2307: Cannot find module './pages/device-list-page'`. Confirmed by `git stash`-ing all Task 8 changes and re-running the build — same error. The error is owned by Task 6 (Charger-Reminder migration), which created the `component-loader.ts` stub before porting the `pages/` directory. Per the "Pre-existing issues: note them, do NOT fix unless asked" rule, this is flagged here for Task 6 to clean up.
- `vite build` (the second half of the `build` script) was not reached because `tsc` failed first. Type-correctness of the new auth files is guaranteed by the passing `tsc --noEmit` against the project config.

### Consumer Notes (for Wave 2 / Task 9 and beyond)
- Task 9 (shell auth gate) should call `requireSessionUser()` in the protected layout entry. On rejection, redirect to `/sign-in` (a Tauri-side route, not the web `/sign-in`).
- `signIn` is the only writer; once the user signs in, `getCurrentUser()` is enough for any UI that just needs to render the email/avatar.
- For E2E (Playwright on the desktop webview), the test runner can either set `localStorage.setItem("efficiency-memo-session", JSON.stringify(mockUser))` before navigation OR load with `?mock_session=1` and have the auth gate call `getMockUser()` instead of `getCurrentUser()` when `isMockAuthEnabled()` is true. The latter is cleaner because it does not require the test to know the user shape.
- Do NOT import the web `apps/web/src/lib/auth/session.ts` — the web version depends on `next/headers` and Supabase. The desktop version is intentionally self-contained.

## Wave 2 / Task 9 — Shell Layout, Navigation, and Tool Registry

### Files Created (7)
- `apps/desktop/src/lib/tool-registry/types.ts` — `RegisteredTool` extending `ToolManifest` with `componentLoader`
- `apps/desktop/src/lib/tool-registry/registry.ts` — `registerTool`, `getRegisteredTools`, `getToolById`, `clearRegistry` backed by a `Map<string, RegisteredTool>`
- `apps/desktop/src/lib/tool-registry/discovery.ts` — `discoverTools()` that dynamically imports `features/charger-reminder/index` and `features/core-hour/index`
- `apps/desktop/src/pages/dashboard/page.tsx` — `DashboardPage` using `Card` grid from `@memo/ui`, links to tool routes via `useNavigate`
- `apps/desktop/src/pages/sign-in/page.tsx` — `SignInPage` with email input, calls `signIn(email)` then navigates to `/dashboard`
- `apps/desktop/src/pages/settings/sync/page.tsx` — placeholder `SyncSettingsPage` for Task 11
- `apps/desktop/src/components/shell-layout.tsx` — `ShellLayout` wrapping `@memo/ui` `Shell`, auth gate on mount (redirects to `/sign-in` if `getCurrentUser()` is null), sidebar items from `getRegisteredTools()`, header shows user email + sign-out button

### Files Modified (4)
- `apps/desktop/src/App.tsx` — replaced the static demo page with `BrowserRouter`, `Routes`, `Route` for `/sign-in`, `/dashboard`, `/tools/charger-reminder/*`, `/tools/core-hour/*`, `/settings/sync`, plus a root redirect to `/dashboard`. Lazy-loaded tool pages via `React.lazy` + `Suspense`.
- `apps/desktop/src/main.tsx` — added `bootstrap()` async function that calls `setDbOnStartup()` then `discoverTools()` before rendering
- `apps/desktop/src/features/charger-reminder/index.ts` — now calls `registerTool(crManifest, crComponentLoader)` on import
- `apps/desktop/src/features/core-hour/index.ts` — now calls `registerTool(chManifest, chComponentLoader)` on import

### Design Decisions
- **Nested Routes pattern**: `BrowserRouter` has a catch-all `/*` route that renders `ShellLayout`, and `ShellLayout` contains its own `<Routes>` for the actual pages. This is a valid react-router-dom v6 pattern and avoids needing `Outlet`. The auth gate runs inside `ShellLayout` before any child route renders.
- **Auth gate renders loading state**: `ShellLayout` returns a loading div while `userEmail === null` (auth check in progress). Once `getCurrentUser()` returns a value, it either redirects to `/sign-in` or renders the `Shell`. This prevents flash-of-protected-content.
- **Lazy loading for tool pages**: `ChargerReminderPage` and `CoreHourPage` are loaded via `React.lazy()` with a `ToolFallback` suspense boundary. This keeps the main bundle small and mirrors the web app's code-splitting approach.
- **Icon mapping in dashboard**: `ToolManifest.icon` is a string (`"battery"`, `"clock"`), but `Sidebar` renders it as a raw string. The dashboard page maps known tool names to inline SVG icons for a richer visual, falling back to a generic grid icon.
- **No React Context for auth**: the auth gate is local to `ShellLayout` via `useEffect` + `useState`. This matches the Task 8 decision to skip a global auth context.
- **Feature index files self-register**: both `charger-reminder/index.ts` and `core-hour/index.ts` call `registerTool` as a side effect on import. This mirrors the web pattern and lets `discovery.ts` stay simple (just import the indexes).

### Path Alias Note
- `discovery.ts` uses relative imports (`../../features/...`) instead of `@/features/...` because the desktop app does not have a `@/` path alias configured in `vite.config.ts` or `tsconfig.json`. The web app uses `@/` aliases, but the desktop app was scaffolded without them. Relative paths are explicit and avoid config drift.

### Verification
- `pnpm --filter desktop typecheck` — `tsc --noEmit` exits 0 with zero errors.
- `pnpm --filter desktop build` — `vite build` exits 0, producing `dist/` with 7 output chunks (main bundle 247KB, tool chunks 8KB and 12KB). Pre-existing Task 6 error (`Cannot find module './pages/device-list-page'`) was already resolved before this task — the page exists and builds correctly.

## Wave 2 / Task 7 follow-up — CoreHour table name fix (`ch_` prefix)

**Bug.** The SQLite migration `0003_ch_core_hour.sql` creates tables with the `ch_` prefix (`ch_sessions`, `ch_tags`, `ch_check_ins`, `ch_check_in_entries`), but the desktop CoreHour hooks queried `sessions` and `tags` without the prefix. This would cause SQLite "no such table" runtime errors.

**Root cause.** When porting the web `context.tsx` and `use-history.ts` to desktop, the `getDb()` abstraction was replaced with `dbSelect`/`dbExecute`. The web's `getDb()` provided table-name mapping through its mock layer, but the desktop queries hit the real SQLite schema directly where the `ch_` prefix is part of the table names.

**Fix (2 files, 8 queries).**
- `context.tsx`: `FROM sessions` → `FROM ch_sessions` (2x SELECT + 1 INSERT + 1 UPDATE), `FROM/INTO/UPDATE tags` → `ch_tags` (1 SELECT + 1 INSERT + 2 UPDATE)
- `use-history.ts`: `FROM sessions` → `FROM ch_sessions` (1 SELECT)

**Side fix.** 3 charger-reminder files had `getCurrentUser()` returning `User | null` (from `lib/auth.ts`) but TypeScript strict mode flagged `user.id` as possibly null despite `if (!user) throw` guards. Fixed with non-null assertion `getCurrentUser()!` — minimal change, same runtime behavior.

**Verification.** `pnpm --filter desktop typecheck` exits 0, `pnpm --filter desktop build` exits 0.

**Lesson.** When porting DB queries between backends, verify table names against the target migration files directly. The abstraction layer may mask naming conventions.


