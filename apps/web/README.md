# apps/web

This is the web application package for EfficiencyMemo — the original web deployable surface in the monorepo.

See the [root README](../../README.md) for the full project overview, feature descriptions, and quick start guide.

## Quick Links

- [Project README](../../README.md) — overview, features, tech stack, quick start
- [Architecture](../../ARCHITECTURE.md) — system design, auth flow, tool registry
- [Contributing](../../CONTRIBUTING.md) — local setup, conventions, testing

## Local Dev

From repo root:

```bash
pnpm dev          # starts all workspaces (runs on http://localhost:3000)
pnpm test         # runs Vitest suites
pnpm test:e2e     # runs Playwright E2E specs
```
