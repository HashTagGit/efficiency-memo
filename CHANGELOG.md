# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- The desktop shell and CoreHour workflow now support persisted English and Simplified Chinese translations.
- CoreHour is the active product workflow. Charger Reminder is disabled; WebDAV sync is out of scope.
- Documentation now describes the native Tauri window as the supported entry point; the Vite server is not a standalone application.
- The desktop app now opens with an automatic local profile instead of showing sign-in and sign-out controls.
- The desktop workspace now supports persisted light and dark themes with reorganized navigation and consistent action styling.

### Added
- Manual CoreHour session entry and completed-session editing with overlap validation.
- CoreHour Today workspace with activity descriptions, default tags, recent/favorite quick starts, daily sessions, and a session-end summary.
- A fifth SQLite migration for CoreHour session activity context.
- CoreHour timer, history, tags, and settings routes for local sessions and daily review.
- Persisted session duration and check-in duration through a fourth SQLite migration.
- One native background notification per due CoreHour check-in.

## [0.0.2] - 2026-06-21

### Changed
- **`@memo/ui` design-token retune** — every component now uses the dark-theme design tokens defined in `apps/desktop/src/index.css` (`bg-accent`, `bg-surface`, `bg-card`, `text-foreground`, `text-muted`, `border-border`, `ring-accent`, etc.). Removed all hardcoded light-theme colors (`bg-white`, `bg-blue-600`, `text-gray-900`, `bg-neutral-50`, etc.) that were silently breaking the dark theme.
  - `Button`, `Card`, `Modal`, `Sidebar`, `Shell` retuned to design tokens
  - Card, Modal, Sidebar, Shell gained `className` and `...rest` prop forwarding for tailwind overrides
- **Page migrations** — `apps/desktop/src/pages/dashboard`, `settings/sync`, and `sign-in` migrated from hardcoded colors to the new component library
  - Sync page replaces 3 hand-rolled inputs and a hand-rolled status banner with `Input`, `Alert`, `PageHeader`, and `Button` components
  - Dashboard and sign-in pages adopt `PageHeader`, `EmptyState`, `Input` for consistency with the rest of the app

### Added
- **`@memo/ui` new shared components** — four presentational components that replace repeated hand-rolled patterns across pages:
  - `Input` — labeled text input with `error` and `disabled` states; `forwardRef`
  - `Alert` — `info` / `success` / `warning` / `error` variants with optional dismiss button; `role="alert"`; `forwardRef`
  - `EmptyState` — centered icon + title + description + optional `action` slot; `forwardRef`
  - `PageHeader` — page title (uses `font-display` — Cormorant Garamond) + optional `subtitle` and `action`; `forwardRef`
- **New tests** — 53 new tests across `Input` (17), `Alert` (13), `EmptyState` (12), `PageHeader` (11); existing 5 component test files updated for the new className patterns. `@memo/ui` test suite is now 98/98 passing across 9 test files.

### Notes
- No new runtime dependencies; no Rust/Tauri changes; `apps/desktop/src/index.css` design tokens untouched; `packages/shared/` untouched.
- This release is a UI refactor with no behavior changes — every existing user flow and command surface is preserved.

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
[0.0.2]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.2
