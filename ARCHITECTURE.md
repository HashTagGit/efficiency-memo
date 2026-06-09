# EfficiencyMemo — Architecture

## 1. Monorepo Layout

```
EfficiencyMemo/
├── apps/desktop/          # Tauri v2 app (recommended for personal use)
│   ├── src/               # Vite + React SPA frontend
│   └── src-tauri/         # Rust native shell + SQLite + WebDAV sync
├── apps/web/              # Next.js 16 App Router (original web deployable)
│   ├── src/app/           # Route groups: (auth), (shell)
│   ├── src/features/      # Self-registering tools
│   ├── src/lib/           # Auth, Supabase, tool registry
│   └── e2e/               # Playwright specs
├── packages/shared/       # Cross-tool types (ToolManifest, etc.)
├── packages/ui/           # React + Tailwind v4 primitives
└── supabase/migrations/   # 3 SQL files (2 CR, 1 CH)
```

**Key workspaces**:

- `apps/desktop` — the recommended desktop deployable surface. Tauri v2 with Rust native shell, Vite + React SPA, local SQLite, and optional WebDAV sync.
- `apps/web` — the original web deployable surface. Next.js 16.2.6 with App Router, React 19, Tailwind v4.
- `packages/shared` — pure TypeScript types and constants. Zero runtime dependencies.
- `packages/ui` — React component library with Tailwind v4 as a peer dependency.
- `supabase/migrations/` — schema migrations. Three files: `001_cr_device_reminder.sql`, `002_cr_seed_presets.sql`, `003_ch_core_hour.sql`.

**Two deployable surfaces**:

| Surface | Stack | Storage | Best for |
|---|---|---|---|
| `apps/desktop/` (recommended) | Tauri v2 + Vite + React 19 | Local SQLite (no server) | Personal use, offline-first, multi-device sync via WebDAV |
| `apps/web/` (legacy) | Next.js 16 + Supabase | Postgres (via Supabase CLI) | Web-only access, server-side rendering |

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

3 Supabase client files exist (`client.ts`, `server.ts`, `proxy.ts`) but only `client.ts` and `server.ts` are actively wired. `proxy.ts` exists but is not connected to any middleware.

- `apps/web/src/lib/supabase/server.ts` — server components (wired)
- `apps/web/src/lib/supabase/client.ts` — browser (wired)
- `apps/web/src/lib/supabase/proxy.ts` — present on disk; **not currently wired to any middleware**

---

## 6. Testing

### Vitest

- Unit and integration tests mirror the source tree under `__tests__/` directories.
- The workspace runs **341 Vitest cases** (16 in `packages/shared` + 41 in `packages/ui` + 284 in `apps/web`).

### Playwright

- E2E specs live in `apps/web/e2e/*.spec.ts`.
- The workspace runs **53 Playwright cases**.

### Mock Auth for Dev and E2E

- `NEXT_PUBLIC_ENABLE_AUTH_MOCK=true` enables mock auth in development.
- `AUTH_E2E_MOCK=true` enables mock auth for Playwright tests.
- The mock auth cookie name is locked to `efficiency-memo-mock-auth`.

---

## 7. Desktop App Architecture

The desktop app lives in `apps/desktop/` and is the recommended deployable surface for personal, offline-first use.

### Tauri v2 Shell

- Rust native shell (`src-tauri/`) + Vite/React SPA webview.
- `main.rs` launches the shell.
- `lib.rs` registers plugins and Tauri commands.
- `sync.rs` provides 4 WebDAV commands.

### SQLite Storage

- Tauri plugin-sql opens `sqlite:efficiency-memo.db` in the OS app-data directory.
- 3 SQLite DDL migrations in `src-tauri/migrations/` (ported from Supabase).
- `lib/db.ts` wraps `Database.load()` with `dbSelect()`/`dbExecute()` helpers.
- `DevicePersistenceContract` in `features/charger-reminder/db-tauri.ts` (8 CRUD methods).
- `DbResult` interface in `features/core-hour/db-tauri.ts`.

### Local Auth

- `lib/auth.ts`: `signIn`, `signOut`, `getCurrentUser`, `requireSessionUser`.
- No passwords, no email verification, no Supabase.
- `localStorage` session key: `efficiency-memo-session`.
- Mock auth via `VITE_ENABLE_AUTH_MOCK=true` or `?mock_session=1`.

### WebDAV Sync

- Manual trigger (user clicks button in Settings → Sync).
- `sync_export`: WAL checkpoint → VACUUM INTO → SHA256 → upload to `/memo-backups/<device-id>/<timestamp>.db` + manifest.json.
- `sync_import`: download manifest → verify SHA256 → write to `efficiency-memo.db.next` → restart required.
- `sync_list`: PROPFIND per-device folder.
- `store_webdav_credentials`: OS keychain via `keyring` crate.
- Per-device folders, last-write-wins, no conflict resolution (v1).

### Tool Sharing

- Both surfaces consume `packages/shared/` and `packages/ui/` via `workspace:*`.
- Desktop has feature copies in `apps/desktop/src/features/` (not symlinks — independent copies to avoid coupling).
- Tool registry pattern mirrors web: `registerTool(manifest, componentLoader)` on import.
- React Router handles SPA routing (`BrowserRouter` with `<Routes>`).

### Data Locations

- Windows: `%APPDATA%\com.efficiency-memo.app\efficiency-memo.db`
- macOS: `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db`
- Linux: `~/.local/share/com.efficiency-memo.app/efficiency-memo.db`

### Key Design Differences

| Aspect | Desktop | Web |
|---|---|---|
| Shell | Tauri v2 (Rust + Webview) | Next.js 16 App Router |
| Routing | react-router-dom (SPA) | Next.js file-based routing |
| Storage | SQLite (local file) | Postgres (Supabase) |
| Auth | Local (no server) | Supabase magic links |
| Sync | Manual WebDAV | None (future: Supabase replication) |
| SSR | No (SPA) | Yes (App Router) |
| RLS | No (single-user file) | Yes (Postgres RLS) |
| Build output | `.exe`/`.msi`/`.dmg`/`.AppImage` | Docker image |
