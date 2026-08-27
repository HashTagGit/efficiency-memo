# EfficiencyMemo — Architecture

## 1. Monorepo Layout

```
EfficiencyMemo/
├── apps/desktop/          # Tauri v2 app (recommended for personal use)
│   ├── src/               # Vite + React SPA frontend
│   └── src-tauri/         # Rust native shell + SQLite
├── packages/shared/       # Cross-tool types (ToolManifest, etc.)
└── packages/ui/           # React + Tailwind v4 primitives
```

**Key workspaces**:

- `apps/desktop` — the desktop deployable surface. Tauri v2 with Rust native shell, Vite + React SPA, and local SQLite.
- `packages/shared` — pure TypeScript types and constants. Zero runtime dependencies.
- `packages/ui` — React component library with Tailwind v4 as a peer dependency.

Original web app archived in v0.1.0-desktop. See git history.

---

## 7. Desktop App Architecture

The desktop app lives in `apps/desktop/` and is the recommended deployable surface for personal, offline-first use.

### Tauri v2 Shell

- Rust native shell (`src-tauri/`) + Vite/React SPA webview.
- `main.rs` launches the shell.
- `lib.rs` registers plugins and Tauri commands.
- `lib.rs` registers the SQL and notification plugins.

### SQLite Storage

- Tauri plugin-sql opens `sqlite:efficiency-memo.db` in the OS app-data directory.
- 7 SQLite DDL migrations in `src-tauri/migrations/`.
- `lib/db.ts` wraps `Database.load()` with `dbSelect()`/`dbExecute()` helpers.
- `DevicePersistenceContract` in `features/charger-reminder/db-tauri.ts` (8 CRUD methods).
- `DbResult` interface in `features/core-hour/db-tauri.ts`.

### Local Profile

- `lib/auth.ts` selects an existing SQLite user or creates `local-user` during startup.
- No sign-in, passwords, email verification, or external auth service.
- Existing installations keep their current user ID and associated data.

### CoreHour Workflow

- `features/core-hour/` owns the Today, Timeline, Insights, Tags, and Settings routes.
- Today stores lightweight activity context on each session and derives recent/favorite activity combinations from local session history.
- Timeline keeps planned blocks in `ch_plans` separate from actual `ch_sessions`, with day/week views and 15-minute click snapping for new plans.
- Explicit plan conversion creates the actual session and links the plan in the same Rust transaction; rejected session validation leaves the plan unchanged.
- Insights owns aggregate analytics: local Monday-to-Sunday goal review, previous-week comparison, range trends, and activity/tag breakdowns.
- Daily focus goals reuse the existing `ch_settings` key-value table; no schema migration is required.
- Manual session changes validate overlaps and update the session and its check-in durations in one SQLite transaction.
- An active session persists elapsed and categorized seconds in local storage; after a restart it restores paused.
- Check-ins record one optional tag, an optional note, and an explicit duration.
- The native notification plugin reminds users only when a due check-in occurs in the background.

### Pause & Hydrate Workflow

- `features/pause-hydrate/` owns reminder scheduling, local events, notifications, and the standalone tool page.
- Break and hydration reminders have independent enabled state, interval, next-due, pending, and local mute state.
- The app-level provider polls while the desktop app is running so reminders do not depend on the tool page being open.
- A due reminder reads whether CoreHour is active and waits without modifying either tool's state.

### Tool Sharing

- Desktop consumes `packages/shared/` and `packages/ui/` via `workspace:*`.
- CoreHour and Pause & Hydrate manifests are enabled. Charger Reminder is retained but disabled; WebDAV sync code is outside the current product focus.
- React Router handles SPA routing (`BrowserRouter` with `<Routes>`).

### Appearance

- `lib/appearance.tsx` owns persisted color mode, resolved system mode, and palette state.
- `packages/ui` receives resolved appearance values through props and remains presentation-only.
- `index.css` maps Ember, Grove, and Tide through the same semantic token names, so feature pages do not know which palette is active.
- `/settings` is the primary global settings surface; the retained `/settings/sync` route is not linked from primary navigation.

### Data Control

- The native data-control module owns the portable-backup interface: snapshot, integrity validation, preview counts, restore staging, and transactional module reset.
- A .ememo file remains SQLite and stores versioned package metadata plus locale, theme mode, and palette. Keychain secrets and active-session progress are excluded.
- The startup sidecar applies a staged restore before SQL connections open, moves the live database and WAL sidecars to rollback names, and restores them if replacement cannot complete.
- The Data & Privacy settings page owns user confirmation, readable module JSON exports, and known local-preference cleanup.
- WebDAV remains outside the product surface and uses the same SQL-plugin application-config directory only for retained compatibility.

### Data Locations

- Windows: `%APPDATA%\com.efficiency-memo.app\efficiency-memo.db`
- macOS: `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db`
- Linux: `$XDG_CONFIG_HOME/com.efficiency-memo.app/efficiency-memo.db` (normally `~/.config/...`)

### Key Design Differences

| Aspect | Desktop |
|---|---|
| Shell | Tauri v2 (Rust + Webview) |
| Routing | react-router-dom (SPA) |
| Storage | SQLite (local file) |
| Profile | Automatic local SQLite user |
| Sync | Out of current product scope |
| SSR | No (SPA) |
| RLS | No (single-user file) |
| Build output | `.exe`/`.msi`/`.dmg`/`.AppImage` |
