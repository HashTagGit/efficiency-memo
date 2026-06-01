# Post-Foundation Cleanup & Localization

## TL;DR

> **Quick Summary**: Prepare the EfficiencyMemo project for standalone local development by initializing git tracking, switching from remote Supabase to Supabase CLI (local Docker Postgres + Auth), generating hierarchical AGENTS.md documentation, removing migrated sibling directories, and researching external project patterns for future features.
>
> **Deliverables**:
> - Git repository initialized with `.gitignore` and initial commit
> - Local Supabase CLI setup (Docker Postgres + Auth), migrations applied
> - Hierarchical AGENTS.md (6 files: root + 3 packages + 2 features)
> - Old sibling directories (Charger-Reminder, CoreHour) removed
> - Research report on TimeTracker + PawPal adoptable patterns
>
> **Estimated Effort**: Medium
> **Parallel Execution**: Partial — Pre-flight + 3 parallel ops tasks, then sequential setup
> **Critical Path**: Pre-flight → Task 2 (.gitignore) → Task 3 (git init) → Task 4 (commit) → Task 5 (Supabase local) → Final Verification

- [~] 1. Pre-flight: verify prerequisites (tools + ports) — BLOCKED: supabase CLI and Docker not installed. User decision needed on installation approach.

  **What to do**:
  - Check `git --version` — must be installed
  - Check `supabase --version` — must be installed (if not, install via `npm i -g supabase`)
  - Check `docker info` — Docker must be running
  - Check `node --version` — Node.js must be installed
  - Check port availability: 5432 (Postgres), 8000 (Supabase Studio), 54321 (Supabase API), 54322 (Supabase Auth)
  - List files to be deleted in `D:\documents\code\git\release\Charger-Reminder` and `CoreHour` (count + top-level listing)

  **Must NOT do**:
  - Do not proceed to any other task if any prerequisite fails
  - Do not install tools silently (report missing tools; user must approve installation)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple validation commands, no code to write
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Pre-flight — blocks all subsequent tasks)
  - **Blocks**: Tasks 2-8
  - **Blocked By**: None (can start immediately)

  **Acceptance Criteria**:
  - [ ] `git --version` exits 0
  - [ ] `supabase --version` exits 0 (or installed)
  - [ ] `docker info` exits 0
  - [ ] Ports 5432, 8000, 54321, 54322 not in use OR documenting conflicts
  - [ ] File listing for sibling directories saved

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All tools available — happy path
    Tool: Bash (pwsh)
    Steps:
      1. Run: git --version
      2. Run: supabase --version
      3. Run: docker info
      4. Run: Get-Process -Id (Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Select-Object ProcessName
      5. Run: Get-ChildItem "D:\documents\code\git\release\Charger-Reminder" -Directory | Select-Object Name
      6. Run: Get-ChildItem "D:\documents\code\git\release\CoreHour" -Directory | Select-Object Name
    Expected Result: All commands exit 0. Port check returns no process OR documents what's using it.
    Evidence: .omo/evidence/task-1-preflight.txt

  Scenario: Missing tool — graceful failure
    Tool: Bash (pwsh)
    Steps:
      1. Run: supabase --version 2>&1
      2. If fails, report: "supabase CLI not installed. Run: npm i -g supabase"
    Expected Result: Clear error message with installation instructions
    Failure Indicators: Silent failure, unclear error
    Evidence: .omo/evidence/task-1-preflight-error.txt
  ```

  **Commit**: NO (pre-flight, no file changes)

- [x] 4. Initial commit

  **What to do**:
  - Commit staged files with message: `chore: initial commit`
  - Verify commit exists: `git log --oneline -1`
  - Verify working tree clean: `git status --porcelain` → empty

  **Must NOT do**:
  - Do not amend or rebase
  - Do not push to remote
  - Do not use `--no-verify` or skip hooks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single commit command
  - **Skills**: [`git-master`]
    - `git-master`: For proper atomic commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (final step in git setup)
  - **Blocks**: None (last git task)
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  - [ ] `git log --oneline -1` shows "chore: initial commit"
  - [ ] `git status --porcelain` returns empty (clean tree)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Initial commit created and tree clean
    Tool: Bash (pwsh)
    Steps:
      1. Run: git log --oneline -1
      2. Assert: output contains "chore: initial commit"
      3. Run: git status --porcelain
      4. Assert: output is empty (or only untracked AGENTS.md/research files from later tasks)
    Expected Result: One commit on main, clean working tree
    Evidence: .omo/evidence/task-4-commit.txt
  ```

  **Commit**: N/A (this IS the commit)

- [x] 7. Generate hierarchical AGENTS.md (6 files)

  **What to do**:
  - Create root `./AGENTS.md` — project overview, monorepo structure, key commands, conventions
  - Create `./packages/ui/AGENTS.md` — UI component library: Card, Button, Modal, Shell, Sidebar patterns
  - Create `./packages/shared/AGENTS.md` — Shared types and constants: design tokens, tool types
  - Create `./apps/web/AGENTS.md` — Web app: Next.js 16, App Router, Supabase, auth, tool registry
  - Create `./apps/web/src/features/charger-reminder/AGENTS.md` — CR feature: device tracking, heuristic engine, database layer
  - Create `./apps/web/src/features/core-hour/AGENTS.md` — CH feature: session timer, tag check-ins, hooks/context pattern
  - Each file must include: **Purpose** (what this module does), **Context** (how it fits in the project), **Patterns** (conventions to follow), **Constraints** (what NOT to do), **Dependencies** (what it depends on)

  **Must NOT do**:
  - Do not overwrite existing `apps/web/AGENTS.md` — if it exists, enhance it with missing sections
  - Do not generate README.md or other documentation
  - Do not include placeholder/TODO content — all AGENTS.md files must be concrete

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation generation from existing codebase patterns
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 3 (parallel with research, cleanup, Supabase)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References** (CRITICAL):
  - `apps/web/AGENTS.md` — Existing stub to enhance (if present)
  - `packages/ui/src/` — UI component source for patterns
  - `packages/shared/src/` — Shared types for context
  - `apps/web/src/lib/tool-registry/` — Tool registry patterns
  - `apps/web/src/features/charger-reminder/` — CR feature structure
  - `apps/web/src/features/core-hour/` — CH feature structure

  **Acceptance Criteria**:
  - [ ] 6 AGENTS.md files exist (root + 3 packages + 2 features)
  - [ ] Each file ≥ 200 characters (not empty stubs)
  - [ ] Each file contains "Purpose" section
  - [ ] Each file contains "Patterns" section or equivalent
  - [ ] Each file accurately reflects the codebase (no hallucinated features)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All 6 AGENTS.md files created with required sections
    Tool: Bash (pwsh)
    Steps:
      1. Run: Get-ChildItem -Recurse -Filter "AGENTS.md" | Select-Object FullName
      2. Assert: count = 6
      3. For each file: Select-String -Path $file -Pattern "Purpose"
      4. Assert: found in all 6 files
      5. For each file: Select-String -Path $file -Pattern "Patterns|Conventions|Constraints"
      6. Assert: found in all 6 files
    Expected Result: 6 files, all with Purpose and Patterns/Constraints sections
    Evidence: .omo/evidence/task-7-agents.md
  ```

  **Commit**: YES
  - Message: `docs: add hierarchical AGENTS.md (6 files)`
  - Files: `AGENTS.md`, `packages/*/AGENTS.md`, `apps/web/AGENTS.md`, `apps/web/src/features/*/AGENTS.md`

---

- [x] 8. Clone + analyze TimeTracker + PawPal → research report

  **What to do**:
  - Clone `https://github.com/Evelyn-rgb-debug/TimeTracker` to temp directory, focus on `Windows/` directory
  - Clone `https://github.com/zebangeth/PawPal` to temp directory, full analysis
  - For each repo, analyze: architecture (framework, state management, data layer), tech stack, UI/UX patterns, features, data model
  - Generate `.omo/research/timetracker-analysis.md`:
    - Feature inventory with "Adopt / Adapt / Skip" assessment
    - Notable UX patterns (timer UX, check-in flow, data visualization)
    - Technical patterns worth reusing
  - Generate `.omo/research/pawpal-analysis.md`:
    - Project overview and problem space
    - Feature inventory with "Adopt / Adapt / Skip" assessment
    - Architectural patterns (auth, routing, component organization)
    - Integration opportunities with EfficiencyMemo's tool gallery
  - Generate `.omo/research/comparative-summary.md`:
    - Cross-project patterns
    - Top 5 actionable recommendations for EfficiencyMemo
    - Integration priority matrix (effort vs impact)

  **Must NOT do**:
  - Do not clone into EfficiencyMemo project directory (use temp)
  - Do not commit cloned repos
  - Do not modify researched repos

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-repo codebase analysis requiring synthesis and recommendation
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 3 (ALL PARALLEL with Tasks 5, 6, 7)
  - **Blocks**: None (last task)
  - **Blocked By**: Task 4

  **References** (CRITICAL):
  - GitHub: `https://github.com/Evelyn-rgb-debug/TimeTracker/tree/main/Windows`
  - GitHub: `https://github.com/zebangeth/PawPal`
  - Existing explore agent analyses (bg_7eab445e, bg_19426332) — collect results if available

  **Acceptance Criteria**:
  - [ ] `.omo/research/timetracker-analysis.md` exists with ≥ 500 words
  - [ ] `.omo/research/pawpal-analysis.md` exists with ≥ 500 words
  - [ ] `.omo/research/comparative-summary.md` exists with top 5 recommendations
  - [ ] Each analysis includes "Adopt/Adapt/Skip" per feature
  - [ ] Cloned repos cleaned up after analysis

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Research reports generated with actionable recommendations
    Tool: Bash (pwsh)
    Steps:
      1. Run: Test-Path ".omo/research/timetracker-analysis.md" → True
      2. Run: Test-Path ".omo/research/pawpal-analysis.md" → True
      3. Run: Test-Path ".omo/research/comparative-summary.md" → True
      4. Run: (Get-Content ".omo/research/comparative-summary.md" | Select-String "Recommendation").Count
      5. Assert: count ≥ 3
    Expected Result: 3 research files, comparative summary has ≥ 3 recommendations
    Evidence: .omo/evidence/task-8-research.txt
  ```

  **Commit**: YES
  - Message: `docs: add TimeTracker and PawPal research report`
  - Files: `.omo/research/*.md`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 2 review agents run in PARALLEL. ALL must APPROVE. Present results to user and get explicit "okay."
> **Never mark F1-F2 as checked before getting user's okay.**

- [ ] F1. **Acceptance Criteria Audit** — `oracle`
  Read the plan end-to-end. For each acceptance criterion, verify implementation:
  - Git: `git log --oneline -1` shows commit, `git status --porcelain` clean
  - Supabase: `supabase status` all healthy, `curl localhost:54321` returns 200
  - Directories: `Test-Path` → False for both siblings
  - AGENTS.md: 6 files ≥ 200 chars each, Purpose + Patterns in all
  - Research: 3 markdown files ≥ 500 words each, recommendations present
  - `.env.local`: contains `localhost:54321`
  - `.gitignore`: contains `.env*`, `node_modules/`, `.next/`
  Output: `Criteria [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Scope Fidelity Check** — `deep`
  Verify no scope creep:
  - No EfficiencyMemo source code modified (check git diff against initial commit)
  - No new dependencies added (compare package.json before/after)
  - No schema changes (migrations unchanged)
  - No new files outside planned scope
  - All 10 "Must NOT Have" guardrails verified
  Output: `Guardrails [N/N] | Contamination [CLEAN/N issues] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **Task 2-3**: No commit (preparation)
- **Task 4**: `chore: initial commit` — entire project
- **Task 5**: `chore: remove migrated sibling directories` — temp backup only, no git changes
- **Task 6**: `chore: switch to local Supabase CLI` — supabase/config.toml, .env.local
- **Task 7**: `docs: add hierarchical AGENTS.md (6 files)` — all AGENTS.md files
- **Task 8**: `docs: add TimeTracker and PawPal research report` — .omo/research/*.md

---

## Success Criteria

### Verification Commands
```bash
# Git verification
git log --oneline -1
# Expected: "chore: initial commit"
git status --porcelain
# Expected: empty (clean tree)

# Supabase verification
supabase status
# Expected: all services healthy
curl -s http://localhost:54321/rest/v1/
# Expected: valid JSON response

# Directory cleanup
Test-Path "D:\documents\code\git\release\Charger-Reminder"
# Expected: False
Test-Path "D:\documents\code\git\release\CoreHour"
# Expected: False

# AGENTS.md verification
(Get-ChildItem -Recurse -Filter "AGENTS.md").Count
# Expected: 6

# Research verification
(Get-ChildItem ".omo/research" -Filter "*.md").Count
# Expected: 3
```

### Final Checklist
- [ ] Git repo initialized with clean initial commit
- [ ] Local Supabase running, migrations applied, dev server starts
- [ ] Old sibling directories removed with backup
- [ ] 6 hierarchical AGENTS.md files generated
- [ ] 3 research reports with actionable recommendations
- [ ] All "Must Have" present (6/6)
- [ ] All "Must NOT Have" absent (10/10)
- [ ] Zero source code modifications
- [ ] Zero new dependencies

- [x] 5. Remove sibling directories (Charger-Reminder, CoreHour)

  **What to do**:
  - List all files in both directories (for audit trail)
  - Check for `.git` directories inside (preserve git history if found)
  - Get explicit confirmation from user before deletion
  - Move directories to temp: `Move-Item "D:\documents\code\git\release\Charger-Reminder" "$env:TEMP\backup\Charger-Reminder"`
  - Verify directories no longer exist: `Test-Path` → False for both

  **Must NOT do**:
  - Do NOT `Remove-Item -Recurse -Force` without backup
  - Do NOT delete without listing files first
  - Do NOT delete without user confirmation

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File system operations with confirmation gate
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8)
  - **Parallel Group**: Wave 3 (parallel with Supabase, AGENTS.md, research)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] `Test-Path "D:\documents\code\git\release\Charger-Reminder"` → False
  - [ ] `Test-Path "D:\documents\code\git\release\CoreHour"` → False
  - [ ] Backup exists in `$env:TEMP\backup\`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Directories removed, backup exists
    Tool: Bash (pwsh)
    Steps:
      1. Run: Test-Path "D:\documents\code\git\release\Charger-Reminder"
      2. Assert: False
      3. Run: Test-Path "D:\documents\code\git\release\CoreHour"
      4. Assert: False
      5. Run: Test-Path "$env:TEMP\backup\Charger-Reminder"
      6. Assert: True
    Expected Result: Both directories gone, backup preserved
    Evidence: .omo/evidence/task-5-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore: remove migrated sibling directories`
  - Files: N/A (directories outside project, no git changes needed)

---

- [~] 6. Switch to local Supabase CLI — BLOCKED: supabase CLI and Docker not installed (same blocker as Task 1)

  **What to do**:
  - Run `supabase init` in project root (creates `supabase/config.toml`)
  - Verify Docker is running, ports are free
  - Run `supabase start` to launch local Supabase services
  - Wait for services to be healthy (Postgres, Auth, API, Studio)
  - Apply existing migrations: `supabase db reset` (applies `supabase/migrations/` files)
  - Get local anon key: `supabase status` → extract `anon key`
  - Update `.env.local`: set `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
  - Update `.env.local`: set `NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>`
  - Verify connection: `curl http://localhost:54321/rest/v1/` → 200
  - Verify auth: `curl http://localhost:54321/auth/v1/settings` → 200
  - Test `pnpm dev` starts without remote Supabase connection errors
  - Update the auth callback to use local Supabase (magic-link works against local Auth)

  **Must NOT do**:
  - Do NOT delete `supabase/migrations/` files
  - Do NOT create new migrations
  - Do NOT modify database schema
  - Do NOT push to remote Supabase
  - Do NOT proceed if `supabase start` fails (Docker issue)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-step setup with service health checks, Docker dependency, auth adaptation
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 3 (parallel with directory cleanup)
  - **Blocks**: Final verification
  - **Blocked By**: Task 4

  **References** (CRITICAL):
  - `supabase/migrations/` — 3 existing migration files to apply locally
  - `apps/web/src/lib/auth/callback/route.ts` — Auth callback route (magic-link)
  - `apps/web/.env.example` — Reference for env var names
  - Supabase CLI docs: `https://supabase.com/docs/guides/cli/local-development`

  **Acceptance Criteria**:
  - [ ] `supabase/config.toml` exists
  - [ ] `supabase status` shows all services healthy
  - [ ] `curl http://localhost:54321/rest/v1/` returns 200
  - [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
  - [ ] `pnpm dev` starts without Supabase connection errors

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Local Supabase fully operational
    Tool: Bash (pwsh)
    Steps:
      1. Run: supabase status
      2. Assert: all services show "healthy" or "running"
      3. Run: curl -s http://localhost:54321/rest/v1/
      4. Assert: response is valid JSON (even if empty)
      5. Run: Select-String -Path ".env.local" -Pattern "localhost:54321"
      6. Assert: found
    Expected Result: All services healthy, API reachable, .env.local updated
    Failure Indicators: Service unhealthy, connection refused, .env.local missing
    Evidence: .omo/evidence/task-6-supabase.txt

  Scenario: pnpm dev starts without Supabase errors
    Tool: Bash (pwsh)
    Steps:
      1. Start: pnpm dev (background, timeout 30s)
      2. Wait: 10s for Next.js compilation
      3. Run: curl -s http://localhost:3000/api/health (or any route)
      4. Assert: no Supabase connection errors in output
    Expected Result: Dev server starts, routes respond
    Evidence: .omo/evidence/task-6-dev-start.txt
  ```

  **Commit**: YES
  - Message: `chore: switch to local Supabase CLI`
  - Files: `supabase/config.toml`, `.env.local` (if tracked), any auth route updates
  - Pre-commit: `pnpm dev` starts cleanly

---

- [ ] 2. Create .gitignore

  **What to do**:
  - Create `.gitignore` at project root with standard Next.js + Supabase patterns
  - Must include: `.env*`, `node_modules/`, `.next/`, `dist/`, `*.log`, `.DS_Store`, `Thumbs.db`, `.turbo/`, `coverage/`, `test-results/`
  - Must NOT ignore: `.env.example`, `.gitignore`, source files, config files, migrations
  - Verify `.gitignore` exists and contains essential patterns

  **Must NOT do**:
  - Do not create `.gitignore` inside subdirectories (root only)
  - Do not gitignore `.env.example` (needed for reference)
  - Do not gitignore `supabase/migrations/` (must be committed)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with well-known patterns
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (blocks git init)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] `.gitignore` file exists at project root
  - [ ] Contains `.env*` pattern
  - [ ] Contains `node_modules/`
  - [ ] Contains `.next/`
  - [ ] Does NOT contain `.env.example` as ignored

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: .gitignore created with correct patterns
    Tool: Bash (pwsh)
    Steps:
      1. Run: Test-Path ".gitignore" → True
      2. Run: Select-String -Path ".gitignore" -Pattern "\.env\*" | Should-Not -BeNullOrEmpty
      3. Run: Select-String -Path ".gitignore" -Pattern "node_modules/" | Should-Not -BeNullOrEmpty
      4. Run: Select-String -Path ".gitignore" -Pattern "\.next/" | Should-Not -BeNullOrEmpty
    Expected Result: File exists, contains all 3 essential patterns
    Evidence: .omo/evidence/task-2-gitignore.txt
  ```

  **Commit**: NO (part of Task 4 commit)

---

- [x] 3. Git init + stage all files

  **What to do**:
  - Run `git init` at project root
  - Set default branch to `main`: `git checkout -b main`
  - Stage all non-ignored files: `git add .`
  - Verify staged files don't include secrets: `git diff --cached --name-only`
  - Verify no `.env` files are staged (should be gitignored)
  - Verify `node_modules/` and `.next/` not staged

  **Must NOT do**:
  - Do not commit yet (Task 4 handles commit)
  - Do not set up remote (`git remote add`)
  - Do not create branches beyond `main`
  - Do not stage `.env` files or build artifacts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard git commands, no complex logic
  - **Skills**: [`git-master`]
    - `git-master`: For proper git init and staging verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (depends on .gitignore)
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **Acceptance Criteria**:
  - [ ] `.git/` directory exists
  - [ ] Default branch is `main`
  - [ ] `git diff --cached --name-only` shows source files (not .env, node_modules, .next)
  - [ ] No `.env` files in staged list

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Git repo initialized with clean staging
    Tool: Bash (pwsh)
    Steps:
      1. Run: git status → "On branch main"
      2. Run: git diff --cached --name-only
      3. Verify: output contains source files
      4. Run: git diff --cached --name-only | Select-String "\.env$"
    Expected Result: git status shows "On branch main". Staged files include source. No .env files staged.
    Evidence: .omo/evidence/task-3-git-init.txt
  ```

  **Commit**: NO (staging only; Task 4 commits)

---


### Original Request
> "1. Make this project a git repo and commit. 2. Remove the Charger-Reminder and CoreHour directories. 3. Charger-Reminder and CoreHour may have remote database, but now I only want to do local temporary. We need to change it. 4. Initialize the AGENTS.md. 5. Clone and analyze two GitHub projects (TimeTracker, PawPal) — tell me what function and idea we can move to our project."

### Interview Summary
**Key Discussions**:
- **Database**: Supabase CLI (local dev) with Docker — full local Postgres + Auth + Storage. Remote Supabase project removed. `.env.local` switched to `localhost:54321`.
- **AGENTS.md**: Full hierarchical — root, 3 packages, 2 features. Each file: Purpose, Context, Patterns, Constraints, Dependencies.
- **Git**: Local-only, no remote. `.env*` gitignored. Conventional commits.
- **Research**: Full analysis report on TimeTracker + PawPal. Stored in `.omo/research/`.

**Research Findings**:
- Current state confirmed: no `.git` directory, siblings exist, 3 migrations present, no `supabase/config.toml`, featured code complete
- TimeTracker and PawPal analysis PENDING (non-blocking — appended as recommendations)

### Metis Review
**Identified Gaps** (addressed):
- **Pre-flight verification needed**: Check `supabase` CLI, Docker, port availability before operations
- **Destructive operation guardrails**: List files before deletion, verify no symlinks, get confirmation
- **`.gitignore` BEFORE `git init`**: Prevent committing secrets/build artifacts
- **Supabase auth adaptation**: Magic-link works with local Supabase Auth; `.env.local` needs URL + anon key update
- **Scope creep prevention**: 10 explicit exclusions — no new features, no refactoring, no CI/CD

### Oracle Phase 1 Verification
**CHECK [5/5] PASS | VERDICT: GO**
- Core objective unambiguous ✓
- Scope IN/OUT explicit ✓
- Test strategy declared (Agent QA) ✓
- No outstanding questions ✓
- No codebase contradictions ✓

---

## Work Objectives

### Core Objective
> Prepare the EfficiencyMemo project for standalone local development by initializing git tracking, switching from remote Supabase to Supabase CLI (local Docker Postgres + Auth), generating hierarchical AGENTS.md documentation, and researching external project patterns — so the project is self-contained, version-controlled, and documented with zero external service dependencies.

### Concrete Deliverables
- `.git/` directory with initial commit on `main` branch
- `.gitignore` with: `.env*`, `node_modules/`, `.next/`, `dist/`, `*.log`, `.DS_Store`, `Thumbs.db`
- `supabase/config.toml` with local dev settings
- Updated `.env.local` pointing to `http://localhost:54321`
- Local Supabase running (Docker), migrations applied
- 6 hierarchical `AGENTS.md` files
- `D:\documents\code\git\release\Charger-Reminder` and `CoreHour` directories removed
- `.omo/research/timetracker-analysis.md` and `.omo/research/pawpal-analysis.md`

### Definition of Done
- [ ] `git log --oneline -1` shows initial commit
- [ ] `supabase status` shows all services healthy
- [ ] `pnpm dev` starts without remote Supabase errors
- [ ] `find . -name "AGENTS.md" | wc -l` → 6
- [ ] `Test-Path ../Charger-Reminder` → False, `Test-Path ../CoreHour` → False

### Must Have
- Local Supabase fully functional (Postgres + Auth)
- Git repo with clean initial commit
- Complete AGENTS.md hierarchy
- Old directories removed
- Research report generated

### Must NOT Have (Guardrails)
- NO modification of EfficiencyMemo source code
- NO new dependencies or packages installed
- NO schema changes or new migrations
- NO GitHub remote setup or CI/CD
- NO README or docs beyond AGENTS.md
- NO test infrastructure changes
- NO deletion without explicit confirmation (list files first)
- NO `rm -rf` without backup (use Move-Item to temp on Windows)
- NO `git init` before `.gitignore` is created
- NO `supabase init` without Docker verification

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Automated tests**: None — ops/config work, no code changes
- **Agent-Executed QA**: ALL tasks verified via bash commands

### QA Policy
Every task includes bash-verifiable acceptance criteria.
- **File operations**: `Test-Path`, `git status`, `git log`
- **Service health**: `supabase status`, `curl localhost:54321`
- **Directory cleanup**: `Test-Path` → False for removed dirs
- **Content verification**: `Get-Content`, `Select-String` for AGENTS.md content

---

## Execution Strategy

### Sequential Waves

> Git and Supabase operations are inherently sequential — must create `.gitignore` before `git init`, must verify Docker before `supabase start`. Research can run in parallel.

```
Wave 1 (Pre-flight — verify prerequisites):
├── Task 1: Verify tools (git, supabase CLI, Docker, Node.js) + port availability

Wave 2 (Git Setup — sequential, each builds on prior):
├── Task 2: Create .gitignore
├── Task 3: git init + stage all files
├── Task 4: Initial commit + verify

Wave 3 (Cleanup + Config + Docs — ALL PARALLEL — 4 tasks):
├── Task 5: Remove sibling directories (Charger-Reminder, CoreHour)
├── Task 6: Switch to local Supabase (supabase init, start, apply migrations, .env.local)
├── Task 7: Generate hierarchical AGENTS.md (6 files)
└── Task 8: Clone + analyze TimeTracker + PawPal → research report

Wave FINAL (After ALL tasks — 2 parallel reviews):
├── Task F1: Verify all acceptance criteria met
├── Task F2: Scope fidelity check (no code/deps changed)
-> Present results -> Get explicit user okay
```

---

## TODOs

> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**
> **FORMAT**: Task labels MUST use bare numbers: `1.`, `2.`, `3.`

---

