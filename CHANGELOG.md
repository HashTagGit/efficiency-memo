# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-06-04

### Added
- Charger Reminder — battery tracking tool with heuristic reminders and device presets
- CoreHour — time tracking tool with periodic check-ins and tag-based categorization
- Supabase-authenticated shell with magic-link sign-in and mock auth for E2E
- Tool registry pattern with self-registering features and dynamic discovery

### Setup
- pnpm workspace monorepo with `apps/web`, `packages/shared`, `packages/ui`
- Next.js 16 App Router with TypeScript strict mode
- Tailwind CSS v4 for styling
- Vitest for unit/integration testing (364 cases)
- Playwright for E2E testing (42 specs)
- ESLint via `eslint-config-next`

### Infrastructure
- Supabase local setup with Postgres + Auth
- Row Level Security (RLS) policies on all tables
- Mock auth system for development and E2E testing
- SQL migrations for Charger-Reminder (`001`, `002`) and CoreHour (`003`)

[0.0.1]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1
