# apps/desktop

The EfficiencyMemo desktop app — a Tauri v2 + Vite + React application that runs locally with SQLite storage. This is the recommended deployable surface for personal use.

See the [root README](../../README.md) for the project overview, feature list, and the comparison with the legacy Next.js web app.

## Quick Start

**Prerequisites:**
- Node.js ≥20
- pnpm ≥9
- Rust toolchain (stable; install via [rustup](https://rustup.rs/))
- Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++)
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Linux: `build-essential` + `libwebkit2gtk-4.1-dev` + `libssl-dev` + `libgtk-3-dev`

### Dev mode (with hot-reload)

From the repo root:

```bash
pnpm install
pnpm --filter desktop tauri:dev
```

This starts Vite on port 1420 and the Tauri shell opens a desktop window pointing at it. Edits to React files hot-reload; Rust changes trigger a recompile and restart.

### Production build (installer)

```bash
pnpm --filter desktop tauri:build
```

Produces:

| Platform | Output |
|---|---|
| Windows | `apps/desktop/src-tauri/target/release/bundle/msi/EfficiencyMemo_0.0.2_x64_en-US.msi` and `bundle/nsis/EfficiencyMemo_0.0.2_x64-setup.exe` |
| Windows (portable) | `apps/desktop/src-tauri/target/release/EfficiencyMemo.exe` |
| macOS | `apps/desktop/src-tauri/target/release/bundle/dmg/EfficiencyMemo_0.0.2_x64.dmg` |
| Linux | `apps/desktop/src-tauri/target/release/bundle/{deb,appimage,rpm}/EfficiencyMemo_*.{deb,AppImage,rpm}` |

Install the `.msi` (or platform equivalent) and launch from the Start menu. On first launch, the app creates its database in the OS app-data directory and runs all 7 migrations.

### Frontend-only build (no Rust)

If you just want the JS bundle (e.g., for testing the React app in a regular browser):

```bash
pnpm --filter desktop build
```

Outputs static files to `apps/desktop/dist/`. The Tauri-specific commands (`invoke`, `Database.load`) will be no-ops in a regular browser, so the app will run in degraded mode (no SQLite, no sync).

## First-time Setup

1. **Launch the app.** A local profile is selected or created automatically.

2. **Start using CoreHour.** Create tags, choose a check-in interval, and start a timer session.

3. **Protect local data.** Open **Settings → Data & privacy** to create a portable .ememo backup or export readable module JSON.

## Data Locations

The SQLite database is stored in the OS app-data directory:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\com.efficiency-memo.app\efficiency-memo.db` |
| macOS | `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db` |
| Linux | `$XDG_CONFIG_HOME/com.efficiency-memo.app/efficiency-memo.db` (normally `~/.config/...`) |

Database files (including WAL sidecars and import sidecars):
- `efficiency-memo.db` — main database
- `efficiency-memo.db-wal` — write-ahead log (created automatically)
- `efficiency-memo.db.next` — pending import (created by `sync_import`, applied on restart)

To back up manually, stop the app and copy `efficiency-memo.db` to a safe location. To start fresh, delete all three files.

## Scripts

From `apps/desktop/`:

| Command | Description |
|---|---|
| `pnpm dev` | Vite dev server only (browser preview at http://localhost:1420) |
| `pnpm build` | Type-check + Vite production build (outputs to `dist/`) |
| `pnpm preview` | Preview the production Vite build |
| `pnpm typecheck` | TypeScript check (no emit) |
| `pnpm lint` | ESLint |
| `pnpm tauri:dev` | Launch desktop app in dev mode |
| `pnpm tauri:build` | Build production installer |
| `pnpm tauri` | Pass-through to the Tauri CLI |

## WebDAV Sync (Strategy A: manual trigger)

EfficiencyMemo uses **manual sync** for v1 — the user clicks a button, no background auto-sync. This avoids surprise overwrites and keeps the design simple.

### Per-device layout

```
<WebDAV-root>/memo-backups/<device-id>/
  ├── manifest.json
  ├── 20260608T153000Z.db
  ├── 20260609T090000Z.db
  └── ...
```

`device-id` is a stable SHA256 hash of the OS data directory, so the same machine always uses the same folder. Different machines land in different folders — no merge, no conflict resolution.

### Setup multi-device sync

1. Install and launch the app on Device A.
2. On Device A, open **Settings → Sync**. Enter your WebDAV server URL, username, password. Click **Save Credentials**, then **Export & Upload**.
3. Install and launch the app on Device B.
4. On Device B, open **Settings → Sync**. Enter the same WebDAV URL, username, password. Click **Save Credentials**, then **Download & Import**. **Restart the app** to apply.

### After import — restart required

For v1, `sync_import` writes the verified backup to `efficiency-memo.db.next` rather than replacing the live database. The app holds an open SQLite connection that can't be safely closed mid-session. After the import completes:

1. Close the app.
2. Launch the app again.

On startup, the app picks up `.db.next` and replaces the live database. (Future versions can coordinate DB close/reopen for a seamless import — not in v1.)

## Troubleshooting

### "cargo: command not found" during `tauri:dev` or `tauri:build`

Install the Rust toolchain:
- Windows / macOS / Linux: <https://rustup.rs/>
- Restart your terminal after installing

### "WebView2 not found" (Windows)

The MSI installer includes a WebView2 bootstrapper that downloads WebView2 on first launch. If you ran the standalone `.exe` on a machine that never had WebView2, install it from <https://developer.microsoft.com/microsoft-edge/webview2/>.

### "no such table: users" (fresh install)

Migrations didn't run. Delete `efficiency-memo.db*` files from the OS app-data directory and restart the app. The plugin will re-run all 7 migrations.

### Sync fails with "Failed to get password from keychain"

The WebDAV password is in `keyring` under service `com.efficiency-memo.app.webdav`. To clear, run:

- Windows: `cmdkey /list:com.efficiency-memo.app.webdav*`
- macOS: `security delete-generic-password -s com.efficiency-memo.app.webdav`
- Linux: Use `seahorse` or `secret-tool clear service com.efficiency-memo.app.webdav`

Then re-save credentials in the app.

### "Checksum verification failed" on import

The backup on the server doesn't match the manifest's SHA256. Likely causes:
- Upload was interrupted — try **Export & Upload** again from the source device.
- The WebDAV server corrupted the file — try a different WebDAV server.
- Someone manually modified the file on the server.

## Architecture

See the root README for the full architecture overview, or [`apps/desktop/src-tauri/AGENTS.md`](./src-tauri/AGENTS.md) for the Rust-specific design notes.

## Dependencies

- `@tauri-apps/api`, `@tauri-apps/plugin-sql` — Tauri runtime + SQL plugin
- `@memo/shared`, `@memo/ui` — workspace packages
- `react`, `react-dom`, `react-router-dom` — UI
- `@tauri-apps/cli` (dev) — Tauri CLI
- `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss` (dev) — Vite + Tailwind
- `typescript` (dev) — type checking
- `eslint` (dev) — linting

Rust dependencies (in `src-tauri/Cargo.toml`):
- `tauri` 2 — shell
- `tauri-plugin-sql` 2 (sqlite) — database
- `reqwest_dav` 0.3 — WebDAV client
- `keyring` 3 (windows-native + apple-native + async-secret-service) — OS keychain
- `rusqlite` 0.31 (bundled) — direct SQLite access for VACUUM INTO
- `sha2`, `hex` — SHA256 checksums
- `chrono` — timestamp formatting
- `dirs` — OS data directory
- `serde`, `serde_json` — serialization
