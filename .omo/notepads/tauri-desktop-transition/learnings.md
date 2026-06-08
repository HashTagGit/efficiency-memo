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



