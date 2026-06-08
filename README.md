# EfficiencyMemo

A unified tool gallery for daily productivity. Ships as a **Tauri v2 desktop app** with local SQLite storage and optional WebDAV sync. The original Next.js + Supabase web app remains available as a Docker-based fallback.

## About

EfficiencyMemo is a pnpm monorepo that bundles independent productivity tools behind a single authenticated shell, so the same user account reaches every tool without re-onboarding. It currently ships two tools:

- **Charger Reminder** — battery tracking with deterministic heuristic reminders
- **CoreHour** — time tracking with periodic check-ins and tag-based session history

There are two deployable surfaces:

| Surface | Stack | Storage | Best for |
|---|---|---|---|
| `apps/desktop/` (recommended) | Tauri v2 + Vite + React 19 | Local SQLite (no server) | Personal use, offline-first, multi-device sync via WebDAV |
| `apps/web/` (legacy) | Next.js 16 + Supabase | Postgres (via Supabase CLI) | Web-only access, server-side rendering |

New tools can be added by creating a feature folder under `apps/desktop/src/features/` (or `apps/web/src/features/`) and registering the tool manifest. The shell discovers tools automatically at build time.

## Features

### Charger Reminder — battery tracking with heuristic reminders
- Track device batteries and get reminded to charge before they run out
- Deterministic heuristic engine (v1) for reminder timing
- Device presets, charge event logging, reminder preferences

### CoreHour — time tracking with periodic check-ins
- Track how you spend your time with periodic check-ins and tag-based categorization
- Timer with visibility auto-pause (1s interval)
- Tag management, session history, settings

## Quick Start — Desktop App (recommended)

The Tauri desktop app is a single `.exe` (or `.msi` installer) that runs locally with a local SQLite database. No Docker, no cloud account, no internet required for core features.

**Prerequisites:** Node.js ≥20, pnpm ≥9, Rust toolchain (only needed to build from source; pre-built releases will not require Rust)

### From source

```bash
# Install pnpm deps
pnpm install

# Launch the desktop app (dev mode with hot-reload)
pnpm --filter desktop tauri:dev
```

The first launch takes a few minutes while Rust compiles the native shell. Subsequent launches are instant.

To build a production installer:

```bash
pnpm --filter desktop tauri:build
```

Output:
- Windows: `apps/desktop/src-tauri/target/release/bundle/msi/EfficiencyMemo_0.0.1_x64_en-US.msi`
- Standalone `.exe`: `apps/desktop/src-tauri/target/release/EfficiencyMemo.exe`

On first launch the app creates its database in `%APPDATA%/com.efficiency-memo.app/efficiency-memo.db` (Windows) or `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db` (macOS). All 3 migrations run automatically.

### Using the app

1. **Sign in** — Enter any email. Local auth has no password or email verification (it's a single-user desktop tool). The email is stored in the OS keychain, not in the database.
2. **Use the tools** — Sidebar shows Charger Reminder and CoreHour. Click any tool to navigate.
3. **Set up sync (optional)** — Open **Settings → Sync** in the sidebar, enter your WebDAV server URL, username, and password. Password is stored in the OS keychain. Click "Export & Upload" to back up, "Download & Import" to restore on another device.
4. **Restart required after import** — For safety, `sync_import` writes the downloaded database to `efficiency-memo.db.next`. Restart the app to swap it in.

### Sync (WebDAV)

EfficiencyMemo uses **manual WebDAV sync** (Strategy A: per-device folders, last-write-wins). It works with any WebDAV-compatible server — Nutstore, Nextcloud, Apache, or self-hosted.

Per-device backup layout:
```
/memo-backups/<device-id>/
  ├── manifest.json          # { device_id, schema_version, timestamp, sha256 }
  ├── 20260608T153000Z.db    # snapshot at this timestamp
  └── ...
```

Device IDs are stable hashes of the OS data directory, so the same machine always lands in the same folder. To set up multi-device sync, install the app on each device, sign in with the same email, and configure the same WebDAV server. Click "Export & Upload" on Device A, then "Download & Import" on Device B.

## Quick Start — Web App (Docker / Supabase fallback)

The original web app runs in Docker and uses Supabase for auth and Postgres for storage. This is the path if you want server-side rendering, web-only access, or a hosted deployment.

**Prerequisites:** Node.js ≥20, pnpm ≥9, Docker Desktop (or Docker Engine + Compose v2), Supabase CLI

```bash
# Install dependencies
pnpm install

# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Start Supabase (in another terminal)
npx supabase start

# Start the dev server
pnpm dev
```

After `pnpm dev`, the Next.js dev server starts on port 3000. Supabase services run on ports 54321 (API) and 54322 (Auth). Sign in via magic link; the dev-only Inbucket mail catcher is at `http://localhost:54324`.

For a production-style Docker deployment, see [`release/README.md`](./release/README.md).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (web only; desktop uses `tauri:dev`) |
| `pnpm build` | Build the web app (`apps/web`) |
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode (HMR + DevTools) |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend only (no Rust) |
| `pnpm lint` | Run ESLint (web only) |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest across all workspaces |
| `pnpm --filter web test:e2e` | Run Playwright E2E specs (web) |

## Architecture

EfficiencyMemo is organized as a pnpm monorepo. The design system lives in `packages/shared/` (cross-tool types and constants) and `packages/ui/` (React + Tailwind v4 component library). Both desktop and web apps consume these via `workspace:*` references and reuse them unchanged.

### Desktop (`apps/desktop/`)

```
apps/desktop/
├── src/                   # React + Vite frontend (SPA, no SSR)
│   ├── features/          # Tool implementations (charger-reminder, core-hour)
│   ├── pages/             # Route pages (dashboard, sign-in, tools/*, settings/sync)
│   ├── components/        # Shell layout
│   ├── lib/               # db wrapper, auth, sync wrapper, tool registry
│   └── main.tsx           # React entry
└── src-tauri/             # Rust native shell
    ├── src/
    │   ├── lib.rs         # Plugin registration (sql) + Tauri command handlers
    │   └── sync.rs        # WebDAV sync engine (4 Tauri commands)
    ├── migrations/        # 3 SQLite migration files
    └── tauri.conf.json    # Bundle config (msi + nsis targets)
```

Key design choices:
- **No SSR** — Tauri uses a webview, not a browser, so Next.js-style SSR is unnecessary. Vite + React Router handles all routing.
- **Local SQLite** — Tauri plugin-sql opens `sqlite:efficiency-memo.db` from the OS app-data directory. All 3 migrations run on first launch.
- **OS keychain** — WebDAV passwords are stored in Windows Credential Manager / macOS Keychain / Linux Secret Service via the `keyring` crate. They never touch disk in plain text.
- **Manual sync** — No background auto-sync. The user clicks "Sync" in the settings page. v1 import requires an app restart (writes `efficiency-memo.db.next`).
- **Per-device folders** — Each device's backups live in `/memo-backups/<device-id>/`. No merge, no conflict resolution; last-write-wins.

### Web (`apps/web/`)

The web app uses Next.js 16 App Router with Supabase SSR for auth and Postgres for storage. See [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) for the web-specific architecture.

### Shared packages

- `packages/shared/` — cross-tool types (`ToolManifest`) and constants (`APP_NAME`)
- `packages/ui/` — `Button`, `Card`, `Modal`, `Sidebar`, `Shell` components. Both desktop and web consume this without modification.

## Tech Stack

| Technology | Version | Used by |
|---|---|---|
| Tauri | 2 | Desktop shell |
| Vite | 6 | Desktop frontend |
| React | 19.2.4 | Both |
| React Router | 7 | Desktop routing |
| Next.js | 16.2.6 | Web App Router |
| TypeScript | strict | Both |
| Tailwind CSS | v4 | Both |
| SQLite | via `tauri-plugin-sql` | Desktop storage |
| Postgres + Supabase | local CLI | Web storage |
| WebDAV (`reqwest_dav`) | 0.3 | Desktop sync |
| OS keychain (`keyring`) | 3 | Desktop credential storage |
| Vitest | latest | Tests (both) |
| Playwright | ^1.60.0 | E2E (web) |
| pnpm | ≥9 | Package manager |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and how to add a new tool.

## License

MIT (c) 2026 HashTagGit. See [LICENSE](./LICENSE).
