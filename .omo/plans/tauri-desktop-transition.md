# Tauri Desktop Transition

## TL;DR

> **Quick Summary**: Migrate EfficiencyMemo from Docker/Supabase to a Tauri v2 desktop app with local SQLite and WebDAV sync. Ship a Windows `.exe` first, then add Mac/Android support. Keep all React components and the `@memo/ui` design system.
>
> **Deliverables**:
> - `apps/desktop/` — new Tauri v2 workspace (Vite + React + Rust)
> - SQLite database replacing Supabase (10 tables, 3 migrations)
> - WebDAV sync engine (export → upload → download → import)
> - Windows `.exe` build via `pnpm tauri build`
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves, max 5 parallel
> **Critical Path**: Wave 1 (scaffold + schema) → Wave 2 (features) → Wave 3 (sync + build)

---

## Context

### Original Request
User wants a Windows desktop app (not Docker), with Mac and Android support later. Multi-device data sync via WebDAV/Nutstore. Keeps the existing React UI and tools (Charger-Reminder, CoreHour).

### Interview Summary
- **Frustration with Docker**: too many containers, too many auth bugs, too complex for a personal tool
- **Reference project**: TimeTracker (Python desktop app — simple, one-click run)
- **Sync preference**: WebDAV + Nutstore as primary, open to multiple strategies
- **Key ask**: make setup as simple as `pnpm install && pnpm tauri dev`

### Research Findings
- **Supabase touchpoints**: 7 files, 11 revalidatePath sites, 10 tables — well-scoped migration
- **CoreHour advantage**: already has a DB-agnostic `DbResult` interface — minimal changes needed
- **Charger-Reminder seam**: `DevicePersistenceContract` interface — natural abstraction point
- **Tauri v2 + SQLite**: official `@tauri-apps/plugin-sql` v2.4.0, verified against source
- **WebDAV sync**: `reqwest_dav` 0.3 crate, 6 production Tauri apps as reference
- **Next.js incompatible**: SSR doesn't work with Tauri — need new Vite + React workspace

---

## Work Objectives

### Core Objective
Deliver a Windows `.exe` that replaces the Docker stack — same two tools, same UI, zero Docker.

### Concrete Deliverables
- `apps/desktop/` workspace with Tauri v2 + Vite + React + Tailwind v4
- SQLite database with full schema (3 ported migrations from Supabase)
- Charger-Reminder fully functional on Tauri/SQLite
- CoreHour fully functional on Tauri/SQLite
- WebDAV sync engine (manual trigger, per-device last-write-wins)
- Windows build: `pnpm tauri build` → `.exe`

### Definition of Done
- [ ] `pnpm install && pnpm tauri dev` launches the desktop app on Windows
- [ ] Both tools work identically to the Docker-based web app
- [ ] Database migrations auto-apply on first launch
- [ ] WebDAV sync: export DB → upload → download → import (verified with curl)
- [ ] `pnpm tauri build` produces a working Windows `.exe`
- [ ] All existing Vitest tests pass with SQLite test harness
- [ ] Auth is local (no magic links, no Inbucket, no Supabase)

### Must Have
- Windows `.exe` build
- Local SQLite database (replaces Supabase PostgreSQL)
- Charger-Reminder + CoreHour working as-is
- WebDAV sync (manual trigger)
- `@memo/shared` and `@memo/ui` packages reused unchanged
- Existing test suite passes with SQLite

### Must NOT Have (Guardrails)
- Do NOT delete `apps/web/` — keeps the Docker-based web version as fallback
- Do NOT modify `@memo/shared` or `@memo/ui` packages
- Do NOT introduce new remote dependencies (no cloud, no Supabase, no API keys)
- Do NOT change feature behavior — tools must work identically
- Do NOT use Next.js in the desktop app (SSR incompatible with Tauri)
- Do NOT require Docker for any step of the desktop workflow
- Do NOT implement real-time sync (future enhancement, out of scope)

### Sync Strategy Options (User Choice)
| Strategy | Trigger | Conflict | Complexity |
|----------|---------|----------|------------|
| **A: WebDAV manual** | User clicks "Sync" | Per-device folders, last-write-wins | Low |
| **B: WebDAV auto** | On launch + on save | Same as A | Medium |
| **C: P2P (future)** | Automatic | CRDT-based | High |

> **Plan default**: Strategy A (manual trigger, per-device folders). User can request B or C as follow-up.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + Testing Library)
- **Automated tests**: Tests-after (port existing tests to SQLite harness)
- **Agent-Executed QA**: Yes — curl for sync endpoints, Playwright for E2E on `.exe`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — scaffold + schema, ALL parallel):
├── Task 1: Scaffold apps/desktop/ with Tauri v2 + Vite + React
├── Task 2: Port 3 SQL migrations to SQLite DDL
├── Task 3: Set up `@tauri-apps/plugin-sql` + migration runner
├── Task 4: Set up DB interface layer (DbResult for CoreHour, DeviceRepo for CR)
└── Task 5: Reuse @memo/shared + @memo/ui via workspace:*

Wave 2 (After Wave 1 — feature migration, MAX PARALLEL):
├── Task 6: Migrate Charger-Reminder to SQLite backend
├── Task 7: Migrate CoreHour to SQLite backend
├── Task 8: Local auth module (replace Supabase auth)
└── Task 9: Shell + layout + navigation (replace Next.js App Router)

Wave 3 (After Wave 2 — sync + build, sequential):
├── Task 10: WebDAV sync engine (Rust side)
├── Task 11: Sync UI + settings page
├── Task 12: Windows build + signing

Critical Path: Task 1 → Task 3 → Task 6 → Task 10 → Task 12
Max Concurrent: 5 (Wave 1)
```

---

## TODOs

- [x] 1. Scaffold `apps/desktop/` with Tauri v2 + Vite + React + Tailwind v4

  **What to do**:
  - Create `apps/desktop/` directory
  - Run `pnpm create tauri-app . --template react-ts` inside it
  - Verify: `apps/desktop/src/` (React frontend) + `apps/desktop/src-tauri/` (Rust backend)
  - Add Tailwind v4 config matching `@memo/ui` design tokens
  - Add `@memo/shared` and `@memo/ui` as `workspace:*` dependencies in `apps/desktop/package.json`
  - Add `@tauri-apps/plugin-sql` to both Cargo.toml (Rust) and package.json (JS)
  - Configure `sql:default` + `sql:allow-execute` permissions in `src-tauri/capabilities/default.json`
  - Verify: `pnpm tauri dev` opens a blank Tauri window

  **Must NOT do**:
  - Do NOT use Next.js in the desktop app
  - Do NOT copy `apps/web/` code yet — tasks 6-9 handle migration
  - Do NOT modify existing workspace packages

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None

  **Parallelization**: Wave 1 — can run in parallel with Tasks 2, 3, 4, 5

  **References**:
  - Tauri v2 project structure: `https://v2.tauri.app/start/project-structure`
  - Tauri plugin SQL setup: `https://v2.tauri.app/plugin/sql/`
  - `tauri-plugin-sql` source (verified): `https://github.com/tauri-apps/plugins-workspace/blob/4350ca65/plugins/sql/guest-js/index.ts`
  - Existing `packages/ui/tailwind.config.ts` — design tokens to replicate

  **Acceptance Criteria**:
  - [ ] `pnpm tauri dev` launches a window
  - [ ] `@tauri-apps/plugin-sql` loads without errors
  - [ ] `@memo/ui` components render correctly

  **QA Scenarios**: Tauri dev server starts, window appears, SQL plugin loads

  **Commit**: YES — `feat(desktop): scaffold Tauri v2 workspace with plugin-sql`

- [x] 2. Port 3 Supabase SQL migrations to SQLite DDL

  **What to do**:
  - Read `supabase/migrations/001_cr_device_reminder.sql` — 5 `cr_*` tables
  - Read `supabase/migrations/002_cr_seed_presets.sql` — 5 seed rows
  - Read `supabase/migrations/003_ch_core_hour.sql` — 5 `ch_*` tables + settings seed
  - Create 3 SQLite migration files in `apps/desktop/src-tauri/migrations/`:
    - `0001_cr_device_reminder.sql` — port DDL: `timestamptz`→`TEXT`, `uuid`→`TEXT`, `numeric`→`REAL`, `boolean`→`INTEGER`
    - `0002_cr_seed_presets.sql` — port INSERTs
    - `0003_ch_core_hour.sql` — port DDL + seed settings
  - Replace `REFERENCES auth.users(id)` with local `users` table definition
  - Add `users` table creation in migration 0001
  - Ensure `IF NOT EXISTS` on all CREATE statements (idempotent)

  **Must NOT do**:
  - Do NOT change table/column names or prefixes (`cr_`, `ch_`)
  - Do NOT change seed data values
  - Do NOT delete the original Supabase migrations

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 — parallel with Tasks 1, 3, 4, 5

  **References**: `supabase/migrations/001_cr_device_reminder.sql`, `002_cr_seed_presets.sql`, `003_ch_core_hour.sql`

  **Acceptance Criteria**:
  - [ ] 3 SQLite migration files exist in `apps/desktop/src-tauri/migrations/`
  - [ ] Each file is valid SQLite syntax (no Postgres-specific types)

  **QA Scenarios**: Execute each SQL file against `:memory:` SQLite, verify no syntax errors

  **Commit**: YES — `feat(desktop): port Supabase migrations to SQLite DDL`

- [ ] 3. Set up Rust-side migration runner + plugin registration

  **What to do**:
  - In `apps/desktop/src-tauri/src/lib.rs`:
    - Import `tauri_plugin_sql::{Builder, Migration, MigrationKind}`
    - Define 3 `Migration` structs with `include_str!("../migrations/NNNN_name.sql")`
    - Register plugin with `.add_migrations("sqlite:efficiency-memo.db", migrations)`
    - Add `preload: ["sqlite:efficiency-memo.db"]` to `tauri.conf.json`
  - Verify: migrations auto-apply on first `Database.load()`

  **Must NOT do**: Skip preload config (migrations only run on explicit load() otherwise)

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 — depends on Task 2 (migration files exist)

  **References**: `tauri-plugin-sql` source: `https://github.com/tauri-apps/plugins-workspace/blob/4350ca65/plugins/sql/src/lib.rs#L74-L80`

  **Acceptance Criteria**: [ ] `pnpm tauri dev` applies all 3 migrations, DB file created at `%APPDATA%/efficiency-memo.db`

  **QA Scenarios**: Check SQLite DB file exists after first launch, verify all tables present

  **Commit**: YES — `feat(desktop): register SQL plugin with migration runner`

- [ ] 4. Create DB interface layer (DbResult for CoreHour, DeviceRepo for CR)

  **What to do**:
  - Create `apps/desktop/src/lib/db.ts` — wraps `@tauri-apps/plugin-sql`:
    - Export `getDb()` singleton (lazy `Database.load()`)
    - Export `dbSelect<T>()` and `dbExecute()` helpers
  - Create `apps/desktop/src/features/core-hour/db-tauri.ts`:
    - Implement `DbResult` interface (from `features/core-hour/hooks/db.ts`)
    - Wire `setDb()` at app startup
  - Create `apps/desktop/src/features/charger-reminder/db-tauri.ts`:
    - Implement `DevicePersistenceContract` (from `database/contracts.ts`)
    - All 8 CRUD methods ported from Supabase to raw SQLite queries
  - Use `$1, $2` placeholder syntax (not `?`) for SQLite via sqlx

  **Must NOT do**: Do NOT use `?` placeholders (sqlx uses `$N`)

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 — depends on Tasks 1, 2, 3

  **References**: `apps/web/src/features/core-hour/hooks/db.ts:8-14` (DbResult interface), `apps/web/src/features/charger-reminder/database/contracts.ts:114-127` (DevicePersistenceContract), `apps/web/src/features/charger-reminder/database/devices.ts` (8 CRUD methods)

  **Acceptance Criteria**:
  - [ ] `DbResult` interface implemented for Tauri
  - [ ] `DevicePersistenceContract` implemented with all 8 methods
  - [ ] Each method tested with sample data

  **QA Scenarios**: Call each CRUD method with test data, verify correct results

  **Commit**: YES — `feat(desktop): implement DB interface layer for both features`

- [ ] 5. Reuse `@memo/shared` + `@memo/ui` via workspace protocol

  **What to do**:
  - Verify `apps/desktop/package.json` has `@memo/shared: "workspace:*"` and `@memo/ui: "workspace:*"`
  - Copy Tailwind v4 config from `packages/ui` to `apps/desktop/` (content paths, theme tokens)
  - Import and render a test component from `@memo/ui` (e.g., Button, Card) in `apps/desktop/src/App.tsx`
  - Verify: `pnpm tauri dev` renders the component correctly

  **Must NOT do**: Do NOT modify `@memo/shared` or `@memo/ui` source

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 — parallel with Tasks 1, 2

  **References**: `packages/ui/src/index.ts`, `packages/shared/src/index.ts`

  **Acceptance Criteria**: [ ] `@memo/ui` components render in Tauri window

  **QA Scenarios**: Render Button, Card, Modal from @memo/ui, verify correct styling

  **Commit**: YES — `feat(desktop): integrate @memo/shared and @memo/ui`

- [ ] 6. Migrate Charger-Reminder to SQLite backend

  **What to do**:
  - Copy CR components, pages, hooks from `apps/web/src/features/charger-reminder/` to `apps/desktop/src/features/charger-reminder/`
  - Copy CR pages from `apps/web/src/app/(shell)/tools/charger-reminder/` to `apps/desktop/src/pages/tools/charger-reminder/`
  - Replace all `"use server"` actions with Tauri commands or client-side calls to `DevicePersistenceContract` (Task 4)
  - Replace all `revalidatePath()` calls with client-side state invalidation
  - Replace `requireSessionUser()` with local auth module (Task 8)
  - Convert inline server actions to client handlers
  - Wire Vite route paths

  **Must NOT do**: Do NOT change heuristic logic, device presets, or component behavior

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 2 — parallel with Tasks 7, 8, 9 (depends on Task 4)

  **References**: `apps/web/src/features/charger-reminder/database/devices.ts` (full CRUD)

  **Acceptance Criteria**:
  - [ ] Create device → appears in list
  - [ ] Edit device → changes persist
  - [ ] Delete device → removed from list
  - [ ] Log charge event → updates reminder state

  **QA Scenarios**: Full CRUD cycle: create, read, update, delete a device

  **Commit**: YES — `feat(desktop): migrate Charger-Reminder to SQLite backend`

- [ ] 7. Migrate CoreHour to SQLite backend

  **What to do**:
  - Copy CH components, hooks, context to `apps/desktop/src/features/core-hour/`
  - Wire `getDb()` to return Tauri-backed `DbResult` (Task 4)
  - Call `setDb(tauriDb)` at app startup
  - Copy CH pages to `apps/desktop/src/pages/tools/core-hour/`
  - Wire Vite route paths

  **Must NOT do**: Do NOT change the `DbResult` interface, timer logic, or context providers

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 2 — parallel with Tasks 6, 8, 9 (depends on Task 4)

  **References**: `apps/web/src/features/core-hour/hooks/db.ts`, `apps/web/src/features/core-hour/hooks/context.tsx`

  **Acceptance Criteria**:
  - [ ] Start session → active timer starts
  - [ ] Check-in → tags saved
  - [ ] End session → appears in history

  **QA Scenarios**: Full session flow: start → check-in → end → verify history

  **Commit**: YES — `feat(desktop): migrate CoreHour to SQLite backend`

- [ ] 8. Local auth module (replace Supabase auth)

  **What to do**:
  - Create `apps/desktop/src/lib/auth.ts` with signIn, signOut, getCurrentUser, requireSessionUser
  - No passwords, no magic links, no Supabase
  - Keep mock auth path for E2E testing

  **Must NOT do**: Do NOT require internet, email verification, or passwords

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 2 — parallel with Tasks 6, 7, 9

  **References**: `apps/web/src/lib/auth/session.ts`

  **Acceptance Criteria**:
  - [ ] Sign in → session established
  - [ ] Sign out → session cleared
  - [ ] requireSessionUser() blocks unauthenticated access

  **QA Scenarios**: Sign in, verify dashboard loads; sign out, verify redirect

  **Commit**: YES — `feat(desktop): implement local auth module`

- [ ] 9. Shell + layout + navigation (Vite React Router)

  **What to do**:
  - Set up `react-router-dom` for SPA navigation
  - Create shell layout with sidebar (reuse `@memo/ui` Shell/Sidebar)
  - Create tool registry, wire routes, add auth gate

  **Must NOT do**: Do NOT use Next.js App Router

  **Recommended Agent Profile**: `visual-engineering`

  **Parallelization**: Wave 2 — parallel with Tasks 6, 7, 8

  **References**: `apps/web/src/app/(shell)/layout.tsx`, `apps/web/src/lib/tool-registry/`

  **Acceptance Criteria**:
  - [ ] Sidebar shows both tools, clicking navigates
  - [ ] Dashboard shows tool gallery
  - [ ] Auth gate redirects unauthenticated users

  **QA Scenarios**: Navigate between dashboard and tools via sidebar

  **Commit**: YES — `feat(desktop): implement shell layout with React Router`

- [ ] 10. WebDAV sync engine (Rust side)

  **What to do**:
  - Add `reqwest_dav` to `Cargo.toml`
  - Create `src-tauri/src/sync.rs`:
    - `export_db()`: WAL checkpoint → VACUUM INTO snapshot → zip → upload to WebDAV
    - `import_db()`: download from WebDAV → verify checksum → close connection → atomic rename → reopen
    - `list_remote()`: list backups on WebDAV server
    - Per-device folder: `/memo-backups/<device-id>/<timestamp>.db`
    - Manifest file: `manifest.json` with `{ device_id, schema_version, timestamp, sha256 }`
  - Expose as Tauri commands: `sync_export`, `sync_import`, `sync_list`
  - Handle edge cases: empty remote (push local), concurrent write (per-device folders), WAL sidecar files
  - Password storage: use OS keychain (not plain file)

  **Must NOT do**: Do NOT auto-sync (manual trigger only for v1)

  **Recommended Agent Profile**: `deep`

  **Parallelization**: Wave 3 — sequential (depends on Tasks 6, 7 completed for DB schema stability)

  **References**: `apps/desktop/src/lib/db.ts` (DB wrapper), Research: `reqwest_dav` 0.3 API, 6 reference apps

  **Acceptance Criteria**:
  - [ ] Export → local snapshot file created
  - [ ] Upload → file appears on WebDAV server
  - [ ] Download → file retrieved from WebDAV
  - [ ] Import → local DB replaced with downloaded data
  - [ ] Edge case: empty remote → push local succeeds

  **QA Scenarios**: Export DB, upload to test WebDAV, download on clean DB, verify data matches

  **Commit**: YES — `feat(desktop): implement WebDAV sync engine`

- [ ] 11. Sync UI + settings page

  **What to do**:
  - Create `apps/desktop/src/pages/settings/sync.tsx`:
    - WebDAV server URL input
    - Username/password fields (stored in OS keychain)
    - "Sync Now" button (calls `sync_export` then `sync_import`)
    - "Last synced" timestamp display
    - Sync history list (from remote manifest)
    - Conflict resolution UI (if needed)
  - Add sync option to sidebar/settings
  - Add sync status indicator to shell header
  - Wire Tauri commands from Task 10

  **Must NOT do**: Do NOT auto-trigger sync — user must click button

  **Recommended Agent Profile**: `visual-engineering`

  **Parallelization**: Wave 3 — depends on Task 10

  **References**: Task 10 Tauri commands (`sync_export`, `sync_import`, `sync_list`)

  **Acceptance Criteria**:
  - [ ] WebDAV config persists
  - [ ] "Sync Now" triggers export → upload → download → import cycle
  - [ ] Sync status shown in UI
  - [ ] Error states handled (no network, wrong password, quota exceeded)

  **QA Scenarios**: Configure WebDAV, click sync, verify data appears after import; test error cases

  **Commit**: YES — `feat(desktop): add sync UI and settings page`

- [ ] 12. Windows build + packaging

  **What to do**:
  - Configure `tauri.conf.json` for Windows:
    - `bundle.identifier`: `com.efficiency-memo.app`
    - `bundle.icon`: generate app icon
    - `windows[0].title`: "EfficiencyMemo"
  - Run `pnpm tauri build` → produces `.exe` and `.msi`
  - Test `.exe` on clean Windows (no dev tools)
  - Verify: DB auto-creates, migrations run, sync works
  - Optional: code signing for distribution

  **Must NOT do**: Do NOT include dev dependencies in the bundle

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 3 — depends on Tasks 10, 11

  **References**: `https://v2.tauri.app/distribute/windows/`

  **Acceptance Criteria**:
  - [ ] `pnpm tauri build` succeeds
  - [ ] `.exe` file in `src-tauri/target/release/bundle/msi/`
  - [ ] `.exe` launches on clean Windows
  - [ ] App works without dev tools installed

  **QA Scenarios**: Build, install on clean system, launch, verify tools work, test sync

  **Commit**: YES — `feat(desktop): configure Windows build and packaging`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": verify no violations.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [12/12] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build Verification** — `unspecified-high`
  Run `pnpm tauri build` from `apps/desktop/`. Verify exit code 0, `.exe` exists. Install on test machine, verify tools work. Run all Vitest tests.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | EXE [EXISTS/MISSING] | VERDICT`

- [ ] F3. **Sync Verification** — `unspecified-high`
  Start with clean DB on "Device A". Export and upload to test WebDAV. Start clean "Device B" (delete local DB). Import from WebDAV. Verify all data matches Device A. Test edge cases: empty remote, network failure, schema version mismatch.
  Output: `Export [PASS/FAIL] | Upload [PASS/FAIL] | Import [PASS/FAIL] | Edge Cases [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Detect unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Build Verification** — `unspecified-high`
- [ ] F3. **Sync Verification** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

- **Wave 1**: commits per task (5 commits)
- **Wave 2**: commits per feature (4 commits)
- **Wave 3**: commits per component (3 commits)

---

## Success Criteria

### Verification Commands
```bash
# Launch desktop app
cd apps/desktop && pnpm tauri dev
# Expected: window opens with EfficiencyMemo UI

# Build Windows .exe
cd apps/desktop && pnpm tauri build
# Expected: .exe file in src-tauri/target/release/

# Sync via WebDAV (with curl)
curl -u user:pass -T efficiency-memo.db https://dav.example.com/memo-backups/device-1/latest.db
# Expected: 201 Created

# Download from WebDAV
curl -u user:pass https://dav.example.com/memo-backups/device-1/latest.db -o restored.db
# Expected: identical SQLite file
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `.exe` launches and tools work
- [ ] Sync exports and imports correctly
