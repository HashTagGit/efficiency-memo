# AGENTS.md

## Purpose
EfficiencyMemo is a pnpm monorepo that hosts a unified tool gallery for daily productivity. It bundles independent feature tools (currently Charger-Reminder and CoreHour) behind two deployable surfaces:

- **Desktop app (`apps/desktop/`)** — Tauri v2 + local SQLite + local auth + WebDAV sync. Recommended for personal, offline-first use. No Docker, no cloud account required.
- **Web app (`apps/web/`)** — Next.js 16 + Supabase + Postgres. Legacy fallback for web-only access or server-side rendering needs.

Both surfaces share the same design system (`packages/shared/` and `packages/ui/`) so the same user account reaches every tool without re-onboarding, regardless of which surface they use.

## Context
The repository is organized as a workspace so the design system, shared types, and each tool stay in their own packages.

```
EfficiencyMemo/
  apps/
    desktop/            # Tauri v2 app (recommended for personal use)
    web/                # Next.js 16 app (legacy fallback)
  packages/
    shared/             # Cross-tool types and constants
    ui/                 # React + Tailwind v4 component library
  supabase/
    migrations/         # 3 SQL migrations (original Supabase DDL)
  .omo/                 # Planning artifacts and research notes
```

- `apps/desktop/` — Tauri v2 desktop app with Vite + React 19 SPA, local SQLite via `tauri-plugin-sql`, manual WebDAV sync, OS keychain credential storage. Recommended for personal use.
- `apps/web/` — Next.js 16 App Router with Supabase auth and Postgres. Web-only fallback.

**Stack**: Next.js 16.2.6 (App Router), React 19.2.4, Tailwind v4, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Vitest, Playwright. Node >= 20, pnpm >= 9.

**Desktop stack**: Tauri 2 (desktop shell), Vite 6 (desktop frontend build), React Router 7 (desktop SPA routing), SQLite via `tauri-plugin-sql` (desktop storage), WebDAV via `reqwest_dav` 0.3 (desktop sync), OS keychain via `keyring` 3 (desktop credential storage).

**Tooling**: TypeScript strict mode, ESLint via `eslint-config-next`, Vitest for unit/integration, Playwright for E2E. The test suite runs 341 Vitest cases (16 in `packages/shared` + 41 in `packages/ui` + 284 in `apps/web`) and 53 Playwright cases across the workspace.

## Patterns

**Commands** (run from repo root):
- `pnpm dev` runs every workspace in parallel
- `pnpm build` and `pnpm lint` run only in `apps/web` (the only workspace with those scripts)
- `pnpm typecheck` and `pnpm test` run in every workspace that defines the script (`apps/web` and `packages/shared`); `pnpm test:e2e` runs in `apps/web` only
- `pnpm --filter desktop tauri:dev` — Launch desktop app in dev mode
- `pnpm --filter desktop tauri:build` — Build production desktop installer
- `pnpm --filter desktop build` — Build desktop frontend (Vite only, no Rust)
- `pnpm --filter desktop typecheck` — TypeScript check in desktop
- Per-package: `pnpm --filter web test`, `pnpm --filter @memo/shared typecheck`, etc.

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
- Do not introduce a remote Supabase project or new migrations (web surface only; desktop uses SQLite with its own migration files in `src-tauri/migrations/`)
- Do not add a new top-level dependency without checking every workspace first
- Do not refactor the Supabase mock auth flow; the cookie contract (`efficiency-memo-mock-auth`) is locked for E2E (web surface only; desktop uses a different mock mechanism via `VITE_ENABLE_AUTH_MOCK` or `?mock_session=1`)
- Do not couple desktop features to web features. Each surface has independent copies in `apps/desktop/src/features/` and `apps/web/src/features/`. Shared code goes through `packages/shared/` and `packages/ui/` only.

## Dependencies
- **External**: Node.js 20+, pnpm 9+
- **For web development**: Docker (for local Supabase), Supabase CLI
- **For desktop development**: Rust toolchain (install via [rustup](https://rustup.rs/)); Windows: MSVC Build Tools; macOS: Xcode Command Line Tools; Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`
- **Apps**: `desktop` depends on `tauri`, `react`, `react-router-dom`, `@tauri-apps/api`, `@tauri-apps/plugin-sql`, `@memo/shared`, `@memo/ui`; `web` depends on `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `@memo/shared`, `@memo/ui`
- **Packages**: `@memo/shared` has no runtime deps; `@memo/ui` declares `react`, `react-dom`, `tailwindcss` as peer deps
- **Local services (web)**: local Postgres + Auth via Supabase CLI on ports 54321 (API) and 54322 (Auth)
- **Schema**: three SQL files in `supabase/migrations/` (do not delete or rewrite); plus three SQLite DDL files in `apps/desktop/src-tauri/migrations/` (do not delete or rewrite)
