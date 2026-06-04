# Contributing to EfficiencyMemo

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local Supabase)
- Supabase CLI

## Local Setup

```bash
git clone https://github.com/HashTagGit/efficiency-memo.git
cd efficiency-memo
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Start Supabase (Docker)
pnpm dev
# Open http://localhost:3000
```

## Workspace Layout

```
EfficiencyMemo/
├── apps/web/          # Next.js 16 app (deployable surface)
├── packages/shared/   # Cross-tool types and constants
├── packages/ui/       # React + Tailwind v4 component library
└── supabase/
    └── migrations/    # SQL migrations (3 files)
```

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all workspaces in parallel |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Run Vitest (364 cases) |
| `pnpm test:e2e` | Run Playwright (42 specs) |

## Adding a New Tool

1. Create `apps/web/src/features/<tool-id>/`
2. Add `manifest.ts` (id, name, icon, description, routes)
3. Add `component-loader.ts` (lazy import of entry page)
4. Add `index.ts` (calls `registerTool(manifest, componentLoader)`)
5. Register in `apps/web/src/lib/tool-registry/discovery.ts` (`featureNames` array)
6. Add `AGENTS.md` in the feature folder

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
