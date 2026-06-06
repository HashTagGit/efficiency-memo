# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-06-06

### Added
- Charger Reminder — battery tracking tool with heuristic reminders and device presets
- CoreHour — time tracking tool with periodic check-ins and tag-based categorization
- Supabase-authenticated shell with magic-link sign-in and mock auth for E2E
- Tool registry pattern with self-registering features and dynamic discovery

### Setup
- pnpm workspace monorepo with `apps/web`, `packages/shared`, `packages/ui`
- Next.js 16 App Router with TypeScript strict mode
- Tailwind CSS v4 for styling
- Vitest for unit/integration testing (300 cases)
- Playwright for E2E testing (53 specs)
- ESLint via `eslint-config-next`

### Infrastructure
- Supabase local setup with Postgres + Auth
- Row Level Security (RLS) policies on all tables
- Mock auth system for development and E2E testing
- SQL migrations for Charger-Reminder (`001`, `002`) and CoreHour (`003`)

### Distribution
- **Docker-only distribution** with bundled Supabase stack (Postgres + Auth + Studio + Inbucket)
- **One-click setup** via `setup.sh` (Unix/macOS) or `setup.ps1` (Windows PowerShell 7+)
- **GitHub Actions release pipeline**: pushes a pre-built Docker image to `ghcr.io` and a downloadable `efficiency-memo-v0.0.1.zip` containing `docker-compose.yml`, `.env.docker`, `scripts/`, and `release/README.md`
- 3-stage Dockerfile (deps/builder/runner) using `node:20-alpine` and `pnpm` via `corepack`
- All existing tests (341 Vitest + 53 Playwright) pass as the CI release gate

[0.0.1]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1
