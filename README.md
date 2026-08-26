# EfficiencyMemo

A local-first **CoreHour** desktop app for deliberate time tracking. It ships as a Tauri v2 application with local SQLite storage.

## About

EfficiencyMemo is a pnpm monorepo centered on CoreHour. Launch the app, start a session, record periodic check-ins, and review each day locally. Charger Reminder is disabled; WebDAV sync code is retained but outside the current product scope.

## Features

### CoreHour — time tracking with periodic check-ins
- Choose a 15, 30, or 60 minute interval for the next session
- Start, pause, continue, and end sessions; an interrupted session restores paused
- Categorize a due check-in with one tag and an optional note, or skip it as uncategorized
- Review and edit daily totals, tag totals, and check-ins
- Receive one native notification when a check-in becomes due while the app is backgrounded

## Quick Start — Desktop App (recommended)

The Tauri desktop app is a single `.exe` (or `.msi` installer) that runs locally with a local SQLite database. No container runtime, no cloud account, no internet required for core features.

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
- Windows: `apps/desktop/src-tauri/target/release/bundle/msi/EfficiencyMemo_0.0.2_x64_en-US.msi`
- Standalone `.exe`: `apps/desktop/src-tauri/target/release/EfficiencyMemo.exe`

On first launch the app creates its database in `%APPDATA%/com.efficiency-memo.app/efficiency-memo.db` (Windows) or `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db` (macOS). All 4 migrations run automatically.

### Using the app

1. **Launch the app** — A local profile is selected or created automatically; there is no sign-in step.
2. **Create tags** — Open **CoreHour → Tags** and add the categories you want to use.
3. **Set the interval** — Open **CoreHour → Settings**, choose 15, 30, or 60 minutes, then save. It applies to the next session.
4. **Track time** — Open **CoreHour → Timer** and start a session. At each due check-in, choose one tag and an optional note, or skip. Allow the operating-system notification permission for background reminders.
5. **Review the day** — Open **CoreHour → History** to select a date, inspect totals, and edit check-ins.

Use the native Tauri window opened by `tauri:dev`; `http://localhost:1420` is only the Vite development server and does not provide the Tauri SQLite bridge.

For platform-specific setup and troubleshooting, see [docs/Installation.md](docs/Installation.md).

## Scripts

| Command | Description |
|---|---|
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode (HMR + DevTools) |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend only (no Rust) |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest across all workspaces |

## Architecture

EfficiencyMemo is organized as a pnpm monorepo. The design system lives in `packages/shared/` (cross-tool types and constants) and `packages/ui/` (React + Tailwind v4 component library). Both packages are consumed by the desktop app via `workspace:*` references.

### Desktop (`apps/desktop/`)

```
apps/desktop/
├── src/                   # React + Vite frontend (SPA, no SSR)
│   ├── features/          # CoreHour and retained legacy feature code
│   ├── pages/             # Route pages (dashboard, tools/*, settings/sync)
│   ├── components/        # Shell layout
│   ├── lib/               # db/profile wrapper, sync wrapper, tool registry
│   └── main.tsx           # React entry
└── src-tauri/             # Rust native shell
    ├── src/               # Plugin registration and Tauri command handlers
    ├── migrations/        # 4 SQLite migration files
    └── tauri.conf.json    # Bundle config (msi + nsis targets)
```

Key design choices:
- **No SSR** — Tauri uses a webview, not a browser, so server-side rendering is unnecessary. Vite + React Router handles all routing.
- **Local SQLite** — Tauri plugin-sql opens `sqlite:efficiency-memo.db` from the OS app-data directory. All 4 migrations run on first launch.
- **CoreHour session state** — Active-session progress is kept locally and restored as paused after an app restart, so closed-app time is never counted.
- **Native notifications** — `tauri-plugin-notification` sends one system notification only when a check-in becomes due in the background.
- **Deferred code** — Charger Reminder is retained but disabled. WebDAV sync is not part of the current product scope.

### Shared packages

- `packages/shared/` — cross-tool types (`ToolManifest`) and constants (`APP_NAME`)
- `packages/ui/` — `Button`, `Card`, `Modal`, `Sidebar`, `Shell`, plus `Input`, `Alert`, `EmptyState`, `PageHeader`. Every component uses the dark-theme design tokens from `apps/desktop/src/index.css`. Consumed by the desktop app without modification.

## Tech Stack

| Technology | Version | Used by |
|---|---|---|
| Tauri | 2 | Desktop shell |
| Vite | 6 | Desktop frontend |
| React | 19.2.4 | Frontend |
| React Router | 7 | Desktop routing |
| TypeScript | strict | All packages |
| Tailwind CSS | v4 | Styling |
| SQLite | via `tauri-plugin-sql` | Desktop storage |
| Tauri notification plugin | 2 | Background CoreHour reminders |
| Vitest | latest | Tests |
| pnpm | ≥9 | Package manager |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and how to add a new tool.

## License

MIT (c) 2026 HashTagGit. See [LICENSE](./LICENSE).
