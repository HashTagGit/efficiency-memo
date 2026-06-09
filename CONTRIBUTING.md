# Contributing to EfficiencyMemo

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local Supabase)
- Supabase CLI
- Rust toolchain (for desktop app; install via [rustup](https://rustup.rs/))
  - Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`

## Local Setup

```bash
git clone https://github.com/HashTagGit/efficiency-memo.git
cd efficiency-memo
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Start Supabase (Docker)
pnpm dev
# Open http://localhost:3000

# Alternative: Launch the desktop app (no Docker needed)
pnpm --filter desktop tauri:dev
# Opens a Tauri window with hot-reload; no Supabase required
```

## Workspace Layout

```
EfficiencyMemo/
├── apps/desktop/      # Tauri v2 desktop app (recommended for personal use)
├── apps/web/          # Next.js 16 web app (legacy fallback)
├── packages/shared/   # Cross-tool types and constants
├── packages/ui/       # React + Tailwind v4 component library
└── supabase/
    └── migrations/    # SQL migrations (3 files)
```

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all workspaces in parallel |
| `pnpm build` | Build `apps/web` (only workspace with a build script) |
| `pnpm lint` | Run ESLint in `apps/web` (only workspace with a lint script) |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest (341 cases) |
| `pnpm test:e2e` | Run Playwright (53 specs) |
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend (Vite only) |
| `pnpm --filter desktop typecheck` | TypeScript check in desktop |

## Adding a New Tool

1. Create `apps/web/src/features/<tool-id>/`
2. Add `manifest.ts` (id, name, icon, description, routes)
3. Add `component-loader.ts` (lazy import of entry page)
4. Add `index.ts` (calls `registerTool(manifest, componentLoader)`)
5. Register in `apps/web/src/lib/tool-registry/discovery.ts` (`featureNames` array)
6. Add `AGENTS.md` in the feature folder

For the **desktop app**, create `apps/desktop/src/features/<tool-id>/` instead of `apps/web/src/features/<tool-id>/`. Follow the same pattern: `manifest.ts`, `component-loader.ts`, `index.ts`. Register in `apps/desktop/src/lib/tool-registry/discovery.ts` if the registry requires explicit enumeration (currently it imports all feature indexes).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full pattern.

## Code Conventions

- Server Components by default; opt into `"use client"` only when needed
- Server actions start with `"use server"` and end with `revalidatePath`
- Path aliases: `@/*` -> `apps/web/src/*`, `@memo/shared` -> `packages/shared/src`, `@memo/ui` -> `packages/ui/src`
- Tests mirror source tree under `__tests__/`

See [AGENTS.md](./AGENTS.md) for full conventions.

## Testing

- Unit/Integration: `pnpm test` (Vitest, mirrors source under `__tests__/`)
- E2E: `pnpm test:e2e` (Playwright, specs in `apps/web/e2e/*.spec.ts`)
- Mock auth for E2E: set `NEXT_PUBLIC_ENABLE_AUTH_MOCK=true` or `AUTH_E2E_MOCK=true`

## Commit Style

Follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `test:` tests

## License

MIT — see [LICENSE](./LICENSE)
