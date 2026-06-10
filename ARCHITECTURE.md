# EfficiencyMemo — Architecture

## 1. Monorepo Layout

```
EfficiencyMemo/
├── apps/desktop/          # Tauri v2 app (recommended for personal use)
│   ├── src/               # Vite + React SPA frontend
│   └── src-tauri/         # Rust native shell + SQLite + WebDAV sync
├── packages/shared/       # Cross-tool types (ToolManifest, etc.)
└── packages/ui/           # React + Tailwind v4 primitives
```

**Key workspaces**:

- `apps/desktop` — the recommended desktop deployable surface. Tauri v2 with Rust native shell, Vite + React SPA, local SQLite, and optional WebDAV sync.
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
- `sync.rs` provides 4 WebDAV commands.

### SQLite Storage

- Tauri plugin-sql opens `sqlite:efficiency-memo.db` in the OS app-data directory.
- 3 SQLite DDL migrations in `src-tauri/migrations/` (ported from Supabase).
- `lib/db.ts` wraps `Database.load()` with `dbSelect()`/`dbExecute()` helpers.
- `DevicePersistenceContract` in `features/charger-reminder/db-tauri.ts` (8 CRUD methods).
- `DbResult` interface in `features/core-hour/db-tauri.ts`.

### Local Auth

- `lib/auth.ts`: `signIn`, `signOut`, `getCurrentUser`, `requireSessionUser`.
- No passwords, no email verification, no Supabase.
- `localStorage` session key: `efficiency-memo-session`.
- Mock auth via `VITE_ENABLE_AUTH_MOCK=true` or `?mock_session=1`.

### WebDAV Sync

- Manual trigger (user clicks button in Settings → Sync).
- `sync_export`: WAL checkpoint → VACUUM INTO → SHA256 → upload to `/memo-backups/<device-id>/<timestamp>.db` + manifest.json.
- `sync_import`: download manifest → verify SHA256 → write to `efficiency-memo.db.next` → restart required.
- `sync_list`: PROPFIND per-device folder.
- `store_webdav_credentials`: OS keychain via `keyring` crate.
- Per-device folders, last-write-wins, no conflict resolution (v1).

### Tool Sharing

- Both surfaces consume `packages/shared/` and `packages/ui/` via `workspace:*`.
- Desktop has feature copies in `apps/desktop/src/features/` (not symlinks — independent copies to avoid coupling).
- Tool registry pattern mirrors web: `registerTool(manifest, componentLoader)` on import.
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
| Auth | Local (no server) |
| Sync | Manual WebDAV |
| SSR | No (SPA) |
| RLS | No (single-user file) |
| Build output | `.exe`/`.msi`/`.dmg`/`.AppImage` |
