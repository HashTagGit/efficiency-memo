# apps/web

## Purpose
`apps/web` is the only deployable surface in the workspace. It is a Next.js 16 App Router application that authenticates users against the local Supabase instance, gates a shell layout (sidebar + header), and renders the per-tool pages for Charger-Reminder and CoreHour through a dynamic tool registry.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Context
The app is structured around route groups: `(auth)` for the unauthenticated sign-in surface, `(shell)` for everything behind the auth gate, and `auth/callback` for the Supabase magic-link return path. The shell is rendered by `app/(shell)/layout.tsx` (server) plus `shell-layout-client.tsx` (client) using the `Shell` component from `@memo/ui`.

**Key modules**:
- `src/lib/env.ts`, single source for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `src/lib/supabase/{client,server,proxy}.ts`, three Supabase clients (browser, server components, middleware/proxy)
- `src/lib/auth/session.ts`, `getSessionUser` and `requireSessionUser`; falls back to the mock cookie in dev
- `src/lib/auth/actions.ts`, `signOutAction` server action
- `src/lib/tool-registry/{registry,discovery,routes,types}.ts`, internal Map + dynamic feature discovery
- `src/lib/shell/tool-navigation.ts`, `getToolList` and `getActiveTool(pathname)`
- `src/app/auth/callback/route.ts`, handles `code`, `token_hash`, and `mock_session=1` paths
- `src/app/api/mock-auth/bypass/route.ts`, dev-only auth bypass for E2E

**Tool registry** maps the list under `src/features/*` into manifests. Discovery uses `import('@/features/<name>/manifest')` for `charger-reminder` and `core-hour`; each feature's `index.ts` calls `registerTool` on import.

## Patterns
- Use Server Components by default; opt into `"use client"` only for stateful or browser-only logic
- Server actions live in `database/server-actions.ts` (or `database/<entity>.ts`) inside each feature; they end with `revalidatePath` for the affected route
- Pull types from `@memo/shared` for tool-related shapes; pull UI from `@memo/ui`; never duplicate them locally
- All Supabase access goes through the three clients in `src/lib/supabase/`, never via direct `createClient` calls
- Tests mirror the source tree under `__tests__/`; E2E specs live in `e2e/*.spec.ts`
- Auth gating: `requireSessionUser()` redirects to `/sign-in` when no user; the `(shell)` layout calls it once
- For new tools, add an entry in `src/lib/tool-registry/discovery.ts` (`featureNames` array) and a feature folder under `src/features/`
- Mock auth toggle: `NEXT_PUBLIC_ENABLE_AUTH_MOCK=true` or `AUTH_E2E_MOCK=true`; never enable in production

## Constraints
- Do not bypass the auth gate; the `(shell)` route group is the only authenticated area
- Do not create new Supabase clients; route every call through `client.ts`, `server.ts`, or `proxy.ts`
- Do not change the mock auth cookie name (`efficiency-memo-mock-auth`) or its options
- Do not move features out of `src/features/`; the discovery path is hard-coded
- Do not use `getServerSession`, `@supabase/auth-helpers`, or any deprecated Supabase auth API
- Do not call `redirect` from a Client Component; do it from a Server Component or Server Action
- Do not add top-level dependencies without checking whether they belong in `packages/ui` or `packages/shared` first
- Do not edit the fonts loaded in `src/app/layout.tsx` (Manrope, Cormorant Garamond, Geist Mono) without reviewing the design system

## Dependencies
- **Runtime**: `next 16.2.6`, `react 19.2.4`, `react-dom 19.2.4`, `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.106.2`, `@memo/shared` (workspace), `@memo/ui` (workspace)
- **Dev**: Vitest, Testing Library, Playwright, `eslint-config-next 16.2.6`, `pg-mem` (test-only Postgres replacement)
- **Database**: local Supabase CLI (Postgres + Auth + Studio); migrations in `/supabase/migrations/`
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both required; see `src/lib/env.ts`); optional mock toggles `NEXT_PUBLIC_ENABLE_AUTH_MOCK`, `AUTH_E2E_MOCK`, `E2E_MOCK_DB`
- **Tooling**: Playwright config at `apps/web/playwright.config.ts`; ESLint via `next lint`
