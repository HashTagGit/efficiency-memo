# AGENTS.md

## Purpose
EfficiencyMemo is a pnpm monorepo that hosts a unified tool gallery for daily productivity. It bundles independent feature tools (currently Charger-Reminder and CoreHour) behind a single Supabase-authenticated Next.js shell, so the same user account can reach every tool without re-onboarding. The two shipped tools share infrastructure but ship their own data models, heuristics, and UI.

## Context
The repository is organized as a workspace so the design system, shared types, and each tool stay in their own packages.

```
EfficiencyMemo/
  apps/
    web/                # Next.js 16 app (the only deployable surface)
  packages/
    shared/             # Cross-tool types and constants
    ui/                 # React + Tailwind v4 component library
  supabase/
    migrations/         # 3 SQL migrations (2 for CR, 1 for CH)
  .omo/                 # Planning artifacts and research notes
```

**Stack**: Next.js 16.2.6 (App Router), React 19.2.4, Tailwind v4, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Vitest, Playwright. Node >= 20, pnpm >= 9.

**Tooling**: TypeScript strict mode, ESLint via `eslint-config-next`, Vitest for unit/integration, Playwright for E2E. The test suite runs 364 Vitest cases and 42 Playwright cases across the workspace.

## Patterns

**Commands** (run from repo root):
- `pnpm dev` runs every workspace in parallel
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` fan out to all packages
- Per-package: `pnpm --filter web test`, `pnpm --filter @memo/ui build`, etc.

**Path aliases** (defined in `apps/web/tsconfig.json`):
- `@/*` -> `apps/web/src/*`
- `@memo/shared` and `@memo/shared/*` -> `packages/shared/src[/*]`
- `@memo/ui` and `@memo/ui/*` -> `packages/ui/src[/*]`

**Conventions**:
- Features live in `apps/web/src/features/<tool-id>/` and self-register on import via `index.ts` -> `manifest.ts` + `component-loader.ts`
- Server actions start with `"use server"` and revalidate affected paths
- Tests mirror the source tree under `__tests__/` and use Vitest + Testing Library
- E2E specs live in `apps/web/e2e/*.spec.ts` and assume a running dev server
- Components compose `@memo/ui` primitives instead of re-implementing buttons, cards, or modals

## Constraints
- Do not modify the `.gitignore` patterns without checking with the user; it already covers `node_modules/`, `.next/`, `dist/`, `.env*` (with `!.env.example`), test outputs, and OS junk
- Do not commit secrets, `node_modules`, build output, or Playwright reports
- Do not introduce a remote Supabase project or new migrations; the project runs against the local Supabase CLI
- Do not add a new top-level dependency without checking every workspace first
- Do not refactor the Supabase mock auth flow; the cookie contract (`efficiency-memo-mock-auth`) is locked for E2E

## Dependencies
- **External**: Node.js 20+, pnpm 9+, Docker (for local Supabase), Supabase CLI
- **Apps**: `web` depends on `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `@memo/shared`, `@memo/ui`
- **Packages**: `@memo/shared` has no runtime deps; `@memo/ui` declares `react`, `react-dom`, `tailwindcss` as peer deps
- **Local services**: local Postgres + Auth via Supabase CLI on ports 54321 (API) and 54322 (Auth)
- **Schema**: three SQL files in `supabase/migrations/` (do not delete or rewrite)
