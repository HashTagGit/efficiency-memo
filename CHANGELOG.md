# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0-desktop] - 2026-06-09

### Added
- Tauri v2 desktop app (`apps/desktop/`) — local-first architecture with SQLite, local auth, and WebDAV sync
- WebDAV sync engine — 4 Tauri commands (`sync_export`, `sync_import`, `sync_list`, `store_webdav_credentials`) with OS keychain credential storage
- Sync UI settings page — WebDAV config, manual sync actions (Export & Upload / Download & Import), remote backup list
- Windows installer targets — MSI + NSIS with WebView2 bootstrapper
- macOS and Linux bundle targets — DMG, AppImage, deb, rpm
- Local auth module — no passwords, no Supabase, single-user desktop tool with `signIn`/`signOut`/`getCurrentUser`
- SQLite database layer — `lib/db.ts` singleton, `dbSelect`/`dbExecute` helpers, `DevicePersistenceContract` for Charger-Reminder, `DbResult` for CoreHour
- 3 SQLite DDL migrations — ported from Supabase (`0001_cr_device_reminder.sql`, `0002_cr_seed_presets.sql`, `0003_ch_core_hour.sql`)
- React Router 7 SPA routing — replaces Next.js App Router in the desktop app
- `tauri-plugin-sql` — SQLite database access from the Tauri webview

### Changed
- `apps/web/` has been archived; desktop is the sole distribution surface
- Desktop features are independent copies in `apps/desktop/src/features/` (not symlinks), to avoid coupling between surfaces
- Sync is manual trigger only (Strategy A: per-device folders, last-write-wins); no background auto-sync in v1

### Infrastructure
- Vite 6 + React 19 for the desktop frontend build
- `reqwest_dav` 0.3 (WebDAV client), `keyring` 3 (OS keychain), `rusqlite` 0.31 (direct SQLite), `sha2` + `hex` (checksums), `chrono` (timestamps)
- `Cargo.toml` release profile: LTO + strip + panic=abort for small binary size
- Preloaded SQLite database: `sqlite:efficiency-memo.db` with automatic migration on first launch

## [0.0.1] - 2026-06-06

### Added
- Charger Reminder — battery tracking tool with heuristic reminders and device presets
- CoreHour — time tracking tool with periodic check-ins and tag-based categorization
- Supabase-authenticated shell with magic-link sign-in and mock auth for E2E
- Tool registry pattern with self-registering features and dynamic discovery

### Setup
- pnpm workspace monorepo with `apps/web`, `packages/shared`, `packages/ui`
- Next.js 16 App Router with TypeScript strict mode
- Tailwind CSS v4 for styling
- Vitest for unit/integration testing (300 cases)
- Playwright for E2E testing (53 specs)
- ESLint via `eslint-config-next`

### Infrastructure
- Supabase local setup with Postgres + Auth
- Row Level Security (RLS) policies on all tables
- Mock auth system for development and E2E testing
- SQL migrations for Charger-Reminder (`001`, `002`) and CoreHour (`003`)

### Distribution
- Initial release with Charger-Reminder and CoreHour tools.

[0.1.0-desktop]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.1.0-desktop
[0.0.1]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1
