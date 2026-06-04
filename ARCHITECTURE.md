# EfficiencyMemo — Architecture

## 1. Monorepo Layout

```
EfficiencyMemo/
├── apps/web/              # Next.js 16 App Router (deployable)
│   ├── src/app/           # Route groups: (auth), (shell)
│   ├── src/features/      # Self-registering tools
│   ├── src/lib/           # Auth, Supabase, tool registry
│   └── e2e/               # Playwright specs
├── packages/shared/       # Cross-tool types (ToolManifest, etc.)
├── packages/ui/           # React + Tailwind v4 primitives
└── supabase/migrations/   # 3 SQL files (2 CR, 1 CH)
```

**Key workspaces**:

- `apps/web` — the only deployable surface. Next.js 16.2.6 with App Router, React 19, Tailwind v4.
- `packages/shared` — pure TypeScript types and constants. Zero runtime dependencies.
- `packages/ui` — React component library with Tailwind v4 as a peer dependency.
- `supabase/migrations/` — schema migrations. Three files: `001_cr_device_reminder.sql`, `002_cr_seed_presets.sql`, `003_ch_core_hour.sql`.

---

## 2. Route Groups

The app uses Next.js route groups to separate authenticated and unauthenticated surfaces.

### `(auth)` — Unauthenticated Sign-In Surface

- `apps/web/src/app/(auth)/sign-in/page.tsx` — the sign-in page rendered outside the shell.
- `apps/web/src/app/(auth)/layout.tsx` — minimal layout for the auth surface.

### `(shell)` — Authenticated Content Gate

- `apps/web/src/app/(shell)/layout.tsx` — the auth gate. Calls `requireSessionUser()` and redirects to `/sign-in` if no user.
- `apps/web/src/app/(shell)/dashboard/page.tsx` — the default landing page after sign-in.
- `apps/web/src/app/(shell)/tools/[toolId]/page.tsx` — catch-all route that lazy-loads any registered tool.

### Auth Callback

- `apps/web/src/app/auth/callback/route.ts` — handles the Supabase magic-link return. Exchanges `code` or `token_hash` for a session, then redirects.

**Important**: There is NO `middleware.ts`. Auth gating is done in the route group layout (`app/(shell)/layout.tsx`), not Next.js middleware.

---

## 3. Auth Flow

### Sign-In

- `apps/web/src/components/auth/sign-in-form.tsx` calls `supabase.auth.signInWithOtp()` to send a magic link.
- In dev or E2E mode, mock auth bypasses the email round-trip.

### Callback

- `apps/web/src/app/auth/callback/route.ts` exchanges the OTP `code` for a Supabase session, or handles `mock_session=1` for test flows.

### Gate

- `apps/web/src/app/(shell)/layout.tsx` → `apps/web/src/lib/auth/session.ts` → `requireSessionUser()` redirects to `/sign-in` if no user.

### Sign-Out

- `apps/web/src/lib/auth/actions.ts` → `signOutAction` clears the mock cookie and calls `supabase.auth.signOut()`.

### Mock Auth

- `apps/web/src/features/charger-reminder/auth/mock.ts` defines `MOCK_AUTH_COOKIE = "efficiency-memo-mock-auth"`.
- **Architectural quirk**: the auth shim lives in a feature folder (`features/charger-reminder/auth/`) rather than in `lib/auth/`.

---

## 4. Tool Registry

Tools self-register on module import. No manual wiring is required to add a tool to the sidebar or routing.

### Registration

- Each feature's `index.ts` calls `registerTool(manifest, componentLoader)` on module import.
- `apps/web/src/features/charger-reminder/index.ts` and `apps/web/src/features/core-hour/index.ts` both follow this pattern.

### Registry Core

- `apps/web/src/lib/tool-registry/registry.ts` — private `Map<string, RegisteredTool>` plus `registerTool`, `getRegisteredTools`, and `getToolById`.
- `apps/web/src/lib/tool-registry/discovery.ts` — hard-coded `featureNames = ['charger-reminder', 'core-hour']`. `discoverTools()` dynamically imports manifests via `import('@/features/<name>/manifest')`.
- `apps/web/src/lib/tool-registry/routes.ts` — `generateToolRoutes()` for build-time route enumeration.

### Navigation

- `apps/web/src/lib/shell/tool-navigation.ts` — `getToolList()` (sidebar list) and `getActiveTool(pathname)` (active highlight).

### Catch-All Rendering

- `apps/web/src/app/(shell)/tools/[toolId]/page.tsx` — lazy-loads the tool component via `next/dynamic`. Falls back to `notFound()` if the tool ID is not registered.

---

## 5. Data Flow

### Server Components

- Server Components read from `apps/web/src/lib/supabase/server.ts` (the server-component Supabase client).
- Postgres row-level security (RLS) policies enforce per-user data boundaries.

### Server Actions

- Server actions start with `"use server"` and mutate data.
- After any write, they call `revalidatePath()` for the affected route so the UI refreshes.

### Browser Client

- The browser uses `apps/web/src/lib/supabase/client.ts`, a singleton browser client.

### Three Supabase Clients

All Supabase access goes through one of three files:

- `apps/web/src/lib/supabase/server.ts` — server components
- `apps/web/src/lib/supabase/client.ts` — browser
- `apps/web/src/lib/supabase/proxy.ts` — middleware / proxy contexts

---

## 6. Testing

### Vitest

- Unit and integration tests mirror the source tree under `__tests__/` directories.
- The workspace runs **364 Vitest cases** across `apps/web`, `packages/shared`, and `packages/ui`.

### Playwright

- E2E specs live in `apps/web/e2e/*.spec.ts`.
- The workspace runs **42 Playwright cases**.

### Mock Auth for Dev and E2E

- `NEXT_PUBLIC_ENABLE_AUTH_MOCK=true` enables mock auth in development.
- `AUTH_E2E_MOCK=true` enables mock auth for Playwright tests.
- The mock auth cookie name is locked to `efficiency-memo-mock-auth`.
