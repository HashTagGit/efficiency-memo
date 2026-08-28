# Contributing to EfficiencyMemo

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Rust toolchain (install via [rustup](https://rustup.rs/))
  - Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`

## Local Setup

```bash
git clone https://github.com/HashTagGit/efficiency-memo.git
cd efficiency-memo
pnpm install
pnpm --filter desktop tauri:dev
# Opens a Tauri window with hot-reload
```

## Workspace Layout

```
EfficiencyMemo/
├── apps/desktop/      # Tauri v2 desktop app (recommended for personal use)
├── packages/shared/   # Cross-tool types and constants
└── packages/ui/       # React + Tailwind v4 component library
```

## Development Commands

| Command | Description |
|---|---|
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest (142 cases) |
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend (Vite only) |
| `pnpm --filter desktop typecheck` | TypeScript check in desktop |

## CoreHour Scope

Keep the user workflow local: session timer, check-ins, plans, reviews, recovery reminders, tags, and settings. Charger Reminder is retired to the ignored local `bak/` archive; do not restore it without an explicit product decision. WebDAV sync remains outside the current product scope.

## Code Conventions

- Path aliases: `@/*` -> `apps/desktop/src/*`, `@memo/shared` -> `packages/shared/src`, `@memo/ui` -> `packages/ui/src`
- Tests mirror source tree under `__tests__/`

See [AGENTS.md](./AGENTS.md) for full conventions.

## Testing

- Unit/Integration: `pnpm test` (Vitest, mirrors source under `__tests__/`)

## Commit Style

Follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `test:` tests

## License

MIT — see [LICENSE](./LICENSE)
