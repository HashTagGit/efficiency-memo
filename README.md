# EfficiencyMemo

A unified tool gallery for daily productivity.

## About

EfficiencyMemo is a pnpm monorepo that bundles independent productivity tools behind a single Next.js shell with Supabase authentication.

The same user account reaches every tool without re-onboarding. Currently it ships two tools: Charger-Reminder for battery tracking with heuristic reminders, and CoreHour for time tracking with periodic check-ins.

New tools can be added by creating a feature folder under `apps/web/src/features/` and registering the tool manifest. The shell discovers tools automatically at build time.

## Features

### Charger Reminder — battery tracking with heuristic reminders

- Track device batteries and get reminded to charge before they run out
- Deterministic heuristic engine (v1) for reminder timing
- Device presets, charge event logging, reminder preferences
- Route: `/tools/charger-reminder`

### CoreHour — time tracking with periodic check-ins

- Track how you spend your time with periodic check-ins and tag-based categorization
- Timer with visibility auto-pause (1s interval)
- Tag management, session history, settings
- Routes: `/tools/core-hour`, `/tools/core-hour/history`, `/tools/core-hour/tags`, `/tools/core-hour/settings`

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.6 | App Router framework |
| React | 19.2.4 | UI library |
| TypeScript | strict | Type safety |
| Tailwind CSS | v4 | Styling |
| Supabase | latest | Postgres + Auth |
| Vitest | latest | Unit/integration tests |
| Playwright | ^1.60.0 | E2E tests |
| pnpm | ≥9 | Package manager |

## Quick Start

**Prerequisites:** Node.js ≥20, pnpm ≥9, Docker, Supabase CLI

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

After `pnpm dev`, the Next.js dev server starts on port 3000. Supabase services run on ports 54321 (API) and 54322 (Auth).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Run Vitest |
| `pnpm test:e2e` | Run Playwright |

## Architecture

EfficiencyMemo is organized as a pnpm monorepo. `apps/web/` is the only deployable surface. `packages/shared/` holds cross-tool types and constants. `packages/ui/` is the React + Tailwind v4 component library.

Tools self-register through a dynamic registry under `src/features/`. Each tool exports a manifest that defines its routes, navigation entry, and metadata. The shell layout reads this registry to render the sidebar and route the user to the correct tool page.

Authentication uses Supabase SSR with magic links. A mock auth flow is available for E2E testing via a special cookie. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system overview.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and conventions.

## License

MIT (c) 2026 HashTagGit. See [LICENSE](./LICENSE).
