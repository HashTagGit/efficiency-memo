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

