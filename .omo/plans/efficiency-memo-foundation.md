# EfficiencyMemo — Foundation

## TL;DR

> **Quick Summary**: Build a modern web-based tool gallery by migrating Charger-Reminder (Next.js battery tracker) and CoreHour (desktop time tracker, converted to web) into a unified pnpm monorepo with shared auth, UI shell, and extensible tool registry — deployed to Vercel.
>
> **Deliverables**:
> - pnpm workspace monorepo with shared packages (`@memo/shared`, `@memo/ui`)
> - Unified Next.js 16 web app (`apps/web`) with magic-link auth
> - Sidebar-based tool shell with lazy-loaded tool registry
> - **Tool 1**: Charger-Reminder (device battery tracking) — migrated and verified
> - **Tool 2**: CoreHour (interval time tracking with tag check-ins) — converted to web and verified
> - Merged Supabase schema (11 namespaced tables) with reversible migrations
> - Full TDD test coverage (Vitest unit + Playwright e2e) for both tools
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 8 waves, up to 8 concurrent tasks
> **Critical Path**: Task 1 → 9 → 17 → 22 → 27 → 42 → F1-F4

---

## Context

### Original Request
> "This project is to collect multi small tools to note daily work, todo list, notification, remainder, etc. It combines multi useful tools and give users feedbacks. Move Charger-Reminder and CoreHour into EfficiencyMemo. Plan this project structure, so that it is like a modern tool gallery, with a clear and readable worktree."

### Interview Summary
**Key Discussions**:
- **Platform**: Web-only Next.js. CoreHour's Tauri desktop features (system tray, always-on-top popup, Rust timer) converted to web-native alternatives. Priority: stability, well-known tech, long-term maintainability.
- **Auth**: Unified Supabase magic-link across all tools. Single sign-in for everything. No email/password auth.
- **Monorepo**: pnpm workspaces with single Next.js app + shared packages. Tools live as feature directories within the app.
- **Shell UX**: Collapsible sidebar with tool icons and names. Dashboard with tool cards.
- **Database**: Single Supabase project, namespaced tables (`cr_` prefix for Charger-Reminder, `ch_` prefix for CoreHour). Use Supabase `auth.users` as user source of truth — no separate app users table.
- **Delivery**: Incremental — Charger-Reminder shipped first (already Next.js, low risk), then CoreHour converted.
- **Testing**: TDD with Vitest + Playwright. Agent-executed QA scenarios mandatory for every task.
- **Future**: Many unknown tools expected — tool registry designed for extensibility from day one.
- **No existing users**: Fresh Supabase project, no data migration needed.

**Research Findings**:
- Charger-Reminder already uses Next.js 16 + Supabase SSR + Tailwind 4 + Vitest/Playwright — the ideal reference architecture for the monorepo.
- CoreHour uses Tauri 2 (Rust) + React 19 + Zustand + local SQLite. Frontend patterns (React components, Zustand stores) can be adapted to Next.js; Rust backend must be replaced with web-native JS timer.
- Both projects share Supabase as the cloud backend, making a unified project straightforward.
- Charger-Reminder's mock DB pattern (pg-mem for tests, E2E_MOCK_DB flag) provides a proven testing strategy to replicate for CoreHour.

### Metis Review
**Identified Gaps** (addressed):
- **User table collision**: Resolved — use Supabase `auth.users` as single source of truth. Drop app-level users tables.
- **Auth migration**: No existing users, so no migration needed. Both tools use magic-link from day one.
- **Timer precision loss**: Accepted — CoreHour's Rust timer replaced with `setInterval` + Visibility API (±30s drift documented and acceptable).
- **CoreHour popup UX**: Resolved — always-on-top window replaced with in-app modal component.
- **Offline capability**: Accepted — web-only means internet required. Documented as known limitation.
- **Scope creep guardrails**: MUST NOT build abstractions for hypothetical future tools. MUST NOT add auth features beyond magic-link. MUST NOT change Charger-Reminder behavior during migration.

---

## Work Objectives

### Core Objective
Build EfficiencyMemo as a unified Next.js 16 web application that hosts multiple productivity tools behind shared authentication, starting with a migrated Charger-Reminder and a web-converted CoreHour.

### Concrete Deliverables
- `apps/web/` — Main Next.js 16 app with shell, auth, tool registry
- `packages/shared/` — @memo/shared: TypeScript types, constants, utility types
- `packages/ui/` — @memo/ui: Sidebar, Shell, Card, Modal, Button components
- `supabase/migrations/` — Merged, reversible SQL migrations (namespaced `cr_` and `ch_` tables)
- `apps/web/src/features/charger-reminder/` — Migrated CR feature with manifest
- `apps/web/src/features/core-hour/` — Converted CH feature with manifest
- `apps/web/e2e/` — Playwright end-to-end tests for both tools
- `.env.example` + Vercel deployment configuration

### Definition of Done
- [ ] `pnpm install` succeeds at workspace root
- [ ] `pnpm dev` starts Next.js on localhost:3000
- [ ] User can sign in with magic-link and access dashboard
- [ ] Sidebar shows both tools; clicking navigates to each tool
- [ ] Charger-Reminder: create device, log charge, view reminder — all work identically to original
- [ ] CoreHour: start session, receive check-in prompt, split tags, view history — all work
- [ ] `pnpm test` passes all Vitest suites (both tools + shared packages)
- [ ] `pnpm test:e2e` passes all Playwright suites
- [ ] `pnpm build` succeeds with no errors
- [ ] Vercel deployment serves the app at production URL

### Must Have
- Unified magic-link auth across all tools
- Extensible tool registry with manifest pattern
- Shell with collapsible sidebar navigation
- All original Charger-Reminder functionality preserved
- CoreHour: session timer, tag-based check-in, history view (web-native)
- TDD test coverage: unit (Vitest) + e2e (Playwright) for both tools
- Reversible database migrations
- Vercel deployment configuration

### Must NOT Have (Guardrails)
- No Tauri/Rust code — CoreHour rebuilt web-only
- No native OS features (system tray, always-on-top windows)
- No email/password auth — magic-link only
- No separate `users` table — Supabase `auth.users` is sole user source
- No abstractions for hypothetical future tools beyond the manifest pattern
- No changes to Charger-Reminder's core behavior
- No offline-first data layer — Supabase direct (internet required)
- No auth features beyond magic-link (no OAuth, MFA, SSO, roles)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (both source projects have Vitest, CR has Playwright)
- **Automated tests**: TDD
- **Framework**: Vitest (unit/integration) + Playwright (e2e)
- **TDD Flow**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Target: 5-8 tasks per wave.

```
Wave 1 (Start Immediately — foundation + config, 8 tasks MAX PARALLEL):
├── Task 1: Initialize pnpm workspace + root configuration [quick]
├── Task 2: Scaffold @memo/shared package structure [quick]
├── Task 3: Implement @memo/shared types + constants (TDD) [quick]
├── Task 4: Scaffold @memo/ui package structure [quick]
├── Task 5: Implement @memo/ui Sidebar + Shell components (TDD) [visual-engineering]
├── Task 6: Scaffold apps/web Next.js app [quick]
├── Task 7: Tailwind v4 config + design tokens + globals.css [visual-engineering]
└── Task 8: Implement @memo/ui Card + Modal + Button (TDD) [visual-engineering]

Wave 2 (After Wave 1 — auth, DB, test infra, 7 tasks):
├── Task 9: Environment config + env validation [quick]
├── Task 10: Supabase SSR browser client [quick]
├── Task 11: Supabase SSR server + proxy clients [quick]
├── Task 12: Supabase migration: CR schema (cr_ namespaced, 6 tables) [quick]
├── Task 13: Supabase migration: CH schema (ch_ namespaced, 5 tables) [quick]
├── Task 14: Auth: sign-in page + magic-link form [visual-engineering]
└── Task 15: Auth: callback route + session guard + sign-out [quick]

Wave 3 (After Wave 2 — shell + tool system, 5 tasks):
├── Task 16: Test infrastructure: Vitest + Playwright config + smoke tests [quick]
├── Task 17: Shell layout: sidebar + header + auth gate (TDD) [visual-engineering]
├── Task 18: Tool registry: manifest types + registration function (TDD) [quick]
├── Task 19: Tool registry: discovery + route generation + lazy loading (TDD) [quick]
└── Task 20: Dashboard page: tool gallery with cards + empty state [visual-engineering]

Wave 4 (After Wave 3 — CR core migration, 6 tasks):
├── Task 21: CR manifest + tool registration [quick]
├── Task 22: CR types + test fixtures migration [quick]
├── Task 23: CR database layer: contracts + device-presets + devices CRUD [deep]
├── Task 24: CR database tests: pg-mem integration suite [deep]
├── Task 25: CR heuristic engine migration + tests [deep]
└── Task 26: CR auth mock + E2E mock DB setup [quick]

Wave 5 (After Wave 4 — CR UI + e2e, 5 tasks):
├── Task 27: CR DeviceList + DeviceCard components + tests [visual-engineering]
├── Task 28: CR DeviceDetail + DeviceForm components + tests [visual-engineering]
├── Task 29: CR pages: device list + detail routes [visual-engineering]
├── Task 30: CR pages: new device + edit device routes [visual-engineering]
└── Task 31: CR Playwright e2e: auth + device CRUD + reminders [deep]

Wave 6 (After Wave 3 — CH core conversion, 6 tasks):
├── Task 32: CH manifest + tool registration [quick]
├── Task 33: CH types + test fixtures migration [quick]
├── Task 34: CH database layer: SQLite→Supabase server actions [deep]
├── Task 35: CH database tests: mock DB integration suite [deep]
├── Task 36: CH timer system: web-native timer + tests [deep]
└── Task 37: CH stores conversion: Zustand→React hooks + context [deep]

Wave 7 (After Wave 6 — CH UI + e2e, 5 tasks):
├── Task 38: CH check-in modal component + tests [visual-engineering]
├── Task 39: CH Dashboard + TagBar components + tests [visual-engineering]
├── Task 40: CH pages: dashboard + history + tags + settings [visual-engineering]
├── Task 41: CH timer integration: session flow + check-in trigger [visual-engineering]
└── Task 42: CH Playwright e2e: auth + session + check-in + history [deep]

Wave 8 (After Waves 5+7 — integration + polish, 3 tasks):
├── Task 43: Cross-tool auth verification + navigation tests [deep]
├── Task 44: Tool registry e2e + lazy-load + UI consistency [visual-engineering]
└── Task 45: Bundle optimization + build verification [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
└── Task F4: Scope Fidelity Check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → 9 → 17 → 22 → 27 → 42 → F1-F4
Parallel Speedup: ~75% faster than sequential
Max Concurrent: 8 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2-8, 9 | 1 |
| 2 | 1 | 3 | 1 |
| 3 | 2 | 18, 22, 33 | 1 |
| 4 | 1 | 5, 8 | 1 |
| 5 | 4 | 17, 27, 38 | 1 |
| 6 | 1 | 7, 9 | 1 |
| 7 | 6 | 17, 20 | 1 |
| 8 | 4 | 17, 20, 38 | 1 |
| 9 | 1, 6 | 10, 11, 14 | 2 |
| 10 | 9 | 11, 14, 23, 34 | 2 |
| 11 | 9, 10 | 14, 15 | 2 |
| 12 | 1 | 23, 24 | 2 |
| 13 | 1 | 34, 35 | 2 |
| 14 | 9, 11 | 15, 17, 29 | 2 |
| 15 | 11, 14 | 17 | 2 |
| 16 | 1, 6 | 24, 25, 31, 35, 36, 42 | 3 |
| 17 | 5, 7, 8, 14, 15 | 18, 20, 29, 40 | 3 |
| 18 | 3 | 19, 21, 32 | 3 |
| 19 | 18 | 20, 21, 32 | 3 |
| 20 | 7, 8, 17, 19 | — | 3 |
| 21 | 18, 19 | 22, 29 | 4 |
| 22 | 3, 21 | 23, 25, 27 | 4 |
| 23 | 10, 12, 22 | 24, 27, 28 | 4 |
| 24 | 12, 16, 23 | — | 4 |
| 25 | 16, 22 | 27, 28 | 4 |
| 26 | 22, 23 | 31 | 4 |
| 27 | 5, 22, 23, 25 | 29, 31 | 5 |
| 28 | 8, 23, 25 | 29, 30 | 5 |
| 29 | 14, 17, 21, 27, 28 | 31 | 5 |
| 30 | 28 | 31 | 5 |
| 31 | 16, 26, 27, 29, 30 | 43 | 5 |
| 32 | 18, 19 | 33, 40 | 6 |
| 33 | 3, 32 | 34, 36, 37 | 6 |
| 34 | 10, 13, 33 | 35, 37, 39 | 6 |
| 35 | 13, 16, 34 | — | 6 |
| 36 | 16, 33 | 37, 38, 41 | 6 |
| 37 | 33, 34, 36 | 38, 39, 41 | 6 |
| 38 | 5, 8, 36, 37 | 40, 41, 42 | 7 |
| 39 | 34, 37 | 40, 42 | 7 |
| 40 | 17, 32, 38, 39 | 42 | 7 |
| 41 | 36, 37, 38 | 42 | 7 |
| 42 | 16, 38, 39, 40, 41 | 43 | 7 |
| 43 | 31, 42 | 44 | 8 |
| 44 | 20, 43 | 45 | 8 |
| 45 | 44 | F1-F4 | 8 |

### Agent Dispatch Summary

- **Wave 1**: 8 — T1-T4 → `quick`, T5 → `visual-engineering`, T6 → `quick`, T7 → `visual-engineering`, T8 → `visual-engineering`
- **Wave 2**: 7 — T9-T13 → `quick`, T14 → `visual-engineering`, T15 → `quick`
- **Wave 3**: 5 — T16 → `quick`, T17 → `visual-engineering`, T18-T19 → `quick`, T20 → `visual-engineering`
- **Wave 4**: 6 — T21-T22 → `quick`, T23 → `deep`, T24 → `deep`, T25 → `deep`, T26 → `quick`
- **Wave 5**: 5 — T27-T30 → `visual-engineering`, T31 → `deep`
- **Wave 6**: 6 — T32-T33 → `quick`, T34-T37 → `deep`
- **Wave 7**: 5 — T38-T41 → `visual-engineering`, T42 → `deep`
- **Wave 8**: 3 — T43 → `deep`, T44 → `visual-engineering`, T45 → `quick`
- **FINAL**: 4 — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Initialize pnpm workspace + root configuration

  **What to do**:
  - Create `pnpm-workspace.yaml` defining packages in `apps/*` and `packages/*`
  - Create root `package.json` with workspace scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`
  - Create root `.gitignore` (node_modules, .next, dist, .env.local, test-results)
  - Create root `.npmrc` with `shamefully-hoist=true`
  - Run `pnpm install` to verify workspace resolves
  - Write a quick test: `bash -c "pnpm install"` — expect zero exit code

  **Must NOT do**:
  - Do not create any source code beyond config files
  - Do not initialize git (handled separately or assumed existing)
  - Do not install framework-specific deps at root (they go in app packages)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config file creation, no complex logic
  - **Skills**: [`git-master`]
    - `git-master`: For proper .gitignore generation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-8)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 8, 9, 12, 13, 16
  - **Blocked By**: None

  **References**:
  - `pnpm docs`: https://pnpm.io/workspaces — Workspace configuration syntax
  - Pattern: Standard pnpm monorepo — `packages/*` and `apps/*` structure

  **Acceptance Criteria**:
  - [ ] `pnpm-workspace.yaml` exists with `packages: ['apps/*', 'packages/*']`
  - [ ] Root `package.json` exists with workspace scripts
  - [ ] `.gitignore` covers: node_modules/, .next/, dist/, .env.local, test-results/, playwright-report/
  - [ ] `.npmrc` exists with shamefully-hoist=true
  - [ ] `pnpm install` exits 0

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Workspace initializes successfully
    Tool: Bash (pwsh)
    Steps:
      1. cd D:\documents\code\git\release\EfficiencyMemo
      2. pnpm install
    Expected Result: Exit code 0, no errors
    Failure Indicators: Non-zero exit code, "ERR_PNPM" in output
    Evidence: .omo/evidence/task-1-workspace-init.txt

  Scenario: Workspace config is valid
    Tool: Bash (pwsh)
    Steps:
      1. Read pnpm-workspace.yaml and verify it contains "packages:" with "apps/*" and "packages/*"
    Expected Result: Valid YAML with correct package paths
    Failure Indicators: Missing or malformed workspace config
    Evidence: .omo/evidence/task-1-config-check.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-workspace-init.txt — pnpm install output
  - [ ] task-1-config-check.txt — cat of pnpm-workspace.yaml

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(workspace): initialize pnpm monorepo with root configuration`
  - Files: `pnpm-workspace.yaml`, `package.json`, `.gitignore`, `.npmrc`

- [x] 2. Scaffold @memo/shared package structure

  **What to do**:
  - Create `packages/shared/` directory
  - Create `packages/shared/package.json` with name `@memo/shared`, type module, main/exports pointing to `./src/index.ts`
  - Create `packages/shared/tsconfig.json` extending base TS config
  - Create `packages/shared/src/index.ts` as barrel export (empty for now)
  - Run `pnpm install` from root to link workspace package

  **Must NOT do**:
  - Do not implement types yet (Task 3 does that)
  - Do not add runtime dependencies (shared is pure types/constants)
  - Do not create a build step (consumed as TypeScript source)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package scaffolding, boilerplate only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-8)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - Pattern from Charger-Reminder's `tsconfig.json`: path alias `@/*` → root
  - pnpm workspace docs: https://pnpm.io/workspaces — Package linking

  **Acceptance Criteria**:
  - [ ] `packages/shared/package.json` exists with name `@memo/shared`
  - [ ] `packages/shared/tsconfig.json` exists
  - [ ] `packages/shared/src/index.ts` exists
  - [ ] `pnpm install` resolves `@memo/shared` (check with `node -e "require.resolve('@memo/shared')"` from apps/web after Task 6)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Package structure created correctly
    Tool: Bash (pwsh)
    Steps:
      1. Test-Path "packages/shared/package.json" → should be True
      2. Test-Path "packages/shared/tsconfig.json" → should be True
      3. Test-Path "packages/shared/src/index.ts" → should be True
      4. Read packages/shared/package.json → name should be "@memo/shared"
    Expected Result: All files exist with correct package name
    Failure Indicators: Missing files, wrong package name
    Evidence: .omo/evidence/task-2-package-scaffold.txt
  ```

  **Evidence to Capture**:
  - [ ] task-2-package-scaffold.txt — file existence checks

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(workspace): scaffold @memo/shared package`
  - Files: `packages/shared/*`

- [x] 3. Implement @memo/shared types + constants (TDD)

  **What to do**:
  - Write failing test: `packages/shared/src/__tests__/types.test.ts` — test that ToolManifest type requires id, name, icon, description, routes, enabled fields
  - Write failing test: test that User type extends Supabase User with preferences
  - Implement `packages/shared/src/types.ts`:
    - `ToolManifest` interface: id, name, icon, description, routes (string[]), enabled (boolean)
    - `ToolRegistration` type: manifest + component lazy import
    - `User` type alias for Supabase User
    - `DashboardTool` type: ToolManifest + lastUsed, usageCount
  - Implement `packages/shared/src/constants.ts`:
    - `APP_NAME`, `APP_DESCRIPTION`, `DEFAULT_REDIRECT`
  - Update `packages/shared/src/index.ts` to re-export all
  - Run tests → GREEN

  **Must NOT do**:
  - Do not define database-specific types (those belong in feature dirs)
  - Do not add React component types to shared (belongs in @memo/ui)
  - Do not export default — use named exports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type definitions, no runtime logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-8)
  - **Blocks**: Tasks 18, 22, 33
  - **Blocked By**: Task 2

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\contracts.ts` — Type definition patterns (interfaces, const arrays)
  - `D:\documents\code\git\release\CoreHour\src\types.ts` — CoreHour type patterns (Session, Tag, CheckIn)

  **Acceptance Criteria**:
  - [ ] Test file created: `packages/shared/src/__tests__/types.test.ts`
  - [ ] `pnpm test --filter @memo/shared` → PASS (2+ tests)
  - [ ] `ToolManifest` type requires all 7 fields
  - [ ] `packages/shared/src/index.ts` re-exports all types and constants

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: ToolManifest type enforces required fields
    Tool: Bash (pwsh)
    Preconditions: Vitest installed in @memo/shared
    Steps:
      1. cd packages/shared && npx vitest run
      2. Assert: exit code 0, all tests pass
      3. Assert: test output includes "ToolManifest" type check
    Expected Result: Tests pass, type-checking verifies required fields
    Failure Indicators: Test failures, missing field validation
    Evidence: .omo/evidence/task-3-types-test.txt

  Scenario: Named exports work from barrel file
    Tool: Bash (node REPL)
    Steps:
      1. Create temp file that imports { ToolManifest, APP_NAME } from @memo/shared
      2. Run with tsx or tsc --noEmit
    Expected Result: Imports resolve without errors
    Failure Indicators: "Module not found", "has no exported member"
    Evidence: .omo/evidence/task-3-barrel-export.txt
  ```

  **Evidence to Capture**:
  - [ ] task-3-types-test.txt — vitest output
  - [ ] task-3-barrel-export.txt — import verification

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(shared): add ToolManifest, User types, and app constants with tests`
  - Files: `packages/shared/src/**`
  - Pre-commit: `pnpm test --filter @memo/shared`

- [x] 4. Scaffold @memo/ui package structure

  **What to do**:
  - Create `packages/ui/` directory
  - Create `packages/ui/package.json` with name `@memo/ui`, type module
  - Add peerDependencies: react 19, react-dom 19, tailwindcss 4
  - Add devDependencies: @types/react, @types/react-dom, vitest, @testing-library/react
  - Create `packages/ui/tsconfig.json` with jsx: react-jsx
  - Create `packages/ui/src/index.ts` as barrel export (empty for now)
  - Create `packages/ui/vitest.config.ts` with jsdom environment
  - Run `pnpm install` to link and install deps

  **Must NOT do**:
  - Do not implement components yet (Tasks 5, 8 do that)
  - Do not add runtime deps beyond React (tailwind is a peer dep)
  - Do not create a build step (Next.js compiles directly from source)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package scaffolding only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-8)
  - **Blocks**: Tasks 5, 8
  - **Blocked By**: Task 1

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\vitest.config.ts` — Vitest jsdom config pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\components\` — Component structure patterns

  **Acceptance Criteria**:
  - [ ] `packages/ui/package.json` with peerDeps: react 19, react-dom 19
  - [ ] `packages/ui/vitest.config.ts` with jsdom environment
  - [ ] `packages/ui/tsconfig.json` with jsx: react-jsx
  - [ ] `pnpm install` succeeds

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Package structure ready for components
    Tool: Bash (pwsh)
    Steps:
      1. Test-Path "packages/ui/package.json" → True
      2. Test-Path "packages/ui/vitest.config.ts" → True
      3. Read packages/ui/package.json → has peerDependencies.react
    Expected Result: All scaffold files present, correct peer deps
    Failure Indicators: Missing files, missing peer deps
    Evidence: .omo/evidence/task-4-ui-scaffold.txt
  ```

  **Evidence to Capture**:
  - [ ] task-4-ui-scaffold.txt — package.json content + file checks

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(workspace): scaffold @memo/ui package with React peer deps`
  - Files: `packages/ui/*`

- [x] 5. Implement @memo/ui Sidebar + Shell components (TDD)

  **What to do**:
  - Write failing test: Sidebar renders nav items from tool list prop
  - Write failing test: Sidebar collapses/expands on toggle click
  - Implement `packages/ui/src/sidebar.tsx`:
    - Accepts `tools: ToolManifest[]`, `activeToolId`, `onToolSelect`, `isCollapsed`, `onToggle`
    - Renders tool list with icons + names; active tool highlighted
    - Collapse button toggles width between 64px (icon-only) and 240px (full)
    - Uses Tailwind classes: `w-16` collapsed, `w-60` expanded, transition
  - Implement `packages/ui/src/shell.tsx`:
    - Wraps children with Sidebar + top header (user email, sign-out button)
    - Responsive: sidebar becomes overlay drawer on mobile (< 768px)
  - Run tests → GREEN

  **Must NOT do**:
  - Do not implement auth logic (accepts props: `userEmail`, `onSignOut`)
  - Do not hardcode tool list — accept as prop
  - Do not implement routing (navigation is callback-based)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with responsive layout, transitions, visual states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-8)
  - **Blocks**: Tasks 17, 27, 38
  - **Blocked By**: Task 4

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\layout.tsx` — Header pattern (user email, sign-out)
  - `D:\documents\code\git\release\CoreHour\src\screens\Dashboard.tsx` — Tool navigation patterns
  - Tailwind v4 transitions: `transition-all duration-200`

  **Acceptance Criteria**:
  - [ ] Test file: `packages/ui/src/__tests__/sidebar.test.tsx` — 2+ tests
  - [ ] Test file: `packages/ui/src/__tests__/shell.test.tsx` — 2+ tests
  - [ ] Sidebar renders tool list items matching `tools` prop
  - [ ] Collapse button toggles width class
  - [ ] Shell renders sidebar + children + header
  - [ ] `pnpm test --filter @memo/ui` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Sidebar renders and toggles collapse
    Tool: Playwright
    Preconditions: Storybook or test page rendering Sidebar with sample tools
    Steps:
      1. Navigate to test page
      2. Assert: Sidebar visible with tool items (use [data-testid="sidebar-tool-item"])
      3. Click collapse button ([data-testid="sidebar-toggle"])
      4. Assert: Sidebar width changes, tool names hidden (only icons visible)
      5. Click collapse button again
      6. Assert: Sidebar expands, tool names visible
    Expected Result: Smooth collapse/expand with correct width classes
    Failure Indicators: No width change, tool names still visible when collapsed
    Evidence: .omo/evidence/task-5-sidebar-toggle.png

  Scenario: Shell renders with header and children
    Tool: Playwright
    Steps:
      1. Navigate to test page with Shell wrapping "Hello World" content
      2. Assert: Header shows user email text
      3. Assert: Content area shows "Hello World"
      4. Click sign-out button ([data-testid="sign-out-button"])
      5. Assert: onSignOut callback fired
    Expected Result: Full shell layout with working sign-out
    Failure Indicators: Missing header, content not rendered, sign-out not firing
    Evidence: .omo/evidence/task-5-shell-render.png
  ```

  **Evidence to Capture**:
  - [ ] task-5-sidebar-toggle.png — collapsed + expanded states
  - [ ] task-5-shell-render.png — full shell layout

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui): add Sidebar and Shell layout components with tests`
  - Files: `packages/ui/src/sidebar.tsx`, `packages/ui/src/shell.tsx`, tests
  - Pre-commit: `pnpm test --filter @memo/ui`

- [x] 6. Scaffold apps/web Next.js app

  **What to do**:
  - Create `apps/web/` via `pnpm create next-app@latest apps/web --typescript --tailwind --eslint --src-dir --app --no-turbopack --import-alias "@/*"`
  - Add `@memo/shared` and `@memo/ui` as workspace dependencies in `apps/web/package.json`
  - Configure `apps/web/tsconfig.json` paths: `@memo/shared` → `../../packages/shared/src`, `@memo/ui` → `../../packages/ui/src`
  - Verify: import `{ APP_NAME }` from `@memo/shared` in `apps/web/src/app/layout.tsx`
  - Run `pnpm install && pnpm dev` → verify app starts on localhost:3000

  **Must NOT do**:
  - Do not create custom pages beyond the default Next.js scaffold
  - Do not configure auth or database yet (later waves)
  - Do not modify the boilerplate beyond adding shared imports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI scaffolding + dependency linking

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7-8)
  - **Blocks**: Tasks 7, 9, 16
  - **Blocked By**: Task 1

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\next.config.ts` — Next.js 16 config pattern
  - `D:\documents\code\git\release\Charger-Reminder\tsconfig.json` — path alias pattern (`@/*`)
  - Next.js 16 docs: https://nextjs.org/docs/app — App Router patterns

  **Acceptance Criteria**:
  - [ ] `apps/web/package.json` exists with Next.js 16 + React 19 deps
  - [ ] `@memo/shared` and `@memo/ui` in dependencies
  - [ ] `pnpm dev` starts on localhost:3000
  - [ ] Import `{ APP_NAME }` from `@memo/shared` compiles

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Next.js dev server starts and resolves workspace packages
    Tool: Bash (pwsh)
    Steps:
      1. cd apps/web && npx next dev --port 3000
      2. Wait 10s for server start
      3. curl http://localhost:3000 → expect 200
    Expected Result: HTTP 200, Next.js welcome page or "EfficiencyMemo" text
    Failure Indicators: 500 error, "Module not found: @memo/shared"
    Evidence: .omo/evidence/task-6-dev-server.txt

  Scenario: Workspace package import compiles
    Tool: Bash (pwsh)
    Steps:
      1. cd apps/web && npx tsc --noEmit
    Expected Result: Exit code 0, no type errors
    Failure Indicators: "Cannot find module @memo/shared"
    Evidence: .omo/evidence/task-6-typecheck.txt
  ```

  **Evidence to Capture**:
  - [ ] task-6-dev-server.txt — curl response
  - [ ] task-6-typecheck.txt — tsc output

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(web): scaffold Next.js 16 app with workspace package links`
  - Files: `apps/web/*`

- [x] 7. Tailwind v4 config + design tokens + globals.css

  **What to do**:
  - Configure `apps/web/postcss.config.mjs` with `@tailwindcss/postcss` plugin (Tailwind v4 pattern)
  - Create CSS custom properties for design tokens in `apps/web/src/app/globals.css`:
    - Colors: `--color-sidebar`, `--color-sidebar-hover`, `--color-active`, `--color-card`
    - Typography: font family (Manrope for body, Cormorant Garamond for display)
    - Spacing: sidebar widths (64px collapsed, 240px expanded)
    - Import Google Fonts via next/font in root layout
  - Add Tailwind utility classes using the `@theme` directive for custom tokens
  - Verify: `pnpm dev` shows styled page with custom font

  **Must NOT do**:
  - Do not use Tailwind v3 config file pattern (v4 uses CSS-based config)
  - Do not add component-specific styles (those belong in component files)
  - Do not remove default Tailwind reset — extend, don't replace

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Design tokens, CSS architecture, visual consistency foundation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6, 8)
  - **Blocks**: Tasks 17, 20
  - **Blocked By**: Task 6

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\globals.css` — Tailwind v4 + CSS vars pattern
  - `D:\documents\code\git\release\Charger-Reminder\app\layout.tsx` — next/font import pattern
  - Tailwind v4 docs: https://tailwindcss.com/docs/theme — @theme directive

  **Acceptance Criteria**:
  - [ ] `postcss.config.mjs` with `@tailwindcss/postcss` plugin
  - [ ] `globals.css` with `@import "tailwindcss"` and `@theme` block
  - [ ] Custom CSS properties defined for colors, typography, spacing
  - [ ] Google Fonts loaded via next/font
  - [ ] `pnpm dev` renders with correct font and colors

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Tailwind v4 compiles with custom tokens
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000
      2. Screenshot the page
      3. Assert: Manrope font is used for body text (check computed font-family)
      4. Assert: Custom CSS variable --color-sidebar is defined (check in devtools)
    Expected Result: Page renders with correct fonts, custom properties are applied
    Failure Indicators: Default system font, missing custom properties
    Evidence: .omo/evidence/task-7-design-tokens.png
  ```

  **Evidence to Capture**:
  - [ ] task-7-design-tokens.png — screenshot of styled page

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(web): configure Tailwind v4 with design tokens and Google Fonts`
  - Files: `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`

- [x] 8. Implement @memo/ui Card + Modal + Button (TDD)

  **What to do**:
  - Write failing tests for Card, Modal, Button components
  - Implement `packages/ui/src/card.tsx`:
    - Accepts `title`, `description`, `icon`, `onClick`, `href`, `data-testid`
    - Renders as clickable card with hover effect (scale + shadow transition)
  - Implement `packages/ui/src/modal.tsx`:
    - Accepts `isOpen`, `onClose`, `title`, `children`
    - Renders overlay + centered dialog, ESC closes, click-outside closes
    - animate in/out with opacity + scale transition
  - Implement `packages/ui/src/button.tsx`:
    - Variants: primary, secondary, ghost, danger
    - Sizes: sm, md, lg
    - Loading state with spinner
  - Update `packages/ui/src/index.ts` barrel
  - Run tests → GREEN

  **Must NOT do**:
  - Do not use third-party UI libraries (Radix, Headless UI) — pure Tailwind
  - Do not add form-specific components (inputs, selects)
  - Do not add page-level components (they belong in feature dirs)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI primitives, multiple variants, animations, interaction states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-7)
  - **Blocks**: Tasks 17, 20, 38
  - **Blocked By**: Task 4

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-list.tsx` — Card pattern (DeviceCard)
  - `D:\documents\code\git\release\CoreHour\src\components\CheckInPopup.tsx` — Modal/overlay pattern
  - Tailwind v4 transitions: `transition-all duration-200 hover:scale-105`

  **Acceptance Criteria**:
  - [ ] Test file: `packages/ui/src/__tests__/card.test.tsx` — renders title, description, fires onClick
  - [ ] Test file: `packages/ui/src/__tests__/modal.test.tsx` — opens/closes, ESC dismisses
  - [ ] Test file: `packages/ui/src/__tests__/button.test.tsx` — all 4 variants render, loading spinner
  - [ ] `pnpm test --filter @memo/ui` → PASS (6+ tests)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Card renders with all props and fires click
    Tool: Playwright
    Steps:
      1. Render Card with title="Battery Tracker", description="Track devices" in test page
      2. Assert: text content includes "Battery Tracker" and "Track devices"
      3. Click the card
      4. Assert: onClick callback was called
    Expected Result: Card displays correctly and is interactive
    Failure Indicators: Missing text, click not registered
    Evidence: .omo/evidence/task-8-card-click.png

  Scenario: Modal opens, closes via ESC, and traps focus
    Tool: Playwright
    Steps:
      1. Render Modal with isOpen=true, title="Check In", children="Content"
      2. Assert: overlay visible, "Check In" title visible, "Content" visible
      3. Press Escape key
      4. Assert: onClose callback was called
    Expected Result: Modal displays, ESC dismisses, content rendered
    Failure Indicators: Modal not visible, ESC not working
    Evidence: .omo/evidence/task-8-modal-esc.png

  Scenario: Button renders loading state
    Tool: Playwright
    Steps:
      1. Render Button with isLoading=true, children="Submit"
      2. Assert: button text is NOT "Submit" (spinner visible instead)
      3. Assert: button has disabled attribute
      4. Click button → no callback fired
    Expected Result: Loading spinner, disabled, no click
    Failure Indicators: Text still visible, button clickable when loading
    Evidence: .omo/evidence/task-8-button-loading.png
  ```

  **Evidence to Capture**:
  - [ ] task-8-card-click.png — card rendered + click state
  - [ ] task-8-modal-esc.png — modal open state
  - [ ] task-8-button-loading.png — loading button state

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui): add Card, Modal, and Button components with tests`
  - Files: `packages/ui/src/card.tsx`, `packages/ui/src/modal.tsx`, `packages/ui/src/button.tsx`, tests
  - Pre-commit: `pnpm test --filter @memo/ui`

- [x] 9. Environment config + env validation

  **What to do**:
  - Create `apps/web/.env.example` with:
    - `NEXT_PUBLIC_SUPABASE_URL=`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
  - Create `apps/web/src/lib/env.ts`:
    - `getEnv()` function validates all required vars at startup
    - Throws descriptive error if any var missing
    - Export typed env object (no `as string` casts)
  - Write test: `apps/web/src/lib/__tests__/env.test.ts` — verifies error on missing vars
  - Configure Vercel: create `vercel.json` with build command, install command, output directory
  - Run `pnpm dev` with `.env.local` populated → verify app starts

  **Must NOT do**:
  - Do not commit `.env.local` (in .gitignore)
  - Do not use `process.env` directly in app code (use `getEnv()` wrapper)
  - Do not add deployment secrets inline (use Vercel dashboard or CLI)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config files + env validation utility

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 10-15)
  - **Blocks**: Tasks 10, 11, 14
  - **Blocked By**: Tasks 1, 6

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\.env.example` — CR's env template
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\env.ts` — Env validation pattern

  **Acceptance Criteria**:
  - [ ] `.env.example` lists 2 required vars
  - [ ] `getEnv()` returns typed object with `supabaseUrl` and `supabaseAnonKey`
  - [ ] Missing env var throws clear error message
  - [ ] `vercel.json` with correct build settings
  - [ ] Test: `pnpm test --filter apps/web` → env test passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Env validation catches missing variables
    Tool: Bash (pwsh)
    Steps:
      1. Run env test with NEXT_PUBLIC_SUPABASE_URL unset
      2. Assert: test expects thrown error with message containing "NEXT_PUBLIC_SUPABASE_URL"
    Expected Result: Clear error message, test passes
    Failure Indicators: Test fails, no error thrown, generic error
    Evidence: .omo/evidence/task-9-env-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-9-env-test.txt — vitest output for env tests

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(web): add environment config, validation, and Vercel setup`
  - Files: `apps/web/.env.example`, `apps/web/src/lib/env.ts`, `vercel.json`
  - Pre-commit: `pnpm test --filter apps/web`

- [x] 10. Supabase SSR browser client

  **What to do**:
  - Create `apps/web/src/lib/supabase/client.ts`:
    - `createBrowserClient()` using `@supabase/ssr` createBrowserClient
    - Singleton pattern (avoid multiple instances in dev with HMR)
    - Configure cookie handling for SSR
    - Export typed client
  - Write test: `apps/web/src/lib/supabase/__tests__/client.test.ts` — verifies singleton, correct URL

  **Must NOT do**:
  - Do not add auth logic (sign-in, sign-out) — those are in Tasks 14-15
  - Do not hardcode Supabase credentials (use `getEnv()`)
  - Do not use deprecated `@supabase/supabase-js` directly for SSR (use `@supabase/ssr`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Singleton factory with cookie handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9, 11-15)
  - **Blocks**: Tasks 11, 14, 23, 34
  - **Blocked By**: Task 9

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\client.ts` — Browser client singleton pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\env.ts` — Env getter pattern
  - Supabase SSR docs: https://supabase.com/docs/guides/auth/server-side/nextjs

  **Acceptance Criteria**:
  - [ ] `createBrowserClient()` returns Supabase client
  - [ ] Multiple calls return same instance (singleton)
  - [ ] Test verifies client uses correct URL from env

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Browser client is singleton
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: import createBrowserClient twice, assert instance equality
      2. Assert: client1 === client2
    Expected Result: Same instance returned on multiple calls
    Failure Indicators: Different instances, memory leak
    Evidence: .omo/evidence/task-10-client-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-10-client-test.txt — vitest output

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(auth): add Supabase SSR browser client singleton`
  - Files: `apps/web/src/lib/supabase/client.ts`, tests
  - Pre-commit: `pnpm test --filter apps/web`

- [x] 11. Supabase SSR server + proxy clients

  **What to do**:
  - Create `apps/web/src/lib/supabase/server.ts`:
    - `createSupabaseServerClient()` using `@supabase/ssr` `createServerClient`
    - Accepts `cookieStore` from `next/headers`
    - Handles `getAll` + `setAll` cookie methods
  - Create `apps/web/src/lib/supabase/proxy.ts`:
    - `createSupabaseProxyClient()` for middleware/route handlers
    - Uses request/response cookie management
  - Write tests for each client using mock cookie stores
  - Verify: server client can retrieve session from cookies

  **Must NOT do**:
  - Do not use the browser client on server or vice versa
  - Do not import `next/headers` in browser client file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cookie-aware Supabase client factories

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-10, 12-15)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\server.ts` — Server client pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\proxy.ts` — Proxy client pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\auth\session.ts` — getSessionUser pattern

  **Acceptance Criteria**:
  - [ ] `createSupabaseServerClient()` works with Next.js cookieStore
  - [ ] `createSupabaseProxyClient()` works with request/response pattern
  - [ ] Tests pass for both clients

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Server client reads cookies correctly
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: create mock cookie store, create server client
      2. Assert: client.auth.getSession() resolves (even if null session)
    Expected Result: No crash, client functional
    Failure Indicators: "cookies is not a function", import errors
    Evidence: .omo/evidence/task-11-server-client-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-11-server-client-test.txt — vitest output

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(auth): add Supabase SSR server and proxy clients`
  - Files: `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/proxy.ts`, tests
  - Pre-commit: `pnpm test --filter apps/web`

- [x] 12. Supabase migration: CR schema (cr_ namespaced, 6 tables)

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\supabase\migrations\20260409173000_create_device_reminder_schema.sql` → `supabase/migrations/001_cr_device_reminder.sql`
  - Modify: prefix all table names with `cr_` (devices → cr_devices, device_presets → cr_device_presets, charge_events → cr_charge_events, reminder_preferences → cr_reminder_preferences, computed_reminder_states → cr_computed_reminder_states)
  - Remove the app-level `users` table (use Supabase `auth.users` instead)
  - Update foreign keys: `user_id` → reference `auth.users(id)`
  - Copy and modify `20260409173100_seed_device_presets.sql` → `supabase/migrations/002_cr_seed_presets.sql` with `cr_` prefixes
  - Write migration test: apply → verify tables exist → rollback → verify tables gone
  - Ensure each migration has `-- UP` and `-- DOWN` sections in comments

  **Must NOT do**:
  - Do not keep the original `users` table (use auth.users)
  - Do not change table column types or constraints beyond prefix + FK
  - Do not merge CR and CH migrations into one file (keep separate for reversibility)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL rename + FK modification, well-defined scope

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-11, 13-15)
  - **Blocks**: Tasks 23, 24
  - **Blocked By**: Task 1

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\supabase\migrations\20260409173000_create_device_reminder_schema.sql` — Source schema
  - `D:\documents\code\git\release\Charger-Reminder\supabase\migrations\20260409173100_seed_device_presets.sql` — Seed data
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\contracts.ts` — Schema relationships for context

  **Acceptance Criteria**:
  - [ ] `supabase/migrations/001_cr_device_reminder.sql` with `cr_` prefixed tables
  - [ ] `supabase/migrations/002_cr_seed_presets.sql` with `cr_` prefixes
  - [ ] No `users` table — all user references point to `auth.users(id)`
  - [ ] Migration test verifies UP creates tables, DOWN drops them

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: CR migration applies and rolls back cleanly
    Tool: Bash (pwsh)
    Steps:
      1. Connect to Supabase test project
      2. Apply 001_cr_device_reminder.sql
      3. Query: SELECT tablename FROM pg_tables WHERE tablename LIKE 'cr_%'
      4. Assert: 5 tables returned (cr_devices, cr_device_presets, cr_charge_events, cr_reminder_preferences, cr_computed_reminder_states)
      5. Apply seed migration 002
      6. Query: SELECT COUNT(*) FROM cr_device_presets → 5
    Expected Result: Tables created, presets seeded
    Failure Indicators: Missing tables, FK errors, prefix mismatch
    Evidence: .omo/evidence/task-12-cr-migration.txt
  ```

  **Evidence to Capture**:
  - [ ] task-12-cr-migration.txt — table listing + seed count

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(db): add Charger-Reminder schema migrations (cr_ namespaced)`
  - Files: `supabase/migrations/001_cr_device_reminder.sql`, `supabase/migrations/002_cr_seed_presets.sql`
  - Pre-commit: Verify migration syntax with `supabase migration up --local`

- [x] 13. Supabase migration: CH schema (ch_ namespaced, 5 tables)

  **What to do**:
  - Create `supabase/migrations/003_ch_core_hour.sql` from CoreHour's SQLite schema (`D:\documents\code\git\release\CoreHour\src-tauri\migrations\001_initial.sql`)
  - Convert SQLite syntax → PostgreSQL:
    - `INTEGER PRIMARY KEY AUTOINCREMENT` → `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
    - `TEXT` → `text` (same)
    - `INTEGER DEFAULT 0` (synced flag) → `boolean DEFAULT false`
    - `DATETIME` → `timestamptz`
  - Prefix all tables: tags → ch_tags, sessions → ch_sessions, check_ins → ch_check_ins, check_in_entries → ch_check_in_entries, settings → ch_settings
  - Reference `auth.users(id)` for user_id FKs instead of app users table
  - Add appropriate indexes (user_id, session_id, synced)
  - Write migration test: UP → tables exist → DOWN → tables gone
  - Add `-- UP` and `-- DOWN` comment sections

  **Must NOT do**:
  - Do not keep the `synced` flag pattern if not needed (web-only → direct Supabase → no sync needed; keep for future but document)
  - Do not use SQLite-specific syntax in PostgreSQL migration
  - Do not combine with CR migration files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL translation between dialects, well-defined scope

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-12, 14-15)
  - **Blocks**: Tasks 34, 35
  - **Blocked By**: Task 1

  **References**:
  - `D:\documents\code\git\release\CoreHour\src-tauri\migrations\001_initial.sql` — CH SQLite source schema
  - `D:\documents\code\git\release\Charger-Reminder\supabase\migrations\20260409173000_create_device_reminder_schema.sql` — PostgreSQL schema style reference

  **Acceptance Criteria**:
  - [ ] `supabase/migrations/003_ch_core_hour.sql` with PostgreSQL syntax
  - [ ] 5 tables: ch_tags, ch_sessions, ch_check_ins, ch_check_in_entries, ch_settings
  - [ ] All user_id columns reference `auth.users(id)`
  - [ ] Migration test: UP creates, DOWN drops

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: CH migration applies successfully
    Tool: Bash (pwsh)
    Steps:
      1. Apply 003_ch_core_hour.sql to Supabase test
      2. Query: SELECT tablename FROM pg_tables WHERE tablename LIKE 'ch_%'
      3. Assert: 5 tables returned
      4. Test FK: attempt insert with invalid user_id → expect constraint error
    Expected Result: 5 tables, FK constraints enforced
    Failure Indicators: SQL syntax error, missing tables, no FK
    Evidence: .omo/evidence/task-13-ch-migration.txt
  ```

  **Evidence to Capture**:
  - [ ] task-13-ch-migration.txt — table listing + FK test

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(db): add CoreHour schema migration (ch_ namespaced, SQLite→PostgreSQL)`
  - Files: `supabase/migrations/003_ch_core_hour.sql`
  - Pre-commit: Verify syntax

- [x] 14. Auth: sign-in page + magic-link form

  **What to do**:
  - Create `apps/web/src/app/(auth)/layout.tsx` — minimal centered layout
  - Create `apps/web/src/app/(auth)/sign-in/page.tsx` — server component
  - Create `apps/web/src/components/auth/sign-in-form.tsx` — "use client" component:
    - Email input with validation (regex)
    - Submit button → calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ... } })`
    - Success state: "Check your email for a magic link"
    - Error state: inline error message
    - Loading state: button spinner
  - Write test: renders form, validates email, shows success/error states

  **Must NOT do**:
  - Do not add password or social auth options
  - Do not add mock auth bypass (Task 26 handles that for testing)
  - Do not redirect after sign-in here (callback route handles that)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UI with multiple states (idle, loading, success, error)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-13, 15)
  - **Blocks**: Tasks 15, 17, 29
  - **Blocked By**: Tasks 9, 11

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\components\auth\sign-in-form.tsx` — Magic-link form pattern
  - `D:\documents\code\git\release\Charger-Reminder\app\sign-in\page.tsx` — Sign-in page pattern
  - `D:\documents\code\git\release\Charger-Reminder\app\auth\callback\route.ts` — Callback URL pattern

  **Acceptance Criteria**:
  - [ ] Sign-in form renders email input + submit button
  - [ ] Invalid email shows validation error
  - [ ] Submit sends magic link (verify: Supabase auth logs)
  - [ ] Success state shows "Check your email" message
  - [ ] Loading state shows spinner, button disabled
  - [ ] Test: `pnpm test` passes auth form tests

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Magic-link sign-in happy path
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/sign-in
      2. Type "test@example.com" into [data-testid="email-input"]
      3. Click [data-testid="sign-in-submit"]
      4. Assert: button shows loading spinner
      5. Wait for success message: "Check your email" text visible
    Expected Result: Form submits, success message shown
    Failure Indicators: No loading state, error instead of success, form not submitting
    Evidence: .omo/evidence/task-14-signin-success.png

  Scenario: Invalid email shows error
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000/sign-in
      2. Type "not-an-email" into [data-testid="email-input"]
      3. Click [data-testid="sign-in-submit"]
      4. Assert: error message visible with "valid email" text
    Expected Result: Validation error shown, form not submitted
    Failure Indicators: Form submitted with invalid email, no error
    Evidence: .omo/evidence/task-14-signin-error.png
  ```

  **Evidence to Capture**:
  - [ ] task-14-signin-success.png — success state
  - [ ] task-14-signin-error.png — error state

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(auth): add magic-link sign-in page with form validation`
  - Files: `apps/web/app/(auth)/**`, `apps/web/src/components/auth/sign-in-form.tsx`
  - Pre-commit: `pnpm test`

- [x] 15. Auth: callback route + session guard + sign-out

  **What to do**:
  - Create `apps/web/src/app/auth/callback/route.ts`:
    - GET handler: exchange `code` param for session via `supabase.auth.exchangeCodeForSession(code)`
    - Redirect to `/dashboard` on success
    - Redirect to `/sign-in?error=auth` on failure
  - Create `apps/web/src/lib/auth/session.ts`:
    - `getSessionUser()` — server-only, reads session from cookies
    - `requireSessionUser()` — wraps getSessionUser, redirects to /sign-in if unauthenticated
    - `signOutAction()` — "use server" action calls supabase.auth.signOut(), redirects to /sign-in
  - Create `apps/web/src/components/auth/sign-out-form.tsx` — client component calling signOutAction
  - Write tests: getSessionUser returns null without cookies, requireSessionUser redirects

  **Must NOT do**:
  - Do not add mock auth to the shared session (Task 26 adds that for testing)
  - Do not use `"use client"` in session.ts (it's server-only)
  - Do not export cookie manipulation helpers (internal to supabase clients)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Route handler + server utilities, well-defined

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-14)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 11, 14

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\auth\callback\route.ts` — Callback route pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\auth\session.ts` — Session guard pattern
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\auth\actions.ts` — signOut server action
  - `D:\documents\code\git\release\Charger-Reminder\src\components\auth\sign-out-form.tsx` — Sign-out component

  **Acceptance Criteria**:
  - [ ] Callback route exchanges code → sets session cookie → redirects to /dashboard
  - [ ] `requireSessionUser()` redirects unauthenticated to /sign-in
  - [ ] `getSessionUser()` returns user object when authenticated
  - [ ] Sign-out clears session + redirects to /sign-in
  - [ ] Tests: session tests pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Callback route handles valid code
    Tool: Playwright
    Steps:
      1. Simulate magic link click: navigate to /auth/callback?code=VALID_TEST_CODE
      2. Assert: redirected to /dashboard (200)
    Expected Result: Session established, redirect to dashboard
    Failure Indicators: 500 error, redirect to sign-in with error
    Evidence: .omo/evidence/task-15-callback-success.txt

  Scenario: Unauthenticated user redirected from protected route
    Tool: Bash (curl)
    Steps:
      1. curl -I http://localhost:3000/dashboard (no cookies)
      2. Assert: HTTP 307 redirect to /sign-in
    Expected Result: Redirect to sign-in
    Failure Indicators: 200 (page served without auth), 500 error
    Evidence: .omo/evidence/task-15-auth-redirect.txt
  ```

  **Evidence to Capture**:
  - [ ] task-15-callback-success.txt — callback redirect
  - [ ] task-15-auth-redirect.txt — curl output showing redirect

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(auth): add callback route, session guard, and sign-out flow`
  - Files: `apps/web/app/auth/callback/route.ts`, `apps/web/src/lib/auth/session.ts`, `apps/web/src/lib/auth/actions.ts`, `apps/web/src/components/auth/sign-out-form.tsx`
  - Pre-commit: `pnpm test`

- [x] 16. Test infrastructure: Vitest + Playwright config + smoke tests

  **What to do**:
  - Configure `apps/web/vitest.config.ts`:
    - jsdom environment, `@/*` path alias, `@vitejs/plugin-react`
    - Exclude `e2e/`, `node_modules/`
    - Global setup file for test utilities
  - Configure `apps/web/playwright.config.ts`:
    - Chromium only, `testDir: './e2e'`, `forbidOnly: !!process.env.CI`
    - webServer: auto-start `pnpm dev` with mock env vars
    - Mock env: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key`
  - Create `apps/web/e2e/` directory with `smoke.spec.ts`:
    - Test: homepage loads (200)
    - Test: sign-in page loads
  - Write root-level test scripts in `package.json`: `test:vitest`, `test:e2e`
  - Run both to verify infrastructure works

  **Must NOT do**:
  - Do not test actual Supabase auth in smoke tests (use mock env)
  - Do not add tool-specific tests yet (those come in Waves 4-7)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config files + simple smoke tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 17-20)
  - **Blocks**: Tasks 24, 25, 31, 35, 36, 42
  - **Blocked By**: Tasks 1, 6

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\vitest.config.ts` — Vitest config
  - `D:\documents\code\git\release\Charger-Reminder\playwright.config.ts` — Playwright config with mock env
  - `D:\documents\code\git\release\Charger-Reminder\e2e\smoke.spec.ts` — Smoke test pattern

  **Acceptance Criteria**:
  - [ ] `pnpm test:vitest` runs and passes smoke test
  - [ ] `pnpm test:e2e` runs Playwright — smoke test passes (homepage loads)
  - [ ] Both configs exclude appropriate paths

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Vitest infrastructure works
    Tool: Bash (pwsh)
    Steps:
      1. pnpm test:vitest -- --run
    Expected Result: Exit 0, at least 1 test passes
    Failure Indicators: Config error, no tests found, test timeout
    Evidence: .omo/evidence/task-16-vitest-smoke.txt

  Scenario: Playwright infrastructure works
    Tool: Playwright
    Steps:
      1. pnpm test:e2e -- --project=chromium smoke.spec.ts
    Expected Result: Exit 0, smoke test passes, homepage returns 200
    Failure Indicators: Web server not starting, test timeout
    Evidence: .omo/evidence/task-16-playwright-smoke.txt
  ```

  **Evidence to Capture**:
  - [ ] task-16-vitest-smoke.txt — vitest output
  - [ ] task-16-playwright-smoke.txt — playwright output

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(test): configure Vitest and Playwright with smoke tests`
  - Files: `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/smoke.spec.ts`
  - Pre-commit: `pnpm test:vitest && pnpm test:e2e`

- [x] 17. Shell layout: sidebar + header + auth gate (TDD)

  **What to do**:
  - Write failing test: Shell layout renders Sidebar with tools, header with user email, protected content
  - Create `apps/web/src/app/(shell)/layout.tsx`:
    - Calls `requireSessionUser()` — redirects unauthenticated users
    - Renders `Shell` component from `@memo/ui` wrapping `{children}`
    - Passes: `userEmail`, `tools` (from registry), `activeToolId` (from pathname)
  - Create `apps/web/src/lib/shell/tool-navigation.ts`:
    - `getToolList()` — reads all registered tool manifests
    - `getActiveTool(pathname)` — matches current route to a tool
  - Wire sign-out: clicking sign-out calls `signOutAction()`
  - Responsive: hamburger menu on mobile toggles sidebar overlay
  - Run tests → GREEN

  **Must NOT do**:
  - Do not hardcode tool list (use registry from Task 19)
  - Do not implement the sidebar component (already in @memo/ui)
  - Do not style individual tool pages (that's tool-specific)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout composition, responsive behavior, auth integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16, 18-20)
  - **Blocks**: Tasks 18, 20, 29, 40
  - **Blocked By**: Tasks 5, 7, 8, 14, 15

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\layout.tsx` — Auth-gated layout pattern
  - `@memo/ui` Sidebar and Shell components (Task 5)
  - `apps/web/src/lib/auth/session.ts` — requireSessionUser (Task 15)

  **Acceptance Criteria**:
  - [ ] Test: unauthenticated user redirected to /sign-in
  - [ ] Test: authenticated user sees sidebar + header + content
  - [ ] Sidebar shows tool icons from registry
  - [ ] Sign-out clears session and redirects
  - [ ] Mobile: hamburger toggles sidebar overlay

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Authenticated user sees full shell
    Tool: Playwright
    Preconditions: Mock auth cookie set
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Assert: Sidebar visible ([data-testid="sidebar"])
      3. Assert: Header shows user email
      4. Assert: Content area renders children
    Expected Result: Full shell layout with sidebar, header, content
    Failure Indicators: Redirected to sign-in, missing sidebar, missing header
    Evidence: .omo/evidence/task-17-shell-authenticated.png

  Scenario: Mobile hamburger menu works
    Tool: Playwright
    Preconditions: Viewport 375x667 (iPhone SE)
    Steps:
      1. Navigate to /dashboard
      2. Assert: Sidebar hidden (overlay)
      3. Click hamburger button ([data-testid="hamburger-menu"])
      4. Assert: Sidebar overlay visible
      5. Click overlay backdrop → sidebar closes
    Expected Result: Sidebar toggles as overlay on mobile
    Failure Indicators: Sidebar always visible, hamburger not clickable
    Evidence: .omo/evidence/task-17-mobile-menu.png
  ```

  **Evidence to Capture**:
  - [ ] task-17-shell-authenticated.png — authenticated shell
  - [ ] task-17-mobile-menu.png — mobile hamburger state

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(shell): add auth-gated shell layout with sidebar and responsive nav`
  - Files: `apps/web/app/(shell)/layout.tsx`, `apps/web/src/lib/shell/tool-navigation.ts`
  - Pre-commit: `pnpm test`

- [x] 18. Tool registry: manifest types + registration function (TDD)

  **What to do**:
  - Write failing test: registerTool() adds manifest to registry; getRegisteredTools() returns all
  - Create `apps/web/src/lib/tool-registry/registry.ts`:
    - `registerTool(manifest: ToolManifest, componentLoader: () => Promise<ComponentType>)` — adds to Map
    - `getRegisteredTools(): RegisteredTool[]` — returns all registered tools
    - `getToolById(id: string): RegisteredTool | undefined` — lookup by ID
    - Type: `RegisteredTool = ToolManifest & { componentLoader }`
  - Create `apps/web/src/lib/tool-registry/types.ts` (extends shared types if needed)
  - Run tests → GREEN

  **Must NOT do**:
  - Do not implement route generation or lazy loading (Task 19)
  - Do not register actual tools yet (Waves 4, 6)
  - Do not export the registry Map directly (use accessor functions)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Map-based registry with typed accessors

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16, 17, 19-20)
  - **Blocks**: Tasks 19, 21, 32
  - **Blocked By**: Task 3

  **References**:
  - `@memo/shared/src/types.ts` — ToolManifest interface (Task 3)
  - Plugin registry pattern: Map<string, RegisteredTool>

  **Acceptance Criteria**:
  - [ ] `registerTool()` stores manifest + loader in registry
  - [ ] `getRegisteredTools()` returns all registered tools
  - [ ] `getToolById()` finds tool or returns undefined
  - [ ] Tests: 3+ tests covering register, get, getById

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Register and retrieve tools
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: register 2 mock tools
      2. Assert: getRegisteredTools() returns 2 items
      3. Assert: getToolById('tool-1') returns correct manifest
      4. Assert: getToolById('nonexistent') returns undefined
    Expected Result: Registry correctly manages tool entries
    Failure Indicators: Wrong count, null instead of undefined, duplicate registration
    Evidence: .omo/evidence/task-18-registry-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-18-registry-test.txt — vitest output

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tool-registry): add manifest types and registration function with tests`
  - Files: `apps/web/src/lib/tool-registry/registry.ts`, `apps/web/src/lib/tool-registry/types.ts`, tests
  - Pre-commit: `pnpm test`

- [x] 19. Tool registry: discovery + route generation + lazy loading (TDD)

  **What to do**:
  - Create `apps/web/src/lib/tool-registry/discovery.ts`:
    - `discoverTools()` — scans `src/features/*/manifest.ts` and auto-registers
    - Uses dynamic `import()` for lazy component loading
  - Create `apps/web/src/lib/tool-registry/routes.ts`:
    - `generateToolRoutes()` — returns Next.js route config from registered tools
    - Maps tool manifest routes to filesystem paths
  - Create `apps/web/src/app/(shell)/tools/[toolId]/page.tsx` as catch-all:
    - Uses `getToolById(toolId)` to find tool
    - Lazy-loads tool component via `componentLoader()`
    - Shows 404 if tool not found
  - Write tests: discovery finds manifests, routes generated correctly
  - Run tests → GREEN

  **Must NOT do**:
  - Do not manually register each tool (discovery does it automatically)
  - Do not hardcode tool paths
  - Do not eagerly load all tools (use dynamic imports)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File scanning, dynamic imports, route config generation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-18, 20)
  - **Blocks**: Tasks 20, 21, 32
  - **Blocked By**: Task 18

  **References**:
  - Next.js dynamic imports: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
  - Next.js catch-all routes: `[toolId]` dynamic segment pattern

  **Acceptance Criteria**:
  - [ ] `discoverTools()` scans features directory and registers manifests
  - [ ] `generateToolRoutes()` produces correct Next.js route config
  - [ ] Catch-all route lazy-loads tool component on navigation
  - [ ] Unknown toolId shows 404
  - [ ] Tests: discovery + route generation

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Tool discovery finds manifests
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: call discoverTools() with mock manifests in features/
      2. Assert: returns array of RegisteredTool matching mock manifests
    Expected Result: All manifests discovered and registered
    Failure Indicators: Missing manifest, wrong count, import errors
    Evidence: .omo/evidence/task-19-discovery-test.txt

  Scenario: Unknown tool shows 404
    Tool: Playwright
    Preconditions: Mock auth, registry has some tools
    Steps:
      1. Navigate to /tools/nonexistent-tool
      2. Assert: page shows "Tool not found" or 404
    Expected Result: Graceful 404 for unknown tools
    Failure Indicators: 500 error, blank page, redirect
    Evidence: .omo/evidence/task-19-404.png
  ```

  **Evidence to Capture**:
  - [ ] task-19-discovery-test.txt — vitest output
  - [ ] task-19-404.png — 404 page screenshot

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tool-registry): add auto-discovery, route generation, and lazy loading`
  - Files: `apps/web/src/lib/tool-registry/discovery.ts`, `apps/web/src/lib/tool-registry/routes.ts`, `apps/web/src/app/(shell)/tools/[toolId]/page.tsx`
  - Pre-commit: `pnpm test`

- [x] 20. Dashboard page: tool gallery with cards + empty state

  **What to do**:
  - Create `apps/web/src/app/(shell)/dashboard/page.tsx`:
    - Server component: calls `getRegisteredTools()` to list all tools
    - Renders grid of `Card` components (from `@memo/ui`) — one per tool
    - Each card shows: tool icon, name, description, "Open" button
    - Click navigates to `/tools/{toolId}`
  - Add empty state: "No tools available yet" when registry is empty
  - Add metadata: page title "EfficiencyMemo — Dashboard"
  - Write test: dashboard renders tool cards for registered tools
  - Run tests → GREEN

  **Must NOT do**:
  - Do not hardcode tool data (reads from registry)
  - Do not add tool-specific styling (generic card layout)
  - Do not implement tool-specific logic (linking only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard grid layout, card composition, empty state

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-19)
  - **Blocks**: Task 44
  - **Blocked By**: Tasks 7, 8, 17, 19

  **References**:
  - `@memo/ui` Card component (Task 8)
  - `@memo/shared` DashboardTool type (Task 3)
  - `apps/web/src/lib/tool-registry/registry.ts` (Task 18)

  **Acceptance Criteria**:
  - [ ] Dashboard shows grid of Card components for each registered tool
  - [ ] Empty registry shows "No tools available yet" message
  - [ ] Card click navigates to `/tools/{toolId}`
  - [ ] Page has correct metadata title
  - [ ] Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Dashboard shows registered tools
    Tool: Playwright
    Preconditions: 2 mock tools registered in registry
    Steps:
      1. Navigate to http://localhost:3000/dashboard
      2. Assert: 2 cards visible with correct tool names
      3. Click first card "Open" button
      4. Assert: navigated to /tools/{first-tool-id}
    Expected Result: Cards render, navigation works
    Failure Indicators: No cards, wrong count, navigation broken
    Evidence: .omo/evidence/task-20-dashboard-cards.png

  Scenario: Empty state when no tools registered
    Tool: Playwright
    Preconditions: Empty registry
    Steps:
      1. Navigate to /dashboard
      2. Assert: "No tools available yet" text visible
    Expected Result: Empty state message shown
    Failure Indicators: Blank page, error
    Evidence: .omo/evidence/task-20-empty-state.png
  ```

  **Evidence to Capture**:
  - [ ] task-20-dashboard-cards.png — dashboard with cards
  - [ ] task-20-empty-state.png — empty state

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(dashboard): add tool gallery page with card grid and empty state`
  - Files: `apps/web/app/(shell)/dashboard/page.tsx`
  - Pre-commit: `pnpm test`

- [x] 21. CR manifest + tool registration

  **What to do**:
  - Create `apps/web/src/features/charger-reminder/manifest.ts`:
    - Export `crManifest: ToolManifest` with:
      - id: `charger-reminder`
      - name: `Charger Reminder`
      - icon: `🔋` (or SVG icon)
      - description: `Track battery-powered devices and get charge reminders`
      - routes: `['/tools/charger-reminder']`
      - enabled: true
    - Export `crComponentLoader` using `dynamic(() => import('./pages/device-list-page'))`
  - Create `apps/web/src/features/charger-reminder/index.ts`:
    - Call `registerTool(crManifest, crComponentLoader)` on import
  - Wire auto-discovery: ensure `discoverTools()` (Task 19) picks up this manifest
  - Write test: registry contains charger-reminder after import
  - Verify: dashboard shows Charger Reminder card

  **Must NOT do**:
  - Do not copy any UI or logic from CR yet (next tasks)
  - Do not modify the manifest format (follow ToolManifest from shared)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Manifest definition + registration wiring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 22-26)
  - **Blocks**: Tasks 22, 29
  - **Blocked By**: Tasks 18, 19

  **References**:
  - `@memo/shared/src/types.ts` — ToolManifest interface (Task 3)
  - `apps/web/src/lib/tool-registry/registry.ts` — registerTool function (Task 18)
  - Next.js dynamic: `next/dynamic` for lazy loading

  **Acceptance Criteria**:
  - [ ] `crManifest` matches ToolManifest type with all required fields
  - [ ] `registerTool()` called on import
  - [ ] Registry returns charger-reminder when queried
  - [ ] Dashboard card links to `/tools/charger-reminder`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Charger Reminder registered in tool registry
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: import CR feature, check getRegisteredTools()
      2. Assert: tools array includes item with id "charger-reminder"
      3. Assert: manifest has name "Charger Reminder"
    Expected Result: CR appears in registry after import
    Evidence: .omo/evidence/task-21-cr-registry.txt
  ```

  **Evidence to Capture**:
  - [ ] task-21-cr-registry.txt — vitest output

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): add tool manifest and auto-registration`
  - Files: `apps/web/src/features/charger-reminder/manifest.ts`, `apps/web/src/features/charger-reminder/index.ts`
  - Pre-commit: `pnpm test`

- [x] 22. CR types + test fixtures migration

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\database\contracts.ts` → `apps/web/src/features/charger-reminder/database/contracts.ts`
  - Update imports: remove `@/*` path (use relative or `@/features/charger-reminder/*`)
  - Rename table references: `devices` → `cr_devices`, etc. in JSDoc comments
  - Remove `User` type (use Supabase User from @memo/shared or auth-helpers)
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\database\device-presets.ts` → `apps/web/src/features/charger-reminder/database/device-presets.ts`
  - Update table name: `device_presets` → `cr_device_presets`
  - Create test fixtures: `apps/web/src/features/charger-reminder/database/__tests__/fixtures.ts` — sample devices, users, charge events
  - Write failing tests: Type validations for Device, ChargeEvent, ComputedReminderState

  **Must NOT do**:
  - Do not change type shapes or field names (preserve CR behavior)
  - Do not add new types (migration only)
  - Do not import server actions (types only at this stage)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type migration + path updates, well-defined

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 23-26)
  - **Blocks**: Tasks 23, 25, 27
  - **Blocked By**: Tasks 3, 21

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\contracts.ts` — Source contracts
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\device-presets.ts` — Preset definitions
  - `supabase/migrations/001_cr_device_reminder.sql` (Task 12) — Schema for table name reference

  **Acceptance Criteria**:
  - [ ] All types migrated with `cr_` table name references
  - [ ] Device, ChargeEvent, DevicePreset, ReminderPreference, ComputedReminderState types defined
  - [ ] Test fixtures export sample data matching types
  - [ ] Tests: type validation tests pass (check required fields)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Types match migrated schema
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: validate fixture data conforms to contracts
      2. Assert: Device fixture has all required fields (id, user_id, name, device_type, threshold_percent)
    Expected Result: All fixtures valid, type checks pass
    Evidence: .omo/evidence/task-22-types-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-22-types-test.txt — vitest output

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): migrate types, contracts, and test fixtures`
  - Files: `apps/web/src/features/charger-reminder/database/contracts.ts`, `apps/web/src/features/charger-reminder/database/device-presets.ts`, fixtures
  - Pre-commit: `pnpm test --filter apps/web`

- [x] 23. CR database layer: contracts + device-presets + devices CRUD

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\database\devices.ts` → `apps/web/src/features/charger-reminder/database/devices.ts`
  - Update all table references: `devices` → `cr_devices`, `device_presets` → `cr_device_presets`, `charge_events` → `cr_charge_events`, `reminder_preferences` → `cr_reminder_preferences`, `computed_reminder_states` → `cr_computed_reminder_states`
  - Replace `createBrowserClient` import → use shared Supabase client (Task 10)
  - Replace `getEnv()` import → use shared env (Task 9)
  - Update "use server" directives (keep server actions)
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\database\test-database.ts` → `apps/web/src/features/charger-reminder/database/test-database.ts`
  - Update table names in pg-mem mock DB setup
  - Verify all CRUD functions compile: `listDevicesByUser`, `createDevice`, `updateDevice`, `deleteDevice`, `logChargeEvent`, `recomputeReminderStateForDevice`

  **Must NOT do**:
  - Do not change function signatures or behavior
  - Do not modify business logic in `recomputeReminderStateForDevice`
  - Do not remove mock DB support (keep E2E_MOCK_DB flag)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex server action migration with table renames, mock DB adaptation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 22, 24-26)
  - **Blocks**: Tasks 24, 27, 28
  - **Blocked By**: Tasks 10, 12, 22

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\devices.ts` — Source server actions
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\test-database.ts` — Mock DB helper
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\supabase\client.ts` — Supabase client reference (to replicate pattern)
  - `supabase/migrations/001_cr_device_reminder.sql` (Task 12) — Target table names

  **Acceptance Criteria**:
  - [ ] All CRUD functions use `cr_` prefixed table names
  - [ ] `listDevicesByUser(userId)` returns devices for user
  - [ ] `createDevice()` inserts into cr_devices and cr_reminder_preferences
  - [ ] `deleteDevice()` cascades to related tables
  - [ ] `logChargeEvent()` creates charge event + recomputes reminder
  - [ ] Mock DB mode works when `E2E_MOCK_DB=true`
  - [ ] No type errors: `tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: CRUD operations work against Supabase
    Tool: Bash (curl or vitest integration test)
    Preconditions: Supabase local running with migrations applied
    Steps:
      1. Create a device via server action
      2. Query cr_devices table → device exists
      3. Log a charge event
      4. Query cr_charge_events → event exists
      5. Query cr_computed_reminder_states → state computed
    Expected Result: Full CRUD cycle works
    Failure Indicators: FK errors, missing tables, wrong table names
    Evidence: .omo/evidence/task-23-crud-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-23-crud-test.txt — integration test output

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): migrate database layer with cr_ namespaced tables`
  - Files: `apps/web/src/features/charger-reminder/database/devices.ts`, `test-database.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 24. CR database tests: pg-mem integration suite

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\database\schema.integration.test.ts` → `apps/web/src/features/charger-reminder/database/__tests__/schema.integration.test.ts`
  - Update imports for new paths + `cr_` table names
  - Verify all tests pass against mock DB (pg-mem):
    - Schema creation
    - Device CRUD operations
    - Charge event logging
    - Reminder preference creation
    - Computed reminder state generation
  - Run with: `E2E_MOCK_DB=true pnpm test --filter apps/web`

  **Must NOT do**:
  - Do not test against real Supabase (these are unit-like integration tests)
  - Do not modify test expectations (preserve original behavior)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: pg-mem integration testing with schema verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21-23, 25-26)
  - **Blocks**: None (leaf task)
  - **Blocked By**: Tasks 12, 16, 23

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\schema.integration.test.ts` — Source tests
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\test-database.ts` — pg-mem setup (Task 23)

  **Acceptance Criteria**:
  - [ ] All original schema integration tests pass
  - [ ] Tests use `cr_` prefixed tables
  - [ ] Tests cover: schema creation, CRUD, cascading deletes, FK constraints

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: pg-mem integration tests pass
    Tool: Bash (pwsh)
    Steps:
      1. E2E_MOCK_DB=true pnpm test -- --run src/features/charger-reminder/database/__tests__/schema.integration.test.ts
    Expected Result: All tests pass, exit 0
    Failure Indicators: "relation does not exist", FK errors, wrong table names
    Evidence: .omo/evidence/task-24-pgmem-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-24-pgmem-test.txt — full vitest output

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): migrate pg-mem integration test suite`
  - Files: `apps/web/src/features/charger-reminder/database/__tests__/schema.integration.test.ts`
  - Pre-commit: `E2E_MOCK_DB=true pnpm test`

- [x] 25. CR heuristic engine migration + tests

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\reminders\heuristic-engine.ts` → `apps/web/src/features/charger-reminder/reminders/heuristic-engine.ts`
  - Verify: pure function, no dependencies on table names or Supabase
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\reminders\heuristic-engine.test.ts` → `apps/web/src/features/charger-reminder/reminders/__tests__/heuristic-engine.test.ts`
  - Update imports for new paths
  - Run tests → all must pass (these are deterministic tests)
  - Verify: given same inputs, same outputs as original CR

  **Must NOT do**:
  - Do not modify the heuristic algorithm
  - Do not add or remove test cases
  - Do not change function signatures

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding deterministic heuristic logic to verify correctness during migration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21-24, 26)
  - **Blocks**: Tasks 27, 28
  - **Blocked By**: Tasks 16, 22

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\reminders\heuristic-engine.ts` — Source engine
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\reminders\heuristic-engine.test.ts` — Source tests
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\database\device-presets.ts` — Preset drain rates

  **Acceptance Criteria**:
  - [ ] Heuristic engine migrated with zero logic changes
  - [ ] All 10+ existing tests pass (identical results to original)
  - [ ] `computeReminderState()` returns one of: needs-charge-log, tracking, remind, charge-now
  - [ ] Deterministic: same inputs = same output every time

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Heuristic engine behaves identically to original
    Tool: Bash (pwsh)
    Steps:
      1. pnpm test -- --run src/features/charger-reminder/reminders/__tests__/heuristic-engine.test.ts
      2. Assert: all tests pass (same count as original)
    Expected Result: Zero test failures, identical behavior
    Failure Indicators: Test failures, different status outputs, calculation divergence
    Evidence: .omo/evidence/task-25-heuristic-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-25-heuristic-test.txt — full vitest output

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): migrate heuristic engine with all tests`
  - Files: `apps/web/src/features/charger-reminder/reminders/heuristic-engine.ts`, tests
  - Pre-commit: `pnpm test`

- [x] 26. CR auth mock + E2E mock DB setup

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\lib\auth\mock.ts` → `apps/web/src/features/charger-reminder/auth/mock.ts`
  - Adapt for new paths:
    - `MOCK_AUTH_COOKIE`, `isMockAuthEnabled()`, `buildMockMagicLink()` functions
    - Check `AUTH_E2E_MOCK` and `NEXT_PUBLIC_ENABLE_AUTH_MOCK` env vars
  - Create `apps/web/src/features/charger-reminder/auth/mock-bypass.ts`:
    - Route handler or middleware to set mock auth cookie for E2E tests
  - Update `playwright.config.ts` (Task 16): add mock env vars for CR tests
  - Configure E2E mock DB: `E2E_MOCK_DB=true` for Playwright webServer
  - Write test: mock auth sets cookie, `getSessionUser()` returns mock user

  **Must NOT do**:
  - Do not enable mock auth in production (check `NODE_ENV` or explicit env flag)
  - Do not expose mock endpoints on production routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mock setup adaptation from existing pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21-25)
  - **Blocks**: Task 31
  - **Blocked By**: Tasks 22, 23

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\lib\auth\mock.ts` — Mock auth pattern
  - `D:\documents\code\git\release\Charger-Reminder\playwright.config.ts` — E2E mock env setup
  - `D:\documents\code\git\release\Charger-Reminder\e2e\mocks\` — E2E mock helpers

  **Acceptance Criteria**:
  - [ ] Mock auth sets cookie → session guard allows access
  - [ ] `E2E_MOCK_DB=true` → database layer uses in-memory mock instead of Supabase
  - [ ] Playwright config includes mock env vars for CR tests
  - [ ] Mock disabled when `NODE_ENV=production`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Mock auth allows authenticated access
    Tool: Playwright
    Steps:
      1. Set mock auth cookie
      2. Navigate to /tools/charger-reminder
      3. Assert: page loads (200), not redirected to sign-in
    Expected Result: Mock auth bypasses Supabase, protected page accessible
    Failure Indicators: Redirect to sign-in, 500 error
    Evidence: .omo/evidence/task-26-mock-auth.png
  ```

  **Evidence to Capture**:
  - [ ] task-26-mock-auth.png — loaded page with mock auth

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(charger-reminder): migrate auth mock and E2E mock DB setup`
  - Files: `apps/web/src/features/charger-reminder/auth/mock.ts`, `mock-bypass.ts`
  - Pre-commit: `pnpm test`

- [x] 27. CR DeviceList + DeviceCard components + tests

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-list.tsx` → `apps/web/src/features/charger-reminder/components/device-list.tsx`
  - Update imports: `@/*` → relative or feature-scoped paths
  - Replace any hardcoded navigation with Next.js `Link` or `useRouter`
  - Each DeviceCard shows: name, device type, battery %, reminder status badge
  - Status badges: Needs Charge Log (gray) · Tracking (blue) · Reminder Due (yellow) · Charge Now (red)
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-card.tsx` if separate (check source)
  - Write tests: renders device list, shows correct status badge, empty state, delete action
  - Run tests → GREEN

  **Must NOT do**:
  - Do not change status badge colors or thresholds
  - Do not add features (filter, sort, search) unless in original

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with status badges, interactive list, visual states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 28-31)
  - **Blocks**: Tasks 29, 31
  - **Blocked By**: Tasks 5, 22, 23, 25

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-list.tsx` — Source component
  - `apps/web/src/features/charger-reminder/database/devices.ts` — listDevicesByUser (Task 23)
  - `apps/web/src/features/charger-reminder/reminders/heuristic-engine.ts` — Status logic (Task 25)

  **Acceptance Criteria**:
  - [ ] DeviceList renders cards for each device
  - [ ] Each card shows: name, type, battery %, reminder status badge
  - [ ] Delete button removes device from list
  - [ ] Empty state: "No devices yet" message with "Add Device" link
  - [ ] Tests: render with devices, empty state, delete action

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Device list renders with status badges
    Tool: Playwright
    Preconditions: Mock DB with 3 devices (tracking, remind, charge-now)
    Steps:
      1. Navigate to /tools/charger-reminder
      2. Assert: 3 device cards visible
      3. Assert: one card has "Charge Now" badge (red)
      4. Assert: one card has "Reminder Due" badge (yellow)
      5. Assert: one card has "Tracking" badge (blue)
    Expected Result: All devices rendered with correct status badges
    Failure Indicators: Wrong badge colors, missing devices, wrong status
    Evidence: .omo/evidence/task-27-device-list.png

  Scenario: Delete device works
    Tool: Playwright
    Steps:
      1. Click delete button on first device card
      2. Confirm deletion (if confirmation dialog)
      3. Assert: device removed from list, card count decreases by 1
    Expected Result: Device deleted, list updates
    Failure Indicators: Device still visible, error, count unchanged
    Evidence: .omo/evidence/task-27-delete-device.png
  ```

  **Evidence to Capture**:
  - [ ] task-27-device-list.png — full list with badges
  - [ ] task-27-delete-device.png — after deletion

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(charger-reminder): migrate DeviceList component with status badges`
  - Files: `apps/web/src/features/charger-reminder/components/device-list.tsx`, tests
  - Pre-commit: `pnpm test`

- [x] 28. CR DeviceDetail + DeviceForm components + tests

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-detail.tsx` → `apps/web/src/features/charger-reminder/components/device-detail.tsx`
    - Shows device info, charge history timeline, "Log Charge" form
    - Log charge button → calls `logChargeEvent()` → refetches data
  - Copy `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-form.tsx` → `apps/web/src/features/charger-reminder/components/device-form.tsx`
    - Create/edit form: name, device type (preset dropdown), capacity, notes, threshold %, lead days
    - Validation: required fields, numeric thresholds (0-100)
  - Write tests: detail renders device info + history, form validates + submits
  - Run tests → GREEN

  **Must NOT do**:
  - Do not change form fields or validation rules
  - Do not change charge history display format

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form with validation, data display, interactive charge logging

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 27, 29-31)
  - **Blocks**: Tasks 29, 30
  - **Blocked By**: Tasks 8, 23, 25

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-detail.tsx` — Source detail
  - `D:\documents\code\git\release\Charger-Reminder\src\components\devices\device-form.tsx` — Source form
  - `apps/web/src/features/charger-reminder/database/devices.ts` — Server actions (Task 23)

  **Acceptance Criteria**:
  - [ ] DeviceDetail shows: name, type, battery %, threshold, notes, charge history
  - [ ] "Log Charge" form submits and adds entry to history
  - [ ] DeviceForm validates required fields
  - [ ] Preset dropdown shows 5 device types from cr_device_presets
  - [ ] Tests: detail render, form validation, form submission

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Log charge event updates history
    Tool: Playwright
    Preconditions: Device exists in mock DB
    Steps:
      1. Navigate to /tools/charger-reminder/{deviceId}
      2. Assert: charge history shows existing entries
      3. Fill "Log Charge" form: add note "Full charge"
      4. Click submit
      5. Assert: new entry appears in history with correct timestamp
      6. Assert: reminder status updates after charge
    Expected Result: New charge logged, history updated, status recalculated
    Failure Indicators: No new entry, status unchanged, error on submit
    Evidence: .omo/evidence/task-28-log-charge.png

  Scenario: Device form validation errors
    Tool: Playwright
    Steps:
      1. Navigate to /tools/charger-reminder/new
      2. Leave name empty, click submit
      3. Assert: "Name is required" error visible
      4. Fill name, leave threshold empty, submit
      5. Assert: "Threshold is required" error
    Expected Result: Validation errors shown for missing required fields
    Failure Indicators: Form submitted with empty fields, no error messages
    Evidence: .omo/evidence/task-28-form-validation.png
  ```

  **Evidence to Capture**:
  - [ ] task-28-log-charge.png — charge history updated
  - [ ] task-28-form-validation.png — validation error state

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(charger-reminder): migrate DeviceDetail and DeviceForm components`
  - Files: `apps/web/src/features/charger-reminder/components/device-detail.tsx`, `device-form.tsx`, tests
  - Pre-commit: `pnpm test`

- [x] 29. CR pages: device list + device detail routes

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\page.tsx` → `apps/web/src/app/(shell)/tools/charger-reminder/page.tsx`
    - Server component: calls `listDevicesByUser()` → renders DeviceList
    - "Add Device" button links to `/tools/charger-reminder/new`
  - Copy `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\[id]\page.tsx` → `apps/web/src/app/(shell)/tools/charger-reminder/[id]/page.tsx`
    - Server component: fetches device by ID → renders DeviceDetail
    - Handles not-found: device doesn't exist → 404
  - Wire data fetching: call server actions, pass data as props to client components
  - Verify: navigating from sidebar → tool opens, device list renders

  **Must NOT do**:
  - Do not use `"use client"` on page components (server components by default)
  - Do not change URL structure from original CR

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Page composition, server component data fetching, route wiring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 27, 28, 30-31)
  - **Blocks**: Task 31
  - **Blocked By**: Tasks 14, 17, 21, 27, 28

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\page.tsx` — Device list page
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\[id]\page.tsx` — Device detail page
  - `apps/web/src/lib/auth/session.ts` — getSessionUser (Task 15)

  **Acceptance Criteria**:
  - [ ] `/tools/charger-reminder` → device list renders
  - [ ] `/tools/charger-reminder/{id}` → device detail renders
  - [ ] Invalid device ID → 404
  - [ ] "Add Device" link navigates to new page
  - [ ] Page title/metadata set correctly

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Device list page loads with data
    Tool: Playwright
    Preconditions: Mock auth, mock DB with devices
    Steps:
      1. Navigate to /tools/charger-reminder
      2. Assert: page title includes "Charger Reminder"
      3. Assert: device cards rendered with data
      4. Click "Add Device" link
      5. Assert: navigated to /tools/charger-reminder/new
    Expected Result: Device list page functional with navigation
    Failure Indicators: No data, navigation broken, server error
    Evidence: .omo/evidence/task-29-device-list-page.png
  ```

  **Evidence to Capture**:
  - [ ] task-29-device-list-page.png — full page screenshot

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(charger-reminder): add device list and detail page routes`
  - Files: `apps/web/app/(shell)/tools/charger-reminder/page.tsx`, `apps/web/app/(shell)/tools/charger-reminder/[id]/page.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 30. CR pages: new device + edit device routes

  **What to do**:
  - Copy `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\new\page.tsx` → `apps/web/src/app/(shell)/tools/charger-reminder/new/page.tsx`
    - Renders DeviceForm in "create" mode
    - On submit → redirects to new device detail page
  - Copy `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\[id]\edit\page.tsx` → `apps/web/src/app/(shell)/tools/charger-reminder/[id]/edit/page.tsx`
    - Fetches device by ID → pre-fills DeviceForm in "edit" mode
    - On submit → redirects to device detail
  - Wire form actions to server actions from Task 23
  - Verify: create → redirect → device visible in list; edit → redirect → updated data visible

  **Must NOT do**:
  - Do not change form behavior from original CR
  - Do not add confirmation dialogs that didn't exist

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form pages with server action wiring and redirects

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 27-29, 31)
  - **Blocks**: Task 31
  - **Blocked By**: Task 28

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\new\page.tsx` — New device page
  - `D:\documents\code\git\release\Charger-Reminder\app\(protected)\devices\[id]\edit\page.tsx` — Edit device page
  - `apps/web/src/features/charger-reminder/database/devices.ts` — createDevice, updateDevice (Task 23)

  **Acceptance Criteria**:
  - [ ] `/tools/charger-reminder/new` → form renders, submit creates device
  - [ ] `/tools/charger-reminder/{id}/edit` → form pre-filled, submit updates device
  - [ ] Create redirects to new device detail
  - [ ] Edit redirects to device detail with updated data

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Create new device flow
    Tool: Playwright
    Steps:
      1. Navigate to /tools/charger-reminder/new
      2. Fill form: name "Test Mouse", type "Wireless Mouse", threshold 20, capacity 500
      3. Click submit
      4. Assert: redirected to /tools/charger-reminder/{newId}
      5. Assert: device detail shows "Test Mouse" with correct threshold
    Expected Result: Full create flow works
    Failure Indicators: No redirect, wrong data, error on submit
    Evidence: .omo/evidence/task-30-create-device.png
  ```

  **Evidence to Capture**:
  - [ ] task-30-create-device.png — new device detail after creation

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(charger-reminder): add new device and edit device page routes`
  - Files: `apps/web/app/(shell)/tools/charger-reminder/new/page.tsx`, `apps/web/app/(shell)/tools/charger-reminder/[id]/edit/page.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 31. CR Playwright e2e: auth + device CRUD + reminders

  **What to do**:
  - Copy and adapt all Playwright e2e tests from `D:\documents\code\git\release\Charger-Reminder\e2e\` → `apps/web/e2e/charger-reminder/`:
    - `auth.spec.ts` — mock sign-in, session persistence, sign-out
    - `device-inventory.spec.ts` — create, list, edit, delete devices
    - `charge-event-history.spec.ts` — log charge, view history, status change
    - `smoke.spec.ts` — basic page loads
  - Update selectors and URLs for new route structure (`/tools/charger-reminder/*`)
  - Copy mock helpers from `D:\documents\code\git\release\Charger-Reminder\e2e\mocks\` → `apps/web/e2e/mocks/`
  - Ensure all tests use mock auth + mock DB (no real Supabase dependency)
  - Run all CR e2e tests → all must pass

  **Must NOT do**:
  - Do not write new test cases beyond what CR already had
  - Do not depend on real Supabase (use E2E_MOCK_DB + mock auth)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: E2E test migration with URL/selector adaptation, mock integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 27-30)
  - **Blocks**: Task 43
  - **Blocked By**: Tasks 16, 26, 27, 29, 30

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\e2e\**` — All source e2e tests
  - `apps/web/playwright.config.ts` (Task 16) — E2E config with mock env

  **Acceptance Criteria**:
  - [ ] All 4 e2e spec files migrated and passing
  - [ ] Auth e2e: mock sign-in works, session persists
  - [ ] Device inventory e2e: create, list, edit, delete all work
  - [ ] Charge event e2e: log charge, verify history, check status update
  - [ ] `pnpm test:e2e -- charger-reminder/` → all pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full E2E test suite passes
    Tool: Bash (pwsh)
    Steps:
      1. pnpm test:e2e -- --project=chromium charger-reminder/
    Expected Result: All tests pass, exit 0
    Failure Indicators: Any test failure, timeout, selector not found
    Evidence: .omo/evidence/task-31-e2e-results.txt
  ```

  **Evidence to Capture**:
  - [ ] task-31-e2e-results.txt — full Playwright output

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(charger-reminder): migrate Playwright e2e test suite`
  - Files: `apps/web/e2e/charger-reminder/**`, `apps/web/e2e/mocks/**`
  - Pre-commit: `pnpm test:e2e -- charger-reminder/`

- [x] 32. CH manifest + tool registration

  **What to do**:
  - Create `apps/web/src/features/core-hour/manifest.ts`:
    - Export `chManifest: ToolManifest` with:
      - id: `core-hour`
      - name: `Core Hour`
      - icon: `⏱️` (or SVG icon)
      - description: `Track your time with interval check-ins and tag-based categorization`
      - routes: `['/tools/core-hour']`
      - enabled: true
    - Export `chComponentLoader` using `dynamic(() => import('./pages/dashboard-page'))`
  - Create `apps/web/src/features/core-hour/index.ts`:
    - Call `registerTool(chManifest, chComponentLoader)` on import
  - Verify: registry contains core-hour, dashboard shows card
  - Write test: CH registered after import

  **Must NOT do**:
  - Do not implement any CH logic yet
  - Do not copy Tauri-specific references

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Manifest definition + registration wiring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 33-37)
  - **Blocks**: Tasks 33, 40
  - **Blocked By**: Tasks 18, 19

  **References**:
  - `@memo/shared/src/types.ts` — ToolManifest interface (Task 3)
  - `apps/web/src/lib/tool-registry/registry.ts` — registerTool function (Task 18)
  - Task 21 CR manifest — pattern to follow for manifest structure

  **Acceptance Criteria**:
  - [ ] `chManifest` matches ToolManifest type
  - [ ] `registerTool()` called on import
  - [ ] Registry returns core-hour when queried
  - [ ] Dashboard card links to `/tools/core-hour`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Core Hour registered in tool registry
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: import CH feature, check getRegisteredTools()
      2. Assert: tools array includes item with id "core-hour"
    Expected Result: CH appears in registry
    Evidence: .omo/evidence/task-32-ch-registry.txt
  ```

  **Evidence to Capture**:
  - [ ] task-32-ch-registry.txt — vitest output

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): add tool manifest and auto-registration`
  - Files: `apps/web/src/features/core-hour/manifest.ts`, `apps/web/src/features/core-hour/index.ts`
  - Pre-commit: `pnpm test`

- [x] 33. CH types + test fixtures migration

  **What to do**:
  - Copy `D:\documents\code\git\release\CoreHour\src\types.ts` → `apps/web/src/features/core-hour/database/types.ts`
  - Adapt for web: remove Tauri-specific types, keep core domain types:
    - `Tag`: id, user_id, name, color, is_archived
    - `Session`: id, user_id, started_at, ended_at, interval_minutes
    - `CheckIn`: id, session_id, checked_at, skipped, note
    - `CheckInEntry`: id, check_in_id, tag_id, percentage
    - `Settings`: key, value
  - Update types: `synced` flag → optional (web-only doesn't need sync tracking, but keep for schema compatibility)
  - Create test fixtures: `apps/web/src/features/core-hour/database/__tests__/fixtures.ts` — sample tags, sessions, check-ins
  - Write tests: type validation

  **Must NOT do**:
  - Do not include Tauri window types or Rust IPC types
  - Do not change core domain field names

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type migration with Tauri cleanup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32, 34-37)
  - **Blocks**: Tasks 34, 36, 37
  - **Blocked By**: Tasks 3, 32

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\types.ts` — Source types
  - `supabase/migrations/003_ch_core_hour.sql` (Task 13) — Schema for type reference

  **Acceptance Criteria**:
  - [ ] Domain types defined: Tag, Session, CheckIn, CheckInEntry, Settings
  - [ ] All types reference `ch_` table names in JSDoc
  - [ ] Test fixtures export valid sample data
  - [ ] Tests pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Types match CH schema
    Tool: Bash (pwsh)
    Steps:
      1. Run vitest: validate fixture data matches types
    Expected Result: Tests pass, fixtures valid
    Evidence: .omo/evidence/task-33-ch-types-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-33-ch-types-test.txt — vitest output

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): migrate types, contracts, and test fixtures`
  - Files: `apps/web/src/features/core-hour/database/types.ts`, fixtures
  - Pre-commit: `pnpm test`

- [x] 34. CH database layer: SQLite→Supabase server actions

  **What to do**:
  - Create `apps/web/src/features/core-hour/database/server-actions.ts` — "use server" functions:
    - `listTags(userId)` — SELECT FROM ch_tags WHERE user_id = $1 AND NOT is_archived
    - `createTag(userId, name, color)` — INSERT INTO ch_tags
    - `renameTag(tagId, name)` — UPDATE ch_tags SET name
    - `archiveTag(tagId)` — UPDATE ch_tags SET is_archived = true
    - `startSession(userId, intervalMinutes)` — INSERT INTO ch_sessions
    - `endSession(sessionId)` — UPDATE ch_sessions SET ended_at = now()
    - `listSessions(userId)` — SELECT FROM ch_sessions JOIN aggregations
    - `saveCheckIn(sessionId, entries, note)` — INSERT ch_check_ins + ch_check_in_entries
    - `getActiveSession(userId)` — SELECT session WHERE ended_at IS NULL
    - `getSettings(userId)` — SELECT FROM ch_settings
  - Create `apps/web/src/features/core-hour/database/mock-db.ts`:
    - In-memory arrays for tags, sessions, check_ins, check_in_entries (mock mode)
    - Same interface as server actions; E2E_MOCK_DB flag switches
  - Based on CoreHour's SQLite patterns in `D:\documents\code\git\release\CoreHour\src\lib\db.ts` + store files
  - Write tests: each server action testable via mock DB

  **Must NOT do**:
  - Do not implement sync logic (web-only uses direct Supabase)
  - Do not use SQLite or Tauri plugin imports
  - Do not change data model from CoreHour's original schema

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-table server actions, SQLite→Supabase adaptation, mock DB implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32, 33, 35-37)
  - **Blocks**: Tasks 35, 37, 39
  - **Blocked By**: Tasks 10, 13, 33

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\lib\db.ts` — SQLite query patterns
  - `D:\documents\code\git\release\CoreHour\src\store\tags.ts` — Tag CRUD operations
  - `D:\documents\code\git\release\CoreHour\src\store\session.ts` — Session operations
  - `D:\documents\code\git\release\CoreHour\src\store\checkin.ts` — Check-in operations
  - `supabase/migrations/003_ch_core_hour.sql` (Task 13) — Target schema
  - Task 23 CR database layer — server action patterns to follow

  **Acceptance Criteria**:
  - [ ] All CRUD functions implemented as "use server" actions
  - [ ] `startSession()` creates session; `endSession()` sets ended_at
  - [ ] `saveCheckIn()` creates check_in + entries with tag percentages
  - [ ] Mock DB works when `E2E_MOCK_DB=true`
  - [ ] All functions use `ch_` prefixed table names
  - [ ] Tests: each function tested

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Session lifecycle works
    Tool: Bash (vitest integration)
    Preconditions: Mock DB or test Supabase
    Steps:
      1. Call startSession(userId, 30) → returns session
      2. Assert: session.interval_minutes = 30, ended_at is null
      3. Call saveCheckIn(session.id, [{tagId, percentage: 50}, {tagId2, percentage: 50}])
      4. Assert: check_in created with 2 entries
      5. Call endSession(session.id)
      6. Assert: session.ended_at is not null
    Expected Result: Full session lifecycle works
    Evidence: .omo/evidence/task-34-session-lifecycle.txt
  ```

  **Evidence to Capture**:
  - [ ] task-34-session-lifecycle.txt — integration test output

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): implement SQLite→Supabase server actions with mock DB`
  - Files: `apps/web/src/features/core-hour/database/server-actions.ts`, `mock-db.ts`, tests
  - Pre-commit: `pnpm test`

- [x] 35. CH database tests: mock DB integration suite

  **What to do**:
  - Create `apps/web/src/features/core-hour/database/__tests__/schema.integration.test.ts`
  - Test all server actions against mock DB:
    - Tag CRUD: create, rename, archive, list (not archived)
    - Session lifecycle: start, end, list by user
    - Check-in: save with entries, skipped check-in
    - Settings: get, update interval_minutes
    - Edge cases: empty tag list, no active session, duplicate tag names
  - Run with: `E2E_MOCK_DB=true pnpm test`

  **Must NOT do**:
  - Do not test against real Supabase (unit-like integration tests)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Comprehensive integration test suite

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32-34, 36-37)
  - **Blocks**: None
  - **Blocked By**: Tasks 13, 16, 34

  **References**:
  - `apps/web/src/features/core-hour/database/mock-db.ts` (Task 34) — Mock implementation
  - Task 24 CR integration tests — Test pattern to follow

  **Acceptance Criteria**:
  - [ ] Tag CRUD: 4+ tests
  - [ ] Session lifecycle: 3+ tests
  - [ ] Check-in: 3+ tests
  - [ ] Edge cases covered
  - [ ] All tests pass against mock DB

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All CH integration tests pass
    Tool: Bash (pwsh)
    Steps:
      1. E2E_MOCK_DB=true pnpm test -- --run src/features/core-hour/database/__tests__/
    Expected Result: All tests pass, exit 0
    Evidence: .omo/evidence/task-35-ch-integration.txt
  ```

  **Evidence to Capture**:
  - [ ] task-35-ch-integration.txt — full vitest output

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): add mock DB integration test suite`
  - Files: `apps/web/src/features/core-hour/database/__tests__/schema.integration.test.ts`
  - Pre-commit: `E2E_MOCK_DB=true pnpm test -- core-hour`

- [x] 36. CH timer system: web-native timer + tests

  **What to do**:
  - Create `apps/web/src/features/core-hour/timer/timer-service.ts`:
    - `startTimer(intervalMinutes, onTick)` — starts interval, calls onTick every N minutes
    - `stopTimer()` — clears interval
    - `getRemainingTime()` — returns seconds until next tick
    - Uses `setInterval` internally with Visibility API compensation:
      - On visibility change (tab hidden → visible): check elapsed time, fire immediately if overdue
      - On tick: call onTick callback (in-app notification/modal trigger)
    - Export timer state: `isRunning`, `nextTickAt`
  - Write tests:
    - `startTimer(1, callback)` fires callback after ~1 minute (use fake timers)
    - `stopTimer()` prevents further callbacks
    - Visibility change: tab hidden 5 min, return → callback fires if overdue
    - Accuracy: callback fires within ±30s of expected time
  - Document: "Web timers may drift ±30 seconds in background tabs"
  - Run tests → GREEN

  **Must NOT do**:
  - Do not use Service Workers (complexity not justified for v1)
  - Do not use requestAnimationFrame (not suitable for minute-level intervals)
  - Do not depend on Tauri or Rust (web-native only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Timer logic with visibility compensation, fake timer tests, accuracy validation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32-35, 37)
  - **Blocks**: Tasks 37, 38, 41
  - **Blocked By**: Tasks 16, 33

  **References**:
  - `D:\documents\code\git\release\CoreHour\src-tauri\src\timer.rs` — Original Rust timer logic for behavior reference
  - `D:\documents\code\git\release\CoreHour\src\lib\timer.ts` — JS wrapper pattern
  - MDN: Page Visibility API — https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API

  **Acceptance Criteria**:
  - [ ] `startTimer(1, callback)` fires callback within 60±30 seconds
  - [ ] `stopTimer()` prevents further callbacks
  - [ ] Visibility compensation: hidden then visible triggers overdue callback
  - [ ] `getRemainingTime()` returns correct countdown
  - [ ] Tests: 4+ test cases using fake timers + real visibility mock

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Timer fires callback on interval
    Tool: Bash (vitest with fake timers)
    Steps:
      1. Start timer with 1-minute interval and mock callback
      2. Advance fake timers by 60 seconds
      3. Assert: callback was called exactly once
      4. Advance another 60 seconds
      5. Assert: callback called twice
    Expected Result: Callback fires at correct intervals
    Failure Indicators: Callback not called, called wrong number of times
    Evidence: .omo/evidence/task-36-timer-test.txt

  Scenario: stopTimer prevents further callbacks
    Tool: Bash (vitest with fake timers)
    Steps:
      1. Start timer, advance 30s
      2. Call stopTimer()
      3. Advance 120s
      4. Assert: callback not called after stop
    Expected Result: No callbacks after stop
    Evidence: .omo/evidence/task-36-timer-stop-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-36-timer-test.txt — timer callback test
  - [ ] task-36-timer-stop-test.txt — timer stop test

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): implement web-native timer with visibility compensation`
  - Files: `apps/web/src/features/core-hour/timer/timer-service.ts`, tests
  - Pre-commit: `pnpm test -- core-hour`

- [x] 37. CH stores conversion: Zustand→React hooks + context

  **What to do**:
  - Create `apps/web/src/features/core-hour/stores/use-session.ts`:
    - Convert `D:\documents\code\git\release\CoreHour\src\store\session.ts` (Zustand → React hook with useState/useReducer)
    - `useSession()` hook: returns { activeSession, sessions, startSession, endSession, loadSessions }
    - Calls server actions from Task 34
    - Manages loading/error states
  - Create `apps/web/src/features/core-hour/stores/use-tags.ts`:
    - From `D:\documents\code\git\release\CoreHour\src\store\tags.ts`
    - `useTags()` hook: returns { tags, addTag, renameTag, archiveTag }
  - Create `apps/web/src/features/core-hour/stores/use-checkin.ts`:
    - From `D:\documents\code\git\release\CoreHour\src\store\checkin.ts`
    - `useCheckin()` hook: returns { checkIns, saveCheckIn, skipCheckIn }
  - Create `apps/web/src/features/core-hour/stores/use-settings.ts`:
    - From `D:\documents\code\git\release\CoreHour\src\store\settings.ts`
    - `useSettings()` hook: returns { intervalMinutes, updateInterval }
  - Write tests: each hook tested with mock server actions
  - Run tests → GREEN

  **Must NOT do**:
  - Do not use Zustand (Next.js + React hooks are simpler and consistent with CR patterns)
  - Do not use global stores (hooks are component-scoped with Context for sharing)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: State management conversion across 4 stores, React patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 32-36)
  - **Blocks**: Tasks 38, 39, 41
  - **Blocked By**: Tasks 33, 34, 36

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\store\session.ts` — Original session store
  - `D:\documents\code\git\release\CoreHour\src\store\tags.ts` — Original tag store
  - `D:\documents\code\git\release\CoreHour\src\store\checkin.ts` — Original checkin store
  - `D:\documents\code\git\release\CoreHour\src\store\settings.ts` — Original settings store
  - `apps/web/src/features/core-hour/database/server-actions.ts` (Task 34) — Server actions to call

  **Acceptance Criteria**:
  - [ ] `useSession()` manages active session, session history
  - [ ] `useTags()` manages tag CRUD with archived filtering
  - [ ] `useCheckin()` manages check-in submission with percentage validation
  - [ ] `useSettings()` manages interval_minutes
  - [ ] Each hook tested with mock server actions
  - [ ] Loading and error states handled

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Session hook manages lifecycle
    Tool: Bash (vitest with React Testing Library)
    Steps:
      1. Render test component using useSession()
      2. Call startSession('user-1', 30)
      3. Assert: activeSession exists with interval_minutes = 30
      4. Assert: loading state transitions correctly
      5. Call endSession()
      6. Assert: activeSession is null
    Expected Result: Full session lifecycle via hooks
    Evidence: .omo/evidence/task-37-session-hook-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-37-session-hook-test.txt — vitest output

  **Commit**: YES (groups with Wave 6)
  - Message: `feat(core-hour): convert Zustand stores to React hooks with server action integration`
  - Files: `apps/web/src/features/core-hour/stores/*.ts`, tests
  - Pre-commit: `pnpm test -- core-hour`

- [x] 38. CH check-in modal component + tests

  **What to do**:
  - Create `apps/web/src/features/core-hour/components/check-in-modal.tsx`:
    - Replaces CoreHour's always-on-top popup window with an in-app modal (using `@memo/ui` Modal)
    - Shows: active session info, list of enabled tags with percentage inputs
    - PercentageInput: per-tag slider or number input (must sum to 100%)
    - Shows validation: real-time "Total: X%" with red highlight if not 100%
    - Note field (optional text)
    - "Confirm" button → calls `saveCheckIn()` → closes modal → emits event
    - "Skip" button → calls `skipCheckIn()` → closes modal
    - Keyboard: Enter submits, Escape skips/closes
  - Copy/adjust percentage validation logic from `D:\documents\code\git\release\CoreHour\src\lib\validate.ts`
  - Write tests: renders tags, validates 100% total, submits, skips
  - Run tests → GREEN

  **Must NOT do**:
  - Do not create a separate window or use Tauri window APIs
  - Do not allow submission with total ≠ 100%
  - Do not use external UI libraries for the modal (use @memo/ui Modal)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Modal UI, percentage inputs, real-time validation, keyboard handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 39-42)
  - **Blocks**: Tasks 40, 41, 42
  - **Blocked By**: Tasks 5, 8, 36, 37

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\components\CheckInPopup.tsx` — Original popup
  - `D:\documents\code\git\release\CoreHour\src\components\PercentageInput.tsx` — Original percentage input
  - `D:\documents\code\git\release\CoreHour\src\lib\validate.ts` — Validation logic
  - `@memo/ui` Modal component (Task 8)

  **Acceptance Criteria**:
  - [ ] Modal shows on timer tick (via onTick callback)
  - [ ] All user tags listed with percentage inputs
  - [ ] Real-time total: red if ≠ 100%, green if = 100%
  - [ ] Confirm calls saveCheckIn with correct entries
  - [ ] Skip calls skipCheckIn
  - [ ] Enter/ESC keyboard shortcuts work
  - [ ] Tests: render, validation, submit, skip

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Check-in modal validates percentages
    Tool: Playwright
    Preconditions: Active session, 3 tags, timer fires
    Steps:
      1. Modal appears on screen
      2. Fill percentages: 50, 30, 20 → total shows 100% (green)
      3. Change one to 0 → total shows 80% (red)
      4. Click Confirm → Assert: validation error, modal stays open
      5. Fix to 50, 30, 20 → Click Confirm
      6. Assert: modal closes, check-in saved
    Expected Result: Validation prevents partial check-in, 100% submits successfully
    Failure Indicators: Submit with <100%, no validation message, modal doesn't close
    Evidence: .omo/evidence/task-38-checkin-validation.png

  Scenario: Skip check-in works
    Tool: Playwright
    Steps:
      1. Modal appears
      2. Click "Skip" button
      3. Assert: modal closes, skipCheckIn called
    Expected Result: Check-in skipped without data
    Evidence: .omo/evidence/task-38-checkin-skip.png
  ```

  **Evidence to Capture**:
  - [ ] task-38-checkin-validation.png — validation error state
  - [ ] task-38-checkin-skip.png — after skip

  **Commit**: YES (groups with Wave 7)
  - Message: `feat(core-hour): build check-in modal with percentage validation`
  - Files: `apps/web/src/features/core-hour/components/check-in-modal.tsx`, tests
  - Pre-commit: `pnpm test -- core-hour`

- [x] 39. CH Dashboard + TagBar components + tests

  **What to do**:
  - Create `apps/web/src/features/core-hour/components/dashboard-view.tsx`:
    - Shows active session status: timer running, elapsed time, next check-in countdown
    - "Start Session" button (disabled if session active)
    - "End Session" button (disabled if no active session)
    - Today's summary: list of check-ins with tag breakdowns
  - Create `apps/web/src/features/core-hour/components/tag-bar.tsx`:
    - Adapted from `D:\documents\code\git\release\CoreHour\src\components\TagBar.tsx`
    - Horizontal stacked bar showing time distribution across tags
    - Each bar segment = tag color, width = percentage of total time
    - Legend below bar: tag name + percentage
  - Write tests: dashboard shows active/inactive states, tag bar renders segments correctly
  - Run tests → GREEN

  **Must NOT do**:
  - Do not use Tauri tray events (use React state for session status)
  - Do not change color scheme from original CoreHour tags

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard layout, stacked bar visualization, session state display

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 38, 40-42)
  - **Blocks**: Tasks 40, 42
  - **Blocked By**: Tasks 34, 37

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\screens\Dashboard.tsx` — Original dashboard
  - `D:\documents\code\git\release\CoreHour\src\components\TagBar.tsx` — Original tag bar
  - `D:\documents\code\git\release\CoreHour\src\lib\stats.ts` — computeTagTotals logic
  - `apps/web/src/features/core-hour/stores/use-session.ts` (Task 37) — Session hooks

  **Acceptance Criteria**:
  - [ ] Dashboard shows "Start Session" when no session active
  - [ ] Dashboard shows elapsed time + "End Session" when session active
  - [ ] TagBar renders colored segments proportional to percentages
  - [ ] Today's summary shows check-in entries
  - [ ] Tests: active + inactive states, tag bar rendering

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Dashboard shows active session with timer
    Tool: Playwright
    Preconditions: Active session started
    Steps:
      1. Navigate to /tools/core-hour
      2. Assert: "End Session" button visible
      3. Assert: elapsed time showing (not 00:00)
      4. Assert: "Start Session" button disabled
    Expected Result: Dashboard reflects active session state
    Failure Indicators: Buttons in wrong state, timer not running
    Evidence: .omo/evidence/task-39-dashboard-active.png

  Scenario: TagBar renders time distribution
    Tool: Playwright
    Preconditions: Session with check-ins at 60% Coding, 40% Meetings
    Steps:
      1. Assert: TagBar shows 2 colored segments
      2. Assert: first segment ≈60% width, tag color matches
      3. Assert: legend shows "Coding 60%", "Meetings 40%"
    Expected Result: Correct visual distribution
    Failure Indicators: Wrong widths, missing segments, colors mismatch
    Evidence: .omo/evidence/task-39-tagbar.png
  ```

  **Evidence to Capture**:
  - [ ] task-39-dashboard-active.png — active session state
  - [ ] task-39-tagbar.png — tag bar visualization

  **Commit**: YES (groups with Wave 7)
  - Message: `feat(core-hour): build dashboard view and TagBar visualization`
  - Files: `apps/web/src/features/core-hour/components/dashboard-view.tsx`, `tag-bar.tsx`, tests
  - Pre-commit: `pnpm test -- core-hour`

- [x] 40. CH pages: dashboard + history + tags + settings

  **What to do**:
  - Create `apps/web/src/app/(shell)/tools/core-hour/page.tsx`:
    - Server component: redirects to internal dashboard page
    - Renders DashboardView component
  - Create `apps/web/src/app/(shell)/tools/core-hour/history/page.tsx`:
    - Adapted from `D:\documents\code\git\release\CoreHour\src\screens\History.tsx`
    - Lists past sessions grouped by date
    - Each session shows: duration, tag breakdown, check-in count
  - Create `apps/web/src/app/(shell)/tools/core-hour/tags/page.tsx`:
    - Adapted from `D:\documents\code\git\release\CoreHour\src\screens\TagManager.tsx`
    - CRUD for tags: add, edit name, change color, archive
    - Color picker: predefined palette
  - Create `apps/web/src/app/(shell)/tools/core-hour/settings/page.tsx`:
    - Adapted from `D:\documents\code\git\release\CoreHour\src\screens\Settings.tsx`
    - Interval minutes config (15, 30, 45, 60)
    - Sign out (reuses shared sign-out from shell)
  - Create `apps/web/src/features/core-hour/pages/` directory with page components
  - Verify: all routes accessible from sidebar, data loads correctly

  **Must NOT do**:
  - Do not create a React Router (use Next.js file-system routing)
  - Do not change the page layouts from original CoreHour

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 4 page routes with data fetching, adapted from existing screens

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 38, 39, 41-42)
  - **Blocks**: Task 42
  - **Blocked By**: Tasks 17, 32, 38, 39

  **References**:
  - `D:\documents\code\git\release\CoreHour\src\screens\Dashboard.tsx` — Source dashboard
  - `D:\documents\code\git\release\CoreHour\src\screens\History.tsx` — Source history
  - `D:\documents\code\git\release\CoreHour\src\screens\TagManager.tsx` — Source tag manager
  - `D:\documents\code\git\release\CoreHour\src\screens\Settings.tsx` — Source settings

  **Acceptance Criteria**:
  - [ ] `/tools/core-hour` → dashboard with session controls
  - [ ] `/tools/core-hour/history` → past sessions grouped by date
  - [ ] `/tools/core-hour/tags` → tag CRUD with color picker
  - [ ] `/tools/core-hour/settings` → interval config
  - [ ] Each page loads data from server actions

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All CH pages navigate correctly
    Tool: Playwright
    Preconditions: Mock auth, mock DB with session data
    Steps:
      1. Navigate to /tools/core-hour → dashboard renders
      2. Click "History" link → navigate to /tools/core-hour/history → session history visible
      3. Click "Tags" link → navigate to /tools/core-hour/tags → tag list visible
      4. Click "Settings" link → navigate to /tools/core-hour/settings → interval config visible
    Expected Result: All 4 pages load with data
    Failure Indicators: 404, blank page, data not loading
    Evidence: .omo/evidence/task-40-ch-pages.png
  ```

  **Evidence to Capture**:
  - [ ] task-40-ch-pages.png — screenshot montage of all 4 pages

  **Commit**: YES (groups with Wave 7)
  - Message: `feat(core-hour): add dashboard, history, tags, and settings pages`
  - Files: `apps/web/app/(shell)/tools/core-hour/**`, `apps/web/src/features/core-hour/pages/**`
  - Pre-commit: `pnpm typecheck`

- [x] 41. CH timer integration: session flow + check-in trigger

  **What to do**:
  - Create `apps/web/src/features/core-hour/components/session-controller.tsx`:
    - Wraps DashboardView with timer integration
    - On "Start Session": calls `startSession()` + `startTimer(intervalMinutes, showCheckInModal)`
    - On "End Session": calls `stopTimer()` + `endSession()` + refreshes data
    - Shows check-in modal when timer fires
    - On check-in complete: refreshes dashboard data
    - Prevents duplicate timers (check isRunning before start)
  - Wire visibility API: when tab becomes visible, check if check-in is overdue
  - Write tests: session start/stop triggers timer, timer fires shows modal
  - Run tests → GREEN

  **Must NOT do**:
  - Do not allow starting a second session while one is active
  - Do not lose timer state on page re-render (persist to React state)
  - Do not implement browser notifications (defer to future enhancement)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Session-timer-modal integration, state coordination, UX flow

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 38-40, 42)
  - **Blocks**: Task 42
  - **Blocked By**: Tasks 36, 37, 38

  **References**:
  - `apps/web/src/features/core-hour/timer/timer-service.ts` (Task 36) — Timer service
  - `apps/web/src/features/core-hour/stores/use-session.ts` (Task 37) — Session hooks
  - `apps/web/src/features/core-hour/components/check-in-modal.tsx` (Task 38) — Modal component
  - `D:\documents\code\git\release\CoreHour\src\App.tsx` — Original tray event integration pattern

  **Acceptance Criteria**:
  - [ ] Click "Start Session" → timer starts, session created in DB
  - [ ] Timer fires after N minutes → check-in modal appears
  - [ ] Check-in confirmed → modal closes, dashboard updates
  - [ ] Check-in skipped → modal closes, skip recorded
  - [ ] Click "End Session" → timer stops, session closed in DB
  - [ ] Cannot start second session while one active
  - [ ] Tests: full flow integration test

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full session timer flow (sped up for test)
    Tool: Playwright
    Preconditions: Mock DB, timer interval set to 0.1 minutes (6 seconds) for test
    Steps:
      1. Click "Start Session"
      2. Assert: timer running, session active indicator visible
      3. Wait 6+ seconds for timer to fire
      4. Assert: check-in modal appears
      5. Fill percentages to 100%, click Confirm
      6. Assert: modal closes, check-in recorded
      7. Click "End Session"
      8. Assert: session ended, timer stopped
    Expected Result: Full flow from start to end with check-in
    Failure Indicators: Modal doesn't appear, timer doesn't fire, state mismatch
    Evidence: .omo/evidence/task-41-session-flow.png
  ```

  **Evidence to Capture**:
  - [ ] task-41-session-flow.png — each stage of the flow

  **Commit**: YES (groups with Wave 7)
  - Message: `feat(core-hour): integrate timer with session flow and check-in trigger`
  - Files: `apps/web/src/features/core-hour/components/session-controller.tsx`, tests
  - Pre-commit: `pnpm test -- core-hour`

- [x] 42. CH Playwright e2e: auth + session + check-in + history

  **What to do**:
  - Create `apps/web/e2e/core-hour/` directory with Playwright e2e specs:
    - `session-lifecycle.spec.ts` — start session, timer fires, check-in modal, end session
    - `tag-management.spec.ts` — create tag, rename, change color, archive
    - `check-in-flow.spec.ts` — check-in with percentages, skip, validation
    - `history.spec.ts` — view past sessions, verify data
  - All tests use mock auth + mock DB (E2E_MOCK_DB=true)
  - Use sped-up timer interval (0.1 min = 6 seconds) for timer tests
  - Verify: cross-page navigation within CoreHour works
  - Run all CH e2e tests → all must pass

  **Must NOT do**:
  - Do not test actual Supabase (mock only)
  - Do not use real timer intervals in tests (use mock/sped-up)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-spec e2e suite with timer simulation, tag CRUD, check-in flow

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 38-41)
  - **Blocks**: Task 43
  - **Blocked By**: Tasks 16, 38, 39, 40, 41

  **References**:
  - `apps/web/playwright.config.ts` (Task 16) — E2E config
  - `apps/web/e2e/charger-reminder/` (Task 31) — E2E test patterns to follow
  - Task 41 session controller — Timer integration for test setup

  **Acceptance Criteria**:
  - [ ] 4 e2e spec files created
  - [ ] Session lifecycle: start → check-in → end all verified
  - [ ] Tag management: CRUD + archive verified
  - [ ] Check-in flow: validation, submit, skip verified
  - [ ] History: past sessions display verified
  - [ ] `pnpm test:e2e -- core-hour/` → all pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full CH e2e suite passes
    Tool: Bash (pwsh)
    Steps:
      1. pnpm test:e2e -- --project=chromium core-hour/
    Expected Result: All tests pass, exit 0
    Evidence: .omo/evidence/task-42-ch-e2e-results.txt
  ```

  **Evidence to Capture**:
  - [ ] task-42-ch-e2e-results.txt — full Playwright output

  **Commit**: YES (groups with Wave 7)
  - Message: `feat(core-hour): add Playwright e2e test suite`
  - Files: `apps/web/e2e/core-hour/**`
  - Pre-commit: `pnpm test:e2e -- core-hour/`

- [x] 43. Cross-tool auth verification + navigation tests

  **What to do**:
  - Create `apps/web/e2e/cross-tool/` directory:
    - `auth-persistence.spec.ts` — sign in, navigate between tools, verify still authenticated
    - `navigation.spec.ts` — sidebar navigation: click each tool, verify page loads
    - `deep-link.spec.ts` — direct URL access to tools
  - Test: sign in → go to CR → go to CH → go back to CR (no re-auth)
  - Test: sign out from one tool → redirected to sign-in → other tool also requires re-auth
  - Test: sidebar shows correct active tool on navigation
  - Run all cross-tool e2e tests → pass

  **Must NOT do**:
  - Do not mock auth per-tool (use shared mock auth cookie)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Cross-tool integration testing, auth state verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 8 (with Tasks 44, 45)
  - **Blocks**: Task 44
  - **Blocked By**: Tasks 31, 42

  **References**:
  - `apps/web/e2e/charger-reminder/auth.spec.ts` (Task 31) — Auth test patterns
  - `apps/web/src/lib/auth/session.ts` (Task 15) — Session guard
  - `apps/web/e2e/mocks/` — Mock auth helpers

  **Acceptance Criteria**:
  - [ ] Sign in once → both tools accessible without re-auth
  - [ ] Sign out → all tools redirect to sign-in
  - [ ] Sidebar shows correct active tool on navigation
  - [ ] Deep-link to tool route works when authenticated
  - [ ] Deep-link redirects to sign-in when unauthenticated

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Cross-tool auth persistence
    Tool: Playwright
    Steps:
      1. Sign in with mock auth
      2. Navigate to /tools/charger-reminder → assert: page loads (200)
      3. Navigate to /tools/core-hour → assert: page loads (200), no redirect to sign-in
      4. Navigate back to /tools/charger-reminder → assert: still authenticated
      5. Sign out
      6. Navigate to /tools/core-hour → assert: redirected to /sign-in
    Expected Result: Single auth session works across all tools
    Evidence: .omo/evidence/task-43-cross-auth.png
  ```

  **Evidence to Capture**:
  - [ ] task-43-cross-auth.png — multiple page loads after single sign-in

  **Commit**: YES (groups with Wave 8)
  - Message: `feat(integration): add cross-tool auth and navigation e2e tests`
  - Files: `apps/web/e2e/cross-tool/**`
  - Pre-commit: `pnpm test:e2e -- cross-tool/`

- [x] 44. Tool registry e2e + lazy-load + UI consistency

  **What to do**:
  - Create `apps/web/e2e/tool-registry/` directory:
    - `registry-loading.spec.ts` — tool components lazy-load on first navigation
    - `dashboard.spec.ts` — dashboard shows both tools, cards link correctly
  - Audit UI consistency across tools:
    - Check: same font families, same color variables, same spacing scale
    - Check: both tools use shared Card, Button, Modal from @memo/ui
    - Check: responsive behavior consistent (sidebar collapses on mobile)
    - Fix any inconsistencies found
  - Verify: `pnpm build` has correct bundle splitting (each tool in separate chunk)
  - Run tests → pass

  **Must NOT do**:
  - Do not redesign either tool's components
  - Do not add features to either tool

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual consistency audit, lazy-load verification, responsive testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 8 (with Tasks 43, 45)
  - **Blocks**: Task 45
  - **Blocked By**: Tasks 20, 43

  **References**:
  - `apps/web/src/lib/tool-registry/discovery.ts` (Task 19) — Lazy loading mechanism
  - `apps/web/app/globals.css` (Task 7) — Design tokens
  - `@memo/ui` components (Tasks 5, 8)

  **Acceptance Criteria**:
  - [ ] Dashboard e2e: both tools visible, cards navigate correctly
  - [ ] Lazy-load: first navigation to tool shows loading state, then renders
  - [ ] Both tools use shared design tokens (fonts, colors, spacing)
  - [ ] Responsive: mobile sidebar overlay works for both tools
  - [ ] Production build: separate chunks per tool

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Dashboard shows all registered tools
    Tool: Playwright
    Preconditions: Both CR and CH registered
    Steps:
      1. Navigate to /dashboard
      2. Assert: 2 cards visible with "Charger Reminder" and "Core Hour" text
      3. Click "Charger Reminder" card → navigate to /tools/charger-reminder
    Expected Result: Dashboard reflects registry state
    Evidence: .omo/evidence/task-44-dashboard-tools.png
  ```

  **Evidence to Capture**:
  - [ ] task-44-dashboard-tools.png — dashboard with both tools

  **Commit**: YES (groups with Wave 8)
  - Message: `feat(integration): add tool registry e2e and UI consistency audit`
  - Files: `apps/web/e2e/tool-registry/**`, UI fixes if any
  - Pre-commit: `pnpm test:e2e`

- [x] 45. Bundle optimization + build verification

  **What to do**:
  - Configure `apps/web/next.config.ts`:
    - Enable `output: 'standalone'` for Vercel deployment
    - Configure `experimental.optimizePackageImports` for @memo/shared, @memo/ui
    - Ensure tool features are code-split with `dynamic(() => import(...))`
  - Run `pnpm build` → verify zero errors, zero warnings
  - Analyze bundle: verify each tool is in separate chunk
  - Verify Vercel deployment: `npx vercel --prod` (or deployment check)
  - Run `pnpm typecheck` → verify zero type errors
  - Run all tests one final time: `pnpm test && pnpm test:e2e`

  **Must NOT do**:
  - Do not add unnecessary optimizations (no bundle analyzer deps)
  - Do not change tool import patterns (they already use dynamic)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Build config verification + final test run

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 8 (with Tasks 43, 44)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 44

  **References**:
  - `D:\documents\code\git\release\Charger-Reminder\next.config.ts` — Next.js config pattern
  - Vercel deployment: https://vercel.com/docs/deployments/overview

  **Acceptance Criteria**:
  - [ ] `pnpm build` succeeds with zero errors
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm test` passes (all vitest suites)
  - [ ] `pnpm test:e2e` passes (all playwright suites)
  - [ ] Bundle analysis shows separate chunks per tool

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Production build succeeds
    Tool: Bash (pwsh)
    Steps:
      1. pnpm build 2>&1
      2. Assert: exit code 0
      3. Assert: output contains "✓ Compiled successfully"
    Expected Result: Clean production build
    Failure Indicators: Build errors, type errors, warnings
    Evidence: .omo/evidence/task-45-build-output.txt

  Scenario: All tests pass on final run
    Tool: Bash (pwsh)
    Steps:
      1. pnpm test -- --run
      2. Assert: exit code 0, all tests pass
    Expected Result: Zero test failures
    Evidence: .omo/evidence/task-45-test-results.txt
  ```

  **Evidence to Capture**:
  - [ ] task-45-build-output.txt — build output
  - [ ] task-45-test-results.txt — full test results

  **Commit**: YES (groups with Wave 8)
  - Message: `chore(build): optimize bundle splitting, verify build and all tests`
  - Files: `apps/web/next.config.ts`
  - Pre-commit: `pnpm build && pnpm test && pnpm test:e2e`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Never mark F1-F4 as checked before getting user's okay.**

- [~] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [~] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [~] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-tool integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [~] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(workspace): initialize pnpm monorepo with shared packages and Next.js scaffold` — all Wave 1 files
- **Wave 2**: `feat(auth): add Supabase SSR helpers, migrations, and magic-link auth` — auth + DB files
- **Wave 3**: `feat(shell): add sidebar layout, tool registry, and dashboard` — shell + registry files
- **Wave 4**: `feat(charger-reminder): migrate core business logic and database layer` — CR feature dir
- **Wave 5**: `feat(charger-reminder): migrate UI components, pages, and e2e tests` — CR UI files
- **Wave 6**: `feat(core-hour): convert to web — database layer and timer system` — CH feature dir
- **Wave 7**: `feat(core-hour): convert to web — UI components, pages, and e2e tests` — CH UI files
- **Wave 8**: `feat(integration): cross-tool verification, polish, and build optimization` — integration files
- **Wave FINAL**: `chore(verify): final review wave — all agents approve` — evidence + fixes

---

## Success Criteria

### Verification Commands
```bash
pnpm install                    # Expected: installs all workspace packages
pnpm dev                        # Expected: Next.js starts on localhost:3000
pnpm lint                       # Expected: zero errors
pnpm typecheck                  # Expected: zero type errors
pnpm test                       # Expected: all Vitest suites pass
pnpm test:e2e                   # Expected: all Playwright suites pass
pnpm build                      # Expected: successful production build
```

### Final Checklist
- [ ] All "Must Have" items present and verified
- [ ] All "Must NOT Have" items absent (no Tauri, no email/password, no offline SQLite)
- [ ] All Vitest tests pass (both tools + shared packages)
- [ ] All Playwright e2e tests pass
- [ ] Vercel deployment successful
- [ ] User explicitly approves F1-F4 results
