# Desktop-Only Cleanup

## TL;DR

> **Quick Summary**: Remove all Docker/web distribution artifacts, archive the web app entirely, rebuild documentation for desktop-only distribution, and rewrite the CI release workflow for Tauri desktop builds.
>
> **Deliverables**:
> - Deleted: `apps/web/`, `scripts/`, `release/`, `supabase/migrations/`
> - Edited: `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
> - Created: `docs/Installation.md`, `docs/adr/0001-desktop-only-distribution.md`, `docs/CONTEXT.md`
> - Rewritten: `.github/workflows/release.yml`
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Wave 1 deletions → Wave 2 doc edits (parallel) → Wave 3 CI rewrite + final review

---

## Context

### Original Request
"Sisyphus has thrown these questions, figure it out. My direction is to remove Docker entirely and only release desktop builds. The whole doc system needs rebuild, also the scripts."

### Interview Summary
**Key Decisions** (6 questions resolved via grill-with-docs):
1. **Web app status → B: Archive web entirely** — delete `apps/web/`, desktop is sole product
2. **scripts/ → Delete entirely** — all Docker/Supabase-dependent, zero desktop relevance
3. **release.yml → Rewrite for Tauri** — build matrix (.msi/.dmg/.AppImage), GitHub Release upload
4. **Documentation rebuild** — edit 5 existing docs, create 3 new docs, delete `release/README.md`
5. **supabase/migrations/ → Delete** — clean break, desktop has own SQLite DDL
6. **ADR + CONTEXT.md → Yes** — capture the decision and build domain glossary

**Pre-existing state**:
- Docker files (`Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker`, `.docker/`, `scripts/docker-entrypoint.sh`) already deleted in commit `cfc63a3`
- `pnpm-workspace.yaml` uses `apps/*` glob — no change needed after `apps/web/` deletion

### Metis Review
Metis unavailable (infrastructure timeout). Gap identified manually:
- ~~`pnpm-workspace.yaml` needs updating~~ — RESOLVED: uses `apps/*` glob, self-adjusting

---

## Work Objectives

### Core Objective
Remove every trace of Docker/web distribution from the monorepo and rebuild the documentation system for a desktop-only Tauri product.

### Concrete Deliverables
- Deleted: `apps/web/` (all source, 284 unit tests, 53 E2E specs), `scripts/` (6 files), `release/` directory, `supabase/migrations/` (3 SQL files)
- Edited: `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- Created: `docs/Installation.md`, `docs/adr/0001-desktop-only-distribution.md`, `docs/CONTEXT.md`
- Rewritten: `.github/workflows/release.yml` (Tauri build matrix → GitHub Release)

### Definition of Done
- [ ] `apps/web/`, `scripts/`, `release/`, `supabase/migrations/` no longer exist on disk
- [ ] `pnpm install` exits 0 (no broken workspace references)
- [ ] `pnpm typecheck` exits 0 (only desktop + packages checked)
- [ ] `pnpm test` exits 0 (only desktop + packages tests pass)
- [ ] Zero Docker/Supabase references in any documentation file
- [ ] `docs/Installation.md` provides a complete, verifiable desktop setup guide
- [ ] `.github/workflows/release.yml` builds Tauri artifacts on push of `v*` tag

### Must Have
- All Docker/web artifacts deleted without breaking the desktop app or shared packages
- Documentation is internally consistent (no mention of deleted features)
- CI workflow builds desktop installers from tags

### Must NOT Have (Guardrails)
- Do NOT modify `apps/desktop/` source code (including `src-tauri/migrations/`)
- Do NOT modify `packages/shared/` or `packages/ui/` source code
- Do NOT modify `.gitignore`
- Do NOT introduce new top-level dependencies
- Do NOT touch `supabase/` directory outside `migrations/` (if `supabase/` has other files)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (desktop + packages have tests)
- **Automated tests**: None (no new code to unit-test)
- **Framework**: N/A
- **QA**: Agent-executed QA for all tasks

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.txt`.

- **Verification**: Use Bash (`pnpm install`, `pnpm typecheck`, `pnpm test`, `git status`, grep) for all tasks
- **Doc quality**: Manual spot-check of edited files for consistency

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — deletions, MAX PARALLEL):
├── Task 1: Delete apps/web/ directory [quick]
├── Task 2: Delete scripts/ directory [quick]
├── Task 3: Delete release/ directory [quick]
└── Task 4: Delete supabase/migrations/ directory [quick]

Wave 2 (After Wave 1 — doc edits, MAX PARALLEL):
├── Task 5: Edit README.md + Create docs/Installation.md [writing]
├── Task 6: Edit ARCHITECTURE.md [writing]
├── Task 7: Edit AGENTS.md [writing]
├── Task 8: Edit CONTRIBUTING.md [writing]
├── Task 9: Edit CHANGELOG.md [writing]
└── Task 10: Create docs/adr/0001-desktop-only-distribution.md [writing]

Wave 3 (After Wave 2 — CI + verification):
├── Task 11: Rewrite .github/workflows/release.yml [deep]
├── Task 12: Create docs/CONTEXT.md [writing]
└── Task 13: Verify pnpm install + typecheck + test pass [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1-4 → Task 5-10 → Task 11-13 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Agent Dispatch Summary

- **Wave 1**: 4 tasks → `quick` × 4
- **Wave 2**: 6 tasks → `writing` × 6
- **Wave 3**: 3 tasks → `deep` × 1, `writing` × 1, `quick` × 1
- **FINAL**: 4 tasks → `oracle` × 1, `unspecified-high` × 2, `deep` × 1

---

## TODOs

- [ ] 1. Delete apps/web/ directory

  **What to do**:
  - Delete the entire `apps/web/` directory recursively
  - Verify no files remain under `apps/web/`

  **Must NOT do**:
  - Do NOT touch `apps/desktop/`
  - Do NOT modify `pnpm-workspace.yaml` (uses `apps/*` glob, self-adjusting)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single directory deletion, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Deletion is a shell operation, git staging comes in separate commit task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5-10 (docs reference deleted paths)
  - **Blocked By**: None

  **References**:
  - `apps/web/` — current directory to verify exists before deletion
  - `apps/desktop/` — adjacent directory to verify untouched after deletion
  - `pnpm-workspace.yaml` — verify `apps/*` glob covers desktop after web removal

  **Acceptance Criteria**:
  - [ ] `Test-Path apps/web` returns `False` (directory does not exist)
  - [ ] `Test-Path apps/desktop` returns `True` (desktop untouched)
  - [ ] `Test-Path apps/desktop/src/features/charger-reminder` returns `True` (features intact)

  **QA Scenarios**:
  ```
  Scenario: Delete web app directory (happy path)
    Tool: Bash (pwsh)
    Preconditions: apps/web/ exists on disk; apps/desktop/ exists on disk
    Steps:
      1. Remove-Item -LiteralPath "apps/web" -Recurse -Force
      2. Test-Path -LiteralPath "apps/web" → must return False
      3. Test-Path -LiteralPath "apps/desktop" → must return True
      4. Test-Path -LiteralPath "apps/desktop/src-tauri" → must return True
    Expected Result: apps/web/ deleted, apps/desktop/ untouched
    Failure Indicators: apps/web/ still exists OR apps/desktop/ missing
    Evidence: .omo/evidence/task-1-delete-web.txt

  Scenario: Verify pnpm workspace still valid (failure/edge case)
    Tool: Bash (pwsh)
    Preconditions: apps/web/ deleted, pnpm-workspace.yaml unchanged
    Steps:
      1. pnpm install --frozen-lockfile
      2. Assert exit code 0
    Expected Result: pnpm resolves apps/desktop via apps/* glob, no errors
    Evidence: .omo/evidence/task-1-pnpm-install.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-1-delete-web.txt`: deletion confirmation + desktop integrity check
  - [ ] `task-1-pnpm-install.txt`: pnpm install output

  **Commit**: YES (groups with Tasks 2-4)
  - Message: `chore: delete web app, scripts, release, and supabase migrations`
  - Files: `apps/web/`, `scripts/`, `release/`, `supabase/migrations/`

- [ ] 2. Delete scripts/ directory

  **What to do**:
  - Delete the entire `scripts/` directory recursively
  - Verify no files remain

  **Must NOT do**:
  - Do NOT touch any scripts outside `scripts/` (none exist)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single directory deletion
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: None directly
  - **Blocked By**: None

  **References**:
  - `scripts/` — current contents: `setup.sh`, `setup.ps1`, `generate-keys.sh`, `init-supabase.sh`, `nginx/default.conf`, `postgres-init/00-schemas.sql`

  **Acceptance Criteria**:
  - [ ] `Test-Path scripts` returns `False`

  **QA Scenarios**:
  ```
  Scenario: Delete scripts directory (happy path)
    Tool: Bash (pwsh)
    Preconditions: scripts/ exists on disk
    Steps:
      1. Remove-Item -LiteralPath "scripts" -Recurse -Force
      2. Test-Path -LiteralPath "scripts" → must return False
    Expected Result: scripts/ deleted
    Evidence: .omo/evidence/task-2-delete-scripts.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-2-delete-scripts.txt`: deletion confirmation

  **Commit**: YES (groups with Tasks 1, 3, 4)
  - Message: same group commit
  - Files: `scripts/`

- [ ] 3. Delete release/ directory

  **What to do**:
  - Delete the entire `release/` directory recursively
  - Currently contains only `README.md` (227 lines of Docker deployment instructions)

  **Must NOT do**:
  - Do NOT touch `release/` inside any other directory

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single directory deletion

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `release/README.md` — Docker deployment guide, no longer relevant

  **Acceptance Criteria**:
  - [ ] `Test-Path release` returns `False`

  **QA Scenarios**:
  ```
  Scenario: Delete release directory (happy path)
    Tool: Bash (pwsh)
    Preconditions: release/ exists on disk
    Steps:
      1. Remove-Item -LiteralPath "release" -Recurse -Force
      2. Test-Path -LiteralPath "release" → must return False
    Expected Result: release/ deleted
    Evidence: .omo/evidence/task-3-delete-release.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-3-delete-release.txt`: deletion confirmation

  **Commit**: YES (groups with Tasks 1, 2, 4)

- [ ] 4. Delete supabase/migrations/ directory

  **What to do**:
  - Delete `supabase/migrations/` and its 3 SQL files
  - Verify `supabase/` directory itself is empty or has no other content
  - If `supabase/` is empty after deletion, delete it too

  **Must NOT do**:
  - Do NOT delete `supabase/` if it contains files beyond `migrations/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Directory deletion with conditional cleanup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `supabase/migrations/` — 3 files: `001_cr_device_reminder.sql`, `002_cr_seed_presets.sql`, `003_ch_core_hour.sql`
  - `apps/desktop/src-tauri/migrations/` — desktop's equivalent SQLite DDL (NOT to be touched)
  - AGENTS.md constraint (will be updated in Task 7): "3 SQL files in supabase/migrations/ (do not delete or rewrite)" — constraint removed since web is archived

  **Acceptance Criteria**:
  - [ ] `Test-Path supabase/migrations` returns `False`
  - [ ] If `supabase/` is empty, `Test-Path supabase` returns `False`
  - [ ] `Test-Path apps/desktop/src-tauri/migrations` returns `True` (desktop DDL untouched)

  **QA Scenarios**:
  ```
  Scenario: Delete migrations and empty parent (happy path)
    Tool: Bash (pwsh)
    Preconditions: supabase/migrations/ exists with 3 .sql files; supabase/ may have other files
    Steps:
      1. Remove-Item -LiteralPath "supabase/migrations" -Recurse -Force
      2. Test-Path -LiteralPath "supabase/migrations" → must return False
      3. Get-ChildItem supabase/ — if empty, Remove-Item supabase -Force
      4. Test-Path -LiteralPath "apps/desktop/src-tauri/migrations" → must return True
    Expected Result: migrations deleted; supabase/ parent removed if empty; desktop migrations untouched
    Evidence: .omo/evidence/task-4-delete-migrations.txt

  Scenario: Verify desktop migrations survive (edge case)
    Tool: Bash (pwsh)
    Preconditions: Task 4 completed
    Steps:
      1. Get-ChildItem apps/desktop/src-tauri/migrations/ — must show 3 .sql files
      2. Assert filenames contain "0001", "0002", "0003"
    Expected Result: Desktop SQLite DDL intact
    Evidence: .omo/evidence/task-4-desktop-migrations-intact.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-4-delete-migrations.txt`: deletion confirmation + conditional supabase/ cleanup
  - [ ] `task-4-desktop-migrations-intact.txt`: desktop migration verification

  **Commit**: YES (groups with Tasks 1, 2, 3)

---

- [ ] 5. Edit README.md + Create docs/Installation.md

  **What to do**:
  - **README.md edits**:
    - Line 3: Change "remains available as a Docker-based fallback" → remove, state desktop is the ONLY distribution
    - Lines 84-106: Delete entire "Quick Start — Web App (Docker / Supabase fallback)" section
    - Line 106: Remove `release/README.md` reference
    - After Quick Start section, add: "For detailed setup instructions (Rust toolchain, platform-specific prerequisites, troubleshooting), see [docs/Installation.md](docs/Installation.md)."
    - Verify no other Docker/web references remain (lines 3, 35 already were updated in prior commits but double-check)
  - **Create docs/Installation.md**:
    - Prerequisites: Node.js ≥20, pnpm ≥9, Rust toolchain, platform-specific deps (MSVC/Xcode/build-essential + libwebkit2gtk)
    - Step-by-step: clone → `pnpm install` → `pnpm --filter desktop tauri:dev` (dev) / `pnpm --filter desktop tauri:build` (production)
    - Platform-specific notes: Windows (MSVC, WebView2), macOS (Xcode), Linux (libwebkit2gtk-4.1, libssl, libgtk-3)
    - Output locations: `.msi`/`.exe` (Windows), `.dmg` (macOS), `.AppImage`/`.deb`/`.rpm` (Linux)
    - Troubleshooting: first build slow (Rust compile), port conflicts (not relevant for desktop), Rust not found, missing system libs

  **Must NOT do**:
  - Do NOT change the Desktop Quick Start section structure (already good)
  - Do NOT mention Docker, Supabase, web app, Next.js in Installation.md

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation editing and creation, prose-heavy
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1, 4 (paths referenced must be deleted first, mental model updated)

  **References**:
  - `README.md:1-185` — current content, Docker references at lines 3, 84-106
  - `apps/desktop/README.md` — desktop README (if exists) for content to reference
  - `AGENTS.md:69-74` — dependency list for Rust + platform prerequisites
  - `ARCHITECTURE.md:158-204` — desktop architecture details for Installation.md content

  **Acceptance Criteria**:
  - [ ] README.md line 3 no longer says "Docker-based fallback"
  - [ ] README.md has no "Quick Start — Web App" section
  - [ ] README.md links to `docs/Installation.md`
  - [ ] `grep -i docker README.md` returns zero matches
  - [ ] `grep -i supabase README.md` returns zero matches (unless in Tech Stack table for reference — user choice)
  - [ ] `docs/Installation.md` exists with 4 sections: Prerequisites, Quick Start, Platform Notes, Troubleshooting
  - [ ] `docs/Installation.md` has zero Docker/Supabase mentions

  **QA Scenarios**:
  ```
  Scenario: README has no Docker/web references (happy path)
    Tool: Bash (grep)
    Preconditions: README.md edited
    Steps:
      1. Select-String -Path README.md -Pattern '(?i)docker' → must return empty
      2. Select-String -Path README.md -Pattern 'Web App' → must return empty
      3. Select-String -Path README.md -Pattern 'release/README.md' → must return empty
    Expected Result: Zero Docker/web references
    Evidence: .omo/evidence/task-5-readme-clean.txt

  Scenario: Installation.md is complete and Docker-free (happy path)
    Tool: Bash (grep)
    Preconditions: docs/Installation.md created
    Steps:
      1. Test-Path docs/Installation.md → must return True
      2. Select-String -Path docs/Installation.md -Pattern '(?i)docker' → must return empty
      3. Select-String -Path docs/Installation.md -Pattern 'tauri:dev' → must find match
      4. Select-String -Path docs/Installation.md -Pattern 'tauri:build' → must find match
    Expected Result: Installation.md exists, covers Tauri dev + build, no Docker
    Evidence: .omo/evidence/task-5-installation.md
  ```

  **Evidence to Capture**:
  - [ ] `task-5-readme-clean.txt`: grep results proving zero Docker/web refs
  - [ ] `task-5-installation.md`: existence + content check

  **Commit**: YES (groups with Tasks 6-10)
  - Message: `docs: rebuild documentation for desktop-only distribution`
  - Files: `README.md`, `docs/Installation.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/adr/0001-desktop-only-distribution.md`

- [ ] 6. Edit ARCHITECTURE.md

  **What to do**:
  - Keep sections 1 (Monorepo Layout) and 7 (Desktop App Architecture) — these are accurate
  - Remove or heavily condense sections 2-6 (Route Groups, Auth Flow, Tool Registry, Data Flow, Testing) — all web-only
  - Section 1: Remove "Two deployable surfaces" table (line 28-33) — only desktop now. Remove web from monorepo tree (line 10).
  - Section 7: Already accurate (desktop architecture). Keep intact.
  - Line 216: Remove "Docker image" from build output column in comparison table
  - Replace web architecture sections with a brief note: "The original web app (Next.js + Supabase) was archived in v0.1.0-desktop. See git history for its architecture."
  - Keep "Key Design Differences" table but remove Docker image mention
  - Target: ~100 lines (from current 216)

  **Must NOT do**:
  - Do NOT alter Section 7 (Desktop App Architecture) content
  - Do NOT remove shared packages section

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation condensation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7-10)

  **References**:
  - `ARCHITECTURE.md:1-216` — current content, web sections at 2-6 (lines 37-157), desktop at 7 (lines 158-216)

  **Acceptance Criteria**:
  - [ ] ARCHITECTURE.md is ≤120 lines (from 216)
  - [ ] Sections 1 and 7 preserved
  - [ ] No "Route Groups", "Auth Flow", "Data Flow", "Testing" section headers
  - [ ] `grep -i docker ARCHITECTURE.md` returns zero matches
  - [ ] "Key Design Differences" table shows desktop column only (or desktop + "Archived (Web)" if historical reference kept)

  **QA Scenarios**:
  ```
  Scenario: Architecture doc is condensed and Docker-free (happy path)
    Tool: Bash (grep)
    Preconditions: ARCHITECTURE.md edited
    Steps:
      1. Select-String -Path ARCHITECTURE.md -Pattern '(?i)docker' → must return empty
      2. Select-String -Path ARCHITECTURE.md -Pattern 'Route Groups' → must return empty
      3. Select-String -Path ARCHITECTURE.md -Pattern 'Desktop App Architecture' → must find match
      4. Get-Content ARCHITECTURE.md | Measure-Object -Line → ≤120 lines
    Expected Result: Clean, condensed, desktop-focused
    Evidence: .omo/evidence/task-6-architecture.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-6-architecture.txt`: grep + line count

  **Commit**: YES (groups with Tasks 5, 7-10)

---

- [ ] 7. Edit AGENTS.md

  **What to do**:
  - Line 7: Remove "Web app" line from Purpose section — desktop is sole surface
  - Lines 4-9 (Purpose): Rewrite to state desktop is the ONLY deployable surface
  - Line 14 (Context tree): Remove `apps/web/` entry
  - Lines 27-28: Remove web app description
  - Line 30 (Stack): Remove Supabase, Next.js SSR mentions. Keep: React 19, Tailwind v4, Vitest, Playwright, TypeScript strict, Node ≥20, pnpm ≥9
  - Lines 42-46 (Commands): Remove `pnpm dev`, `pnpm build`, `pnpm lint` (web-only). Keep desktop commands. Add `pnpm --filter desktop test`
  - Lines 48-51 (Path aliases): Remove `@/*` -> `apps/web/src/*` (no longer valid)
  - Lines 53-58 (Conventions): Remove `"use server"` convention, `e2e/` convention. Keep test mirroring, component composition.
  - Line 70 (Dependencies): Remove "For web development: Docker (for local Supabase), Supabase CLI"
  - Line 72: Remove `web` dependency line
  - Lines 74-75: Remove "Local services (web)" line
  - Line 75 (Schema): Remove "three SQL files in supabase/migrations/"
  - Constraint about not deleting supabase migrations: REMOVE (migrations are being deleted)

  **Must NOT do**:
  - Do NOT remove desktop stack details (lines 32-33)
  - Do NOT remove constraint about not coupling desktop to web features (line 66)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation editing with precise constraint compliance

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8-10)

  **References**:
  - `AGENTS.md:1-75` — current content with web-specific references

  **Acceptance Criteria**:
  - [ ] No `apps/web` reference in AGENTS.md
  - [ ] No Docker mention in AGENTS.md
  - [ ] No Supabase mention in AGENTS.md (except possibly as historical note)
  - [ ] `@/*` path alias removed
  - [ ] `"use server"` convention removed
  - [ ] Desktop commands preserved: `tauri:dev`, `tauri:build`, `build`, `typecheck`

  **QA Scenarios**:
  ```
  Scenario: AGENTS.md is desktop-only (happy path)
    Tool: Bash (grep)
    Preconditions: AGENTS.md edited
    Steps:
      1. Select-String -Path AGENTS.md -Pattern '(?i)docker' → must return empty
      2. Select-String -Path AGENTS.md -Pattern 'apps/web' → must return empty
      3. Select-String -Path AGENTS.md -Pattern 'use server' → must return empty
      4. Select-String -Path AGENTS.md -Pattern 'tauri:dev' → must find match
      5. Select-String -Path AGENTS.md -Pattern 'tauri:build' → must find match
    Expected Result: No web/Docker references, desktop commands present
    Evidence: .omo/evidence/task-7-agents.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-7-agents.txt`: grep results

  **Commit**: YES (groups with Tasks 5, 6, 8-10)

- [ ] 8. Edit CONTRIBUTING.md

  **What to do**:
  - Lines 9-10: Remove "Docker (for local Supabase)" and "Supabase CLI" from Prerequisites
  - Line 14: Keep Linux desktop deps, remove web-specific deps reference
  - Lines 22-24: Replace web app setup with desktop setup: `pnpm install` → `pnpm --filter desktop tauri:dev`
  - Line 27: Remove `# Start Supabase (Docker)` comment
  - Lines 35-41 (Workspace Layout): Remove `apps/web/` and `supabase/` entries
  - Lines 46-57 (Development Commands): Remove web-only commands. Keep desktop commands + test commands.
  - Lines 59-68 (Adding a New Tool): Replace `apps/web/src/features/<tool-id>/` with `apps/desktop/src/features/<tool-id>/`
  - Lines 72-77 (Code Conventions): Remove SSR/`"use server"` conventions. Keep path aliases for shared packages only.
  - Lines 83-85 (Testing): Keep test commands but note they apply to desktop + packages only

  **Must NOT do**:
  - Do NOT remove Rust toolchain prerequisites
  - Do NOT remove commit style section

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation rewrite

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-7, 9-10)

  **References**:
  - `CONTRIBUTING.md:1-99` — current content
  - `apps/desktop/src/features/charger-reminder/manifest.ts` — verify registration pattern for "Adding a New Tool" section
  - `apps/desktop/src/features/core-hour/manifest.ts` — second example

  **Acceptance Criteria**:
  - [ ] No Docker mention in CONTRIBUTING.md
  - [ ] No Supabase mention in CONTRIBUTING.md
  - [ ] No `apps/web` reference in CONTRIBUTING.md
  - [ ] "Adding a New Tool" section references `apps/desktop/src/features/`
  - [ ] Prerequisites section lists Rust toolchain + platform deps

  **QA Scenarios**:
  ```
  Scenario: CONTRIBUTING.md is desktop-only (happy path)
    Tool: Bash (grep)
    Preconditions: CONTRIBUTING.md edited
    Steps:
      1. Select-String -Path CONTRIBUTING.md -Pattern '(?i)docker' → must return empty
      2. Select-String -Path CONTRIBUTING.md -Pattern 'apps/web' → must return empty
      3. Select-String -Path CONTRIBUTING.md -Pattern 'apps/desktop/src/features' → must find match
      4. Select-String -Path CONTRIBUTING.md -Pattern 'tauri:dev' → must find match
    Expected Result: Desktop-focused contributing guide
    Evidence: .omo/evidence/task-8-contributing.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-8-contributing.txt`: grep results

  **Commit**: YES (groups with Tasks 5-7, 9-10)

- [ ] 9. Edit CHANGELOG.md

  **What to do**:
  - Line 20: Change "`apps/web/` remains available as a Docker-based legacy fallback" → "`apps/web/` has been archived; desktop is the sole distribution surface"
  - Lines 52-57: Edit v0.0.1 Distribution section — remove "Docker-only distribution", "one-click setup via setup.sh/setup.ps1", "GitHub Actions release pipeline pushes Docker image". Change to "Initial release with Charger-Reminder and CoreHour tools."
  - Verify v0.1.0-desktop section is accurate (it already describes the desktop transition)

  **Must NOT do**:
  - Do NOT delete or restructure the changelog format
  - Do NOT remove v0.0.1 entry entirely

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Targeted line edits

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-8, 10)

  **References**:
  - `CHANGELOG.md:1-60` — current content, problematic lines at 20, 52-57

  **Acceptance Criteria**:
  - [ ] Line 20 no longer says "Docker-based legacy fallback"
  - [ ] v0.0.1 Distribution section no longer says "Docker-only"
  - [ ] v0.0.1 no longer references `setup.sh`/`setup.ps1`
  - [ ] v0.1.0-desktop section unchanged (already accurate)

  **QA Scenarios**:
  ```
  Scenario: Changelog is Docker-free (happy path)
    Tool: Bash (grep)
    Preconditions: CHANGELOG.md edited
    Steps:
      1. Select-String -Path CHANGELOG.md -Pattern '(?i)docker' → must return empty
      2. Select-String -Path CHANGELOG.md -Pattern 'v0.1.0-desktop' → must find match (section preserved)
      3. Select-String -Path CHANGELOG.md -Pattern 'archived' → must find match (new wording)
    Expected Result: Docker references removed, desktop changelog intact
    Evidence: .omo/evidence/task-9-changelog.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-9-changelog.txt`: grep results

  **Commit**: YES (groups with Tasks 5-8, 10)

---

- [ ] 10. Create docs/adr/0001-desktop-only-distribution.md

  **What to do**:
  - Create `docs/adr/` directory
  - Write ADR following the grill-with-docs format:
    1. **Title**: ADR 0001: Desktop-Only Distribution
    2. **Status**: Accepted
    3. **Context**: EfficiencyMemo originally shipped as a Docker-based web app (v0.0.1). Tauri v2 desktop support was added in v0.1.0-desktop. Maintaining two deployable surfaces doubled maintenance burden.
    4. **Decision**: Remove Docker/web distribution entirely. Ship only Tauri desktop builds (.msi/.dmg/.AppImage). Archive apps/web/ source code. Delete all Docker/Supabase-dependent infrastructure.
    5. **Rationale**: Desktop app is local-first, offline-capable, fits personal productivity use case better. Single surface simplifies CI, documentation, onboarding.
    6. **Trade-offs**: Lost web accessibility + Supabase auth; gained simpler maintenance + no Docker dependency.
    7. **Consequences**: Docs rewritten for desktop-only. CI builds Tauri installers. Web app in git history if needed.

  **Must NOT do**:
  - Do NOT make the ADR longer than ~60 lines
  - Do NOT over-explain the web architecture (refer to git history)

  **Recommended Agent Profile**:
  - **Category**: `writing` — structured technical writing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-9)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 4 (context established)

  **References**:
  - `.omo/drafts/desktop-only-cleanup.md` — decisions made during grill-with-docs
  - `CHANGELOG.md:5-29` — v0.1.0-desktop changes for timeline

  **Acceptance Criteria**:
  - [ ] `docs/adr/0001-desktop-only-distribution.md` exists
  - [ ] Has: Title, Status, Context, Decision, Rationale, Trade-offs, Consequences sections
  - [ ] Status is "Accepted"

  **QA Scenarios**:
  ```
  Scenario: ADR is complete (happy path)
    Tool: Bash
    Preconditions: docs/adr/ created
    Steps:
      1. Test-Path docs/adr/0001-desktop-only-distribution.md → True
      2. Select-String 'Status.*Accepted' → found
      3. Select-String 'Trade-offs' → found
      4. Measure-Object -Line → ≤60 lines
    Expected Result: Well-structured ADR
    Evidence: .omo/evidence/task-10-adr.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-10-adr.txt`: existence + section check

  **Commit**: YES (groups with Tasks 5-9)

---

- [ ] 11. Rewrite .github/workflows/release.yml for Tauri desktop

  **What to do**:
  - Replace the entire workflow with a Tauri desktop build + release pipeline
  - **test job** (keep): Run `pnpm --filter desktop typecheck` + `pnpm --filter desktop test` (if desktop has test script) + `pnpm --filter @memo/shared test`
  - **build job** (new): Matrix build on Windows (msi), macOS (dmg), Ubuntu (AppImage/deb/rpm)
    - Install Rust via `dtolnay/rust-toolchain@stable`
    - Install pnpm + deps
    - Run `pnpm --filter desktop tauri:build`
    - Upload artifacts
  - **release job** (rewrite): Download all artifacts, publish to GitHub Release via `softprops/action-gh-release@v2`
  - Remove: `docker/setup-buildx-action`, `docker/login-action`, `docker/metadata-action`, `docker/build-push-action`
  - Remove: `cp docker-compose.yml`, `cp .env.docker`, `cp -r scripts`
  - Remove: Docker build args (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - Add: Tauri-specific env vars if needed (TAURI_SIGNING_PRIVATE_KEY, etc. — optional for unsigned builds)

  **Must NOT do**:
  - Do NOT remove the `softprops/action-gh-release@v2` step (still needed for GitHub Release)
  - Do NOT remove the `on: push: tags: ['v*']` trigger

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex CI rewrite with matrix builds, Rust toolchain setup, artifact management
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — CI file rewrite, no git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 12, 13 — can run in parallel with each other but not with Wave 2 docs)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 1-4 (deletions complete, mental model updated)

  **References**:
  - `.github/workflows/release.yml:1-100` — current Docker-based workflow to replace
  - `apps/desktop/src-tauri/tauri.conf.json` — bundle config for artifact paths
  - `apps/desktop/package.json` — check for `test` script existence
  - Tauri CI docs: `https://tauri.app/v2/guides/building/cross-platform` — CI matrix patterns

  **Acceptance Criteria**:
  - [ ] `release.yml` has zero Docker references (`docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action`, `./Dockerfile`)
  - [ ] `release.yml` has `tauri:build` step
  - [ ] `release.yml` has matrix strategy with `os: [windows-latest, macos-latest, ubuntu-latest]`
  - [ ] `release.yml` uploads build artifacts via `softprops/action-gh-release@v2`
  - [ ] `release.yml` triggers on `v*` tags

  **QA Scenarios**:
  ```
  Scenario: release.yml is Docker-free and Tauri-ready (happy path)
    Tool: Bash (grep)
    Preconditions: release.yml rewritten
    Steps:
      1. Select-String -Path .github/workflows/release.yml -Pattern '(?i)docker' → must return empty
      2. Select-String -Path .github/workflows/release.yml -Pattern 'tauri:build' → must find match
      3. Select-String -Path .github/workflows/release.yml -Pattern 'strategy' → must find match
      4. Select-String -Path .github/workflows/release.yml -Pattern 'action-gh-release' → must find match
    Expected Result: Tauri CI pipeline with matrix builds
    Evidence: .omo/evidence/task-11-release-yml.txt

  Scenario: release.yml validates syntactically (edge case)
    Tool: Bash
    Preconditions: release.yml rewritten
    Steps:
      1. Use any YAML linter or manual inspection — check for valid YAML structure
      2. Verify `on.push.tags` is `['v*']`
      3. Verify `jobs.test`, `jobs.build`, `jobs.release` all present
    Expected Result: Valid YAML, no syntax errors
    Evidence: .omo/evidence/task-11-release-yml-syntax.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-11-release-yml.txt`: grep results
  - [ ] `task-11-release-yml-syntax.txt`: structure verification

  **Commit**: YES (separate)
  - Message: `ci: rewrite release workflow for Tauri desktop builds`
  - Files: `.github/workflows/release.yml`

- [ ] 12. Create docs/CONTEXT.md

  **What to do**:
  - Create `docs/CONTEXT.md` — a pure glossary, per grill-with-docs format
  - Domain terms to define:
    - **Desktop Surface** — the Tauri v2 app (`apps/desktop/`), the ONLY deployable surface
    - **Tool** — a self-contained productivity feature (e.g., Charger-Reminder, CoreHour)
    - **Feature Copy** — an independent copy of a tool's UI/logic in `apps/desktop/src/features/` (not a symlink)
    - **Shared Package** — cross-cutting code in `packages/shared/` (types) and `packages/ui/` (components)
    - **Tool Registry** — the pattern where features self-register via `index.ts` → `manifest.ts` + `component-loader.ts`
    - **WebDAV Sync** — manual backup/restore to a WebDAV server (Strategy A: per-device folders, last-write-wins)
    - **Local Auth** — single-user desktop auth with no passwords, stored in OS keychain
    - **SQLite Storage** — local database via `tauri-plugin-sql`, migrations in `src-tauri/migrations/`
    - **Archived Surface** — the original `apps/web/` Next.js + Supabase web app (removed in v0.1.0-desktop)

  **Must NOT do**:
  - Do NOT include implementation details (no code snippets, no file paths beyond what's needed for disambiguation)
  - Do NOT make it a spec or roadmap — pure glossary

  **Recommended Agent Profile**:
  - **Category**: `writing` — glossary creation from domain knowledge
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13)
  - **Blocks**: None
  - **Blocked By**: Tasks 5-10 (docs establish the language)

  **References**:
  - `ARCHITECTURE.md:158-204` — desktop architecture for accurate terminology
  - `.omo/drafts/desktop-only-cleanup.md` — domain terms discussed in interview

  **Acceptance Criteria**:
  - [ ] `docs/CONTEXT.md` exists
  - [ ] Contains ≤9 glossary entries
  - [ ] Each entry has a one-line definition, no implementation details
  - [ ] "Archived Surface" entry documents the web app's removal

  **QA Scenarios**:
  ```
  Scenario: CONTEXT.md is a clean glossary (happy path)
    Tool: Bash
    Preconditions: docs/CONTEXT.md created
    Steps:
      1. Test-Path docs/CONTEXT.md → True
      2. Select-String 'Desktop Surface' → found
      3. Select-String 'Archived Surface' → found
      4. Select-String 'Tool Registry' → found
    Expected Result: Complete glossary covering all key terms
    Evidence: .omo/evidence/task-12-context.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-12-context.txt`: existence + key terms check

  **Commit**: YES (groups with Task 13)
  - Message: `docs: add CONTEXT.md glossary and verify workspace integrity`
  - Files: `docs/CONTEXT.md`

- [ ] 13. Verify workspace integrity

  **What to do**:
  - Run `pnpm install` — must exit 0 (workspace resolves via `apps/*` glob)
  - Run `pnpm typecheck` — must exit 0 (only desktop + packages checked)
  - Run `pnpm test` — must exit 0 (only desktop + packages tests pass)
  - Check `pnpm-workspace.yaml` is unchanged (still `apps/*` + `packages/*`)
  - Verify no stale references to deleted paths in any config file

  **Must NOT do**:
  - Do NOT modify `pnpm-workspace.yaml` unless install fails

  **Recommended Agent Profile**:
  - **Category**: `quick` — command verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1-4 (deletions), Task 5 (README), Tasks 11-12

  **References**:
  - `pnpm-workspace.yaml` — verify `apps/*` glob is unchanged
  - `package.json` — root scripts (typecheck, test)
  - `apps/desktop/package.json` — desktop scripts

  **Acceptance Criteria**:
  - [ ] `pnpm install --frozen-lockfile` exits 0
  - [ ] `pnpm typecheck` exits 0
  - [ ] `pnpm test` exits 0 (desktop + packages tests pass)

  **QA Scenarios**:
  ```
  Scenario: Full workspace health check (happy path)
    Tool: Bash
    Preconditions: All deletions and doc edits complete
    Steps:
      1. pnpm install --frozen-lockfile → exit 0
      2. pnpm typecheck → exit 0
      3. pnpm test → exit 0
      4. git status → no unexpected dirty files
    Expected Result: Clean workspace, all checks pass
    Evidence: .omo/evidence/task-13-workspace-health.txt

  Scenario: No stale references in configs (edge case)
    Tool: Bash (grep)
    Preconditions: Task 13 completed
    Steps:
      1. Select-String -Path pnpm-workspace.yaml -Pattern 'apps/\*' → found (unchanged glob)
      2. Select-String -Path package.json -Pattern 'apps/web' → must return empty
    Expected Result: No config references to deleted paths
    Evidence: .omo/evidence/task-13-stale-refs.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-13-workspace-health.txt`: install + typecheck + test output
  - [ ] `task-13-stale-refs.txt`: config file grep

  **Commit**: YES (groups with Task 12)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (check deleted dirs gone, docs edited, CI rewritten). For each "Must NOT Have": search for forbidden patterns (Docker references in docs, modified desktop source). Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Review all changed files for: stale web references, broken links, inconsistent terminology across docs, leftover Docker/Supabase mentions. Check CI workflow YAML validity. Verify no accidental deletions beyond scope.
  Output: `Docs [N clean/N issues] | CI [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test: `pnpm install` exits 0, `pnpm typecheck` exits 0, `pnpm test` exits 0, no Docker refs in any doc file, `docs/Installation.md` has complete setup guide. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Tasks 1-4**: `chore: delete web app, scripts, release, and supabase migrations`
  - Files: `apps/web/` (all), `scripts/` (all), `release/` (all), `supabase/migrations/` (all)
  - Pre-commit: verify desktop dirs intact

- **Tasks 5-10**: `docs: rebuild documentation for desktop-only distribution`
  - Files: `README.md`, `docs/Installation.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/adr/0001-desktop-only-distribution.md`
  - Pre-commit: grep for Docker references → zero results

- **Task 11 (CI, separate)**: `ci: rewrite release workflow for Tauri desktop builds`
  - Files: `.github/workflows/release.yml`
  - Pre-commit: manual YAML validation + grep for Docker references → zero results

- **Tasks 12-13**: `docs: add CONTEXT.md glossary and verify workspace integrity`
  - Files: `docs/CONTEXT.md`
  - Pre-commit: `pnpm install && pnpm typecheck && pnpm test`

---

## Success Criteria

### Verification Commands
```bash
# Deletions confirmed
Test-Path apps/web     # Expected: False
Test-Path scripts      # Expected: False
Test-Path release      # Expected: False
Test-Path supabase/migrations  # Expected: False

# Docs are clean
Select-String -Path README.md,ARCHITECTURE.md,AGENTS.md,CONTRIBUTING.md,CHANGELOG.md -Pattern '(?i)docker'  # Expected: zero matches

# New docs exist
Test-Path docs/Installation.md                           # Expected: True
Test-Path docs/adr/0001-desktop-only-distribution.md     # Expected: True
Test-Path docs/CONTEXT.md                                # Expected: True

# Workspace health
pnpm install --frozen-lockfile  # Expected: exit 0
pnpm typecheck                  # Expected: exit 0
pnpm test                       # Expected: exit 0

# CI workflow
Select-String -Path .github/workflows/release.yml -Pattern 'tauri:build'  # Expected: found
Select-String -Path .github/workflows/release.yml -Pattern '(?i)docker'   # Expected: zero matches
```

### Final Checklist
- [ ] All Docker/web artifacts deleted without breaking desktop app
- [ ] All documentation is internally consistent (zero Docker/Supabase/Web App mentions)
- [ ] `pnpm install`, `pnpm typecheck`, `pnpm test` all exit 0
- [ ] `release.yml` builds Tauri artifacts from `v*` tags
- [ ] `docs/Installation.md` provides complete desktop setup guide
- [ ] `docs/CONTEXT.md` defines all domain terms
- [ ] ADR captures the decision for future contributors

