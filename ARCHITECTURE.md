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
- 5 SQLite DDL migrations in `src-tauri/migrations/`.
- `lib/db.ts` wraps `Database.load()` with `dbSelect()`/`dbExecute()` helpers.
- `DevicePersistenceContract` in `features/charger-reminder/db-tauri.ts` (8 CRUD methods).
- `DbResult` interface in `features/core-hour/db-tauri.ts`.

### Local Profile

- `lib/auth.ts` selects an existing SQLite user or creates `local-user` during startup.
- No sign-in, passwords, email verification, or external auth service.
- Existing installations keep their current user ID and associated data.

### CoreHour Workflow

- `features/core-hour/` owns the Today, History, Tags, and Settings routes.
- Today stores lightweight activity context on each session and derives recent/favorite activity combinations from local session history.
- Manual session changes validate overlaps and update the session and its check-in durations in one SQLite transaction.
- An active session persists elapsed and categorized seconds in local storage; after a restart it restores paused.
- Check-ins record one optional tag, an optional note, and an explicit duration.
- The native notification plugin reminds users only when a due check-in occurs in the background.

### Tool Sharing

- Desktop consumes `packages/shared/` and `packages/ui/` via `workspace:*`.
- The CoreHour manifest is enabled. Charger Reminder is retained but disabled; WebDAV sync code is outside the current product focus.
- React Router handles SPA routing (`BrowserRouter` with `<Routes>`).

### Data Locations

- Windows: `%APPDATA%\com.efficiency-memo.app\efficiency-memo.db`
- macOS: `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db`
- Linux: `~/.local/share/com.efficiency-memo.app/efficiency-memo.db`

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
