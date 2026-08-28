# AGENTS.md

## Purpose
EfficiencyMemo is a pnpm monorepo that hosts a unified tool gallery for daily productivity. It bundles CoreHour and Pause & Hydrate behind a deployable surface:

- **Desktop app (`apps/desktop/`)** — Tauri v2 + local SQLite + local auth + WebDAV sync. Recommended for personal, offline-first use. No cloud account required.

The desktop surface consumes the shared design system (`packages/shared/` and `packages/ui/`).

## Context
The repository is organized as a workspace so the design system, shared types, and each tool stay in their own packages.

```
EfficiencyMemo/
  apps/
    desktop/            # Tauri v2 app (recommended for personal use)
  packages/
    shared/             # Cross-tool types and constants
    ui/                 # React + Tailwind v4 component library
  .omo/                 # Planning artifacts and research notes
```

- `apps/desktop/` — Tauri v2 desktop app with Vite + React 19 SPA, local SQLite via `tauri-plugin-sql`, manual WebDAV sync, OS keychain credential storage. Recommended for personal use.

**Stack**: React 19.2.4, Tailwind v4, Vitest. Node >= 20, pnpm >= 9.

**Desktop stack**: Tauri 2 (desktop shell), Vite 6 (desktop frontend build), React Router 7 (desktop SPA routing), SQLite via `tauri-plugin-sql` (desktop storage), WebDAV via `reqwest_dav` 0.3 (desktop sync), OS keychain via `keyring` 3 (desktop credential storage).

**Tooling**: TypeScript strict mode, ESLint, Vitest for unit/integration. The test suite runs 57 Vitest cases (16 in `packages/shared` + 41 in `packages/ui`) across the workspace.

## Patterns

**Commands** (run from repo root):
- `pnpm typecheck` and `pnpm test` run in every workspace that defines the script (`apps/desktop` and `packages/shared`)
- `pnpm --filter desktop tauri:dev` — Launch desktop app in dev mode
- `pnpm --filter desktop tauri:build` — Build production desktop installer
- `pnpm --filter desktop build` — Build desktop frontend (Vite only, no Rust)
- `pnpm --filter desktop typecheck` — TypeScript check in desktop

**Conventions**:
- Tests mirror the source tree under `__tests__/` and use Vitest + Testing Library
- Components compose `@memo/ui` primitives instead of re-implementing buttons, cards, or modals

## Constraints
- Do not modify the `.gitignore` patterns without checking with the user; it already covers `node_modules/`, `.next/`, `dist/`, `.env*` (with `!.env.example`), test outputs, and OS junk
- Do not commit secrets, `node_modules`, build output, or Playwright reports
- Do not add a new top-level dependency without checking every workspace first
- Do not modify feature copies in `apps/desktop/src/features/` when adding new shared code. Shared code goes through `packages/shared/` and `packages/ui/` only.

## Dependencies
- **External**: Node.js 20+, pnpm 9+
- **For desktop development**: Rust toolchain (install via [rustup](https://rustup.rs/)); Windows: MSVC Build Tools; macOS: Xcode Command Line Tools; Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`
- **Apps**: `desktop` depends on `tauri`, `react`, `react-router-dom`, `@tauri-apps/api`, `@tauri-apps/plugin-sql`, `@memo/shared`, `@memo/ui`
- **Packages**: `@memo/shared` has no runtime deps; `@memo/ui` declares `react`, `react-dom`, `tailwindcss` as peer deps
- **Schema**: three SQLite DDL files in `apps/desktop/src-tauri/migrations/` (do not delete or rewrite)
