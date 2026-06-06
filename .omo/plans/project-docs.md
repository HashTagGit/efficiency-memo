# Project Documentation Package

## TL;DR

> **Quick Summary**: Generate a complete documentation surface for the EfficiencyMemo GitHub repo — root README, CONTRIBUTING, LICENSE (MIT), ARCHITECTURE, and CHANGELOG — plus remove the AGENTS.md README generation ban and replace the stale Next.js boilerplate README.
> 
> **Deliverables**:
> - `README.md` (root) — dual-audience landing page with feature catalog, quick start, tech stack
> - `CONTRIBUTING.md` — local setup, test commands, feature registration pattern
> - `LICENSE` — MIT license for HashTagGit
> - `ARCHITECTURE.md` — monorepo layout, auth flow, tool registry, route groups
> - `CHANGELOG.md` — curated backfill from conventional commits
> - `AGENTS.md` — remove "Do not generate README files" constraint (line 49)
> - `apps/web/README.md` — replace stock create-next-app template with redirect stub
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 7 tasks in 1 wave
> **Critical Path**: None — all tasks are independent markdown files

---

## Context

### Original Request
"Make this project a GitHub repo" → repo pushed → "Now we need full docs to describe our project, especially README.md and others docs"

### Interview Summary
**Key Discussions**:
- **Audience**: Dual-purpose README — product description for end users + technical deep dive for developers
- **Docs in scope**: root README.md, CONTRIBUTING.md, LICENSE (MIT), ARCHITECTURE.md, CHANGELOG.md
- **AGENTS.md**: Remove "Do not generate README files" constraint (only root AGENTS.md line 49 affected; 5 sub-package AGENTS.md files are clean)
- **LICENSE**: MIT, copyright HashTagGit, year 2026
- **CHANGELOG**: Backfill from existing 5 conventional commits, curated (not raw dump)
- **apps/web/README.md**: Replace stock create-next-app template with short redirect stub
- **Repo visibility**: Private (but docs follow professional OSS standards)

**Research Findings**:
- **Explore agent (bg_5f484066)** returned comprehensive feature map:
  - Two tools: Charger-Reminder (battery tracking + reminders) and CoreHour (time tracking + tags)
  - Auth: Route-group gating via `(shell)/layout.tsx` → `requireSessionUser()`, no Next.js middleware
  - Registration: `features/<id>/index.ts` → `registerTool()` → `Map<string, RegisteredTool>`, with lazy `discoverTools()` fallback
  - Mock auth shim: Lives in `features/charger-reminder/auth/mock.ts` (architectural quirk — infra code in a feature folder)
  - Route groups: `(auth)` for sign-in, `(shell)` for authenticated content, `[toolId]` catch-all for dynamic tool rendering
- **AGENTS.md audit**: Only root `AGENTS.md` line 49 has the README ban. Package and feature AGENTS.md files do not.
- **Existing apps/web/README.md**: Stock `create-next-app` template — references Geist font, `npm run dev`, generic Vercel deploy. Completely disconnected from actual project.

### Metis Review
**Identified Gaps** (addressed):
- **ARCHITECTURE.md must wait for explore results**: Resolved — explore agent completed with full feature map, auth flow, registration mechanism, route groups
- **AGENTS.md audit needed before editing**: Resolved — grep confirmed only root AGENTS.md has the constraint
- **CHANGELOG must be curated, not raw dump**: Applied — tasks will group by conventional commit categories
- **License holder ambiguous**: Resolved — HashTagGit confirmed
- **Scope OUT not defined**: Resolved — explicit exclusions documented below

---

## Work Objectives

### Core Objective
Create a complete, professional documentation surface for the EfficiencyMemo GitHub repository that serves both end users (feature descriptions) and developers (setup, architecture, contributing).

### Concrete Deliverables
- `README.md` at repo root
- `CONTRIBUTING.md` at repo root
- `LICENSE` at repo root (MIT)
- `ARCHITECTURE.md` at repo root
- `CHANGELOG.md` at repo root
- `AGENTS.md` line 49 edit (remove README ban)
- `apps/web/README.md` replacement (redirect stub)

### Definition of Done
- [ ] All 7 files exist with correct content
- [ ] `git diff --stat` shows exactly 7 files changed
- [ ] Every markdown file renders correctly (no broken links, valid formatting)
- [ ] AGENTS.md no longer contains "Do not generate README files"
- [ ] LICENSE contains "Copyright (c) 2026 HashTagGit" with standard MIT text
- [ ] CHANGELOG groups 5 commits under conventional commit categories with curated descriptions
- [ ] README links to CONTRIBUTING.md, ARCHITECTURE.md, and LICENSE

### Must Have
- Root README.md with feature descriptions for both Charger-Reminder and CoreHour
- Quick Start section with `pnpm install && pnpm dev` commands
- Tech stack table (Next.js 16, React 19, Supabase, Tailwind v4, Vitest, Playwright)
- Standard MIT license text with correct copyright holder
- ARCHITECTURE.md citing actual file paths from the codebase (no speculation)
- CONTRIBUTING.md referencing existing conventions from root AGENTS.md

### Must NOT Have (Guardrails)
- **NO source code changes** — documentation only (except AGENTS.md constraint removal)
- **NO GitHub issue/PR templates** (`.github/ISSUE_TEMPLATE`, `.github/PULL_REQUEST_TEMPLATE.md`)
- **NO additional docs**: SECURITY.md, CODE_OF_CONDUCT.md, SUPPORT.md, CODEOWNERS
- **NO package-level READMEs** for `packages/shared/` or `packages/ui/`
- **NO auto-generated API docs** (no typedoc, no swagger)
- **NO Wiki or GitHub Pages site**
- **NO speculative future architecture** in ARCHITECTURE.md — only what exists today
- **NO JSDoc or inline comments** added to source code
- **NO raw, uncurated commit messages** in CHANGELOG — must be grouped and described
- **NO duplicate content** between root README and apps/web/README.md
- **DO NOT modify** any other constraints in AGENTS.md — only remove line 49
- **DO NOT modify** `supabase/migrations/`, `pnpm-workspace.yaml`, or any config files

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: N/A (documentation — no code tests)
- **Automated tests**: None
- **Framework**: N/A
- **Agent-Executed QA**: Read-back verification on every generated file

### QA Policy
Every task includes agent-executed QA scenarios using:
- **Read-back**: Read the generated file, verify content against acceptance criteria
- **Markdown validation**: Check no broken internal links, proper heading hierarchy
- **Diff verification**: `git diff --stat` to confirm only intended files changed
- **AGENTS.md constraint check**: `grep` for "Do not generate README" after edit — must return empty
- **LICENSE validity**: Check for "Copyright (c) 2026 HashTagGit" and "MIT" in file
- Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.txt`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (ALL tasks — max parallelism, all independent):
├── Task 1: Edit AGENTS.md — remove README ban [quick]
├── Task 2: Create root README.md [writing]
├── Task 3: Create CONTRIBUTING.md [writing]
├── Task 4: Create LICENSE (MIT) [quick]
├── Task 5: Create ARCHITECTURE.md [writing]
├── Task 6: Create CHANGELOG.md [writing]
└── Task 7: Replace apps/web/README.md [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: None — all 7 tasks are independent markdown files with no data dependencies.
Parallel Speedup: ~85% vs sequential (7 tasks in 1 wave instead of 7 waves).
Max Concurrent: 7
```

### Agent Dispatch Summary

- **Wave 1**: **7** — T1 → `quick`, T2 → `writing`, T3 → `writing`, T4 → `quick`, T5 → `writing`, T6 → `writing`, T7 → `quick`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Edit root AGENTS.md — remove README generation ban

  **What to do**:
  - Open `AGENTS.md` (repo root)
  - Find and remove ONLY the line: `- Do not generate README files; the only docs surface in this repo is \`AGENTS.md\`` (currently line 49)
  - Preserve ALL other constraints verbatim — do not change any other line
  - The line above it (`- Do not refactor the Supabase mock auth flow...`) and the line below it (`## Dependencies`) must remain unchanged

  **Must NOT do**:
  - Do not modify any other constraint in AGENTS.md
  - Do not change the file structure or add new sections
  - Do not reformat the file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line removal in a known file — trivial operation
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:
  - `AGENTS.md:49` — Exact line to remove (confirmed by grep — only instance in the repo)
  - `AGENTS.md:45-55` — Surrounding context to preserve (mock auth constraint above, Dependencies section below)

  **Acceptance Criteria**:
  - [ ] `grep -c "Do not generate README" AGENTS.md` returns `0`
  - [ ] All other constraints still present (verify with: `grep -c "Do not modify the .gitignore" AGENTS.md` returns `1`, `grep -c "Do not commit secrets" AGENTS.md` returns `1`)
  - [ ] `git diff AGENTS.md` shows exactly one deleted line

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Constraint removed, all others preserved
    Tool: Bash
    Preconditions: File exists at D:\documents\code\git\release\EfficiencyMemo\AGENTS.md
    Steps:
      1. grep -c "Do not generate README" AGENTS.md
      2. Assert output is "0"
      3. grep -c "Do not modify the .gitignore" AGENTS.md
      4. Assert output is "1" (other constraints intact)
      5. grep -c "^## Dependencies" AGENTS.md
      6. Assert output is "1" (next section preserved)
    Expected Result: Exactly one constraint removed, no collateral damage
    Failure Indicators: grep returns >0 for the removed constraint, or any other constraint count changes
    Evidence: .omo/evidence/task-1-constraint-removed.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `AGENTS.md`

- [x] 2. Create root README.md — dual-purpose landing page

  **What to do**:
  - Create `README.md` at repo root
  - Structure (top to bottom):
    1. **Header**: Project name "EfficiencyMemo" + tagline: "Unified tool gallery for daily productivity"
    2. **About**: 2-3 sentence description of the monorepo, its two tools (Charger-Reminder, CoreHour), and the unified Supabase-authenticated shell
    3. **Features**: Two subsections — "Charger Reminder" (battery tracking, heuristic reminders, deterministic engine) and "CoreHour" (time tracking, periodic check-ins, tag-based categorization). Use bullet lists of capabilities from the explore agent findings
    4. **Tech Stack**: Table — Next.js 16, React 19, Tailwind v4, Supabase, TypeScript, Vitest, Playwright, pnpm
    5. **Quick Start**: Prerequisites (Node ≥20, pnpm ≥9, Docker, Supabase CLI), then `pnpm install`, `cp apps/web/.env.example apps/web/.env.local`, start Supabase, `pnpm dev` → http://localhost:3000
    6. **Scripts**: Table of available commands from root `package.json` — `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`
    7. **Architecture at a Glance**: Brief text + ASCII tree of monorepo layout, mention route groups, tool registry pattern. Link to `ARCHITECTURE.md` for full details
    8. **License**: Short line: "MIT © 2026 HashTagGit. See [LICENSE](./LICENSE)."

  **Must NOT do**:
  - Do not include GitHub badges (private repo)
  - Do not include deployment instructions (no deployment configured)
  - Do not duplicate AGENTS.md content verbatim — summarize, don't copy-paste
  - Do not exceed ~150 lines (keep it scannable)
  - Do not invent features that don't exist

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation generation from structured knowledge — prose-heavy, no code changes
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately — explore results available)

  **References** (CRITICAL — Be Exhaustive):
  - Explore agent output (in session context) — Full feature descriptions for Charger-Reminder (battery tracking, heuristic engine `deterministic-v1`, device presets, reminders) and CoreHour (periodic check-ins, tag categorization, timer with visibility auto-pause)
  - `AGENTS.md:1-57` — Workspace context: pnpm monorepo, stack, conventions, constraints (pull patterns, commands, path aliases)
  - `apps/web/AGENTS.md` — App-specific details: auth flow, route groups, tool registry, Supabase clients
  - `package.json:1-21` — Scripts section (dev, build, lint, typecheck, test, test:e2e), engines (node >=20, pnpm >=9)
  - `apps/web/.env.example` — Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

  **Acceptance Criteria**:
  - [ ] File exists at `README.md` in repo root
  - [ ] Contains project name "EfficiencyMemo" in first 5 lines
  - [ ] Contains "Features" section with both Charger-Reminder and CoreHour descriptions
  - [ ] Contains "Quick Start" section with `pnpm install && pnpm dev` commands
  - [ ] Contains "Tech Stack" section listing Next.js, React, Supabase, Tailwind, Vitest, Playwright
  - [ ] Contains link to `ARCHITECTURE.md`
  - [ ] Contains link to `LICENSE`
  - [ ] Contains link to `CONTRIBUTING.md`
  - [ ] File length between 80-150 lines
  - [ ] No broken internal links

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: README renders with all required sections
    Tool: Bash (Read)
    Preconditions: File exists at README.md
    Steps:
      1. Read README.md full content
      2. Assert first 5 lines contain "EfficiencyMemo"
      3. grep "## Features" README.md → assert found
      4. grep "Charger Reminder" README.md → assert found
      5. grep "CoreHour" README.md → assert found  
      6. grep "## Quick Start" README.md → assert found
      7. grep "pnpm install" README.md → assert found
      8. grep "## Tech Stack" README.md → assert found
      9. grep "ARCHITECTURE.md" README.md → assert found (link present)
      10. grep "CONTRIBUTING.md" README.md → assert found (link present)
      11. grep "LICENSE" README.md → assert found (link present)
      12. Count lines → assert between 80-150
    Expected Result: All sections present, links to other docs, correct length
    Failure Indicators: Missing section header, missing tool name, line count out of range
    Evidence: .omo/evidence/task-2-readme-content.txt

  Scenario: No broken internal links
    Tool: Bash
    Preconditions: README.md, CONTRIBUTING.md, ARCHITECTURE.md, LICENSE all exist
    Steps:
      1. Extract all relative links from README.md: grep -oP '\[.*?\]\(\./([^)]+)\)' README.md
      2. For each link target, Test-Path to verify file exists
      3. Assert all referenced files exist
    Expected Result: All local file links resolve to existing files
    Failure Indicators: Any linked file path does not exist
    Evidence: .omo/evidence/task-2-link-check.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `README.md`

- [x] 3. Create CONTRIBUTING.md — developer onboarding guide

  **What to do**:
  - Create `CONTRIBUTING.md` at repo root
  - Structure:
    1. **Header**: "Contributing to EfficiencyMemo"
    2. **Prerequisites**: Node ≥20, pnpm ≥9, Docker, Supabase CLI — same as README Quick Start
    3. **Local Setup**: Step-by-step — clone, `pnpm install`, copy `.env.example`, start Supabase, `pnpm dev`
    4. **Workspace Layout**: Brief tree of `apps/`, `packages/`, `supabase/`
    5. **Development Commands**: Table from root `package.json` — `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`
    6. **Adding a New Tool**: Steps referencing the tool registry pattern — create `features/<id>/`, add `manifest.ts` + `component-loader.ts` + `index.ts`, register in `discovery.ts`, add AGENTS.md. Link to ARCHITECTURE.md for full pattern.
    7. **Code Conventions**: Reference existing conventions from root AGENTS.md — path aliases (`@/*`, `@memo/*`), Server Components by default, `"use server"` for actions, `revalidatePath`, test mirroring. Link to root AGENTS.md.
    8. **Testing**: How to run tests — `pnpm test` (Vitest), `pnpm test:e2e` (Playwright). Where tests live (`__tests__/`, `e2e/`).
    9. **Commit Style**: Reference conventional commits observed in history (`chore:`, `docs:`, `feat:`)
    10. **License**: "MIT — see [LICENSE](./LICENSE)"

  **Must NOT do**:
  - Do not invent new conventions — only document existing patterns from AGENTS.md and codebase
  - Do not copy-paste entire AGENTS.md — summarize and link
  - Do not exceed ~120 lines

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation prose from existing codebase knowledge
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `AGENTS.md:1-57` — All workspace conventions: path aliases, commands, monorepo patterns, constraints
  - `package.json:1-21` — All available scripts with descriptions
  - `apps/web/AGENTS.md` — App-specific conventions: auth, tool registry, server actions, test structure
  - Explore agent output — Tool registration pattern details: `features/<id>/index.ts` → `registerTool()`, `discovery.ts` featureNames array, per-feature AGENTS.md
  - `apps/web/.env.example` — Required env vars for setup

  **Acceptance Criteria**:
  - [ ] File exists at `CONTRIBUTING.md`
  - [ ] Contains "Prerequisites" section with Node ≥20, pnpm ≥9, Docker, Supabase CLI
  - [ ] Contains development commands table with all scripts from package.json
  - [ ] Contains "Adding a New Tool" section referencing `features/`, `manifest.ts`, `index.ts`
  - [ ] Contains testing instructions (Vitest + Playwright paths)
  - [ ] Links to root AGENTS.md for conventions
  - [ ] Links to LICENSE
  - [ ] File length between 60-120 lines

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All sections present and references correct
    Tool: Bash (Read)
    Preconditions: File exists at CONTRIBUTING.md
    Steps:
      1. Read CONTRIBUTING.md full content
      2. grep "Prerequisites" → assert found
      3. grep "pnpm dev" → assert found
      4. grep "pnpm test" → assert found
      5. grep "pnpm test:e2e" → assert found
      6. grep "Adding a New Tool" → assert found
      7. grep "manifest.ts" → assert found
      8. grep "AGENTS.md" → assert found (link to conventions)
      9. grep "LICENSE" → assert found (link to license)
      10. Count lines → assert between 60-120
    Expected Result: Complete contributor guide with correct references
    Failure Indicators: Missing section, missing command, line count out of range
    Evidence: .omo/evidence/task-3-contributing-content.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `CONTRIBUTING.md`

- [x] 4. Create LICENSE — MIT license for HashTagGit

  **What to do**:
  - Create `LICENSE` at repo root (no file extension)
  - Use standard MIT License text
  - Copyright line: `Copyright (c) 2026 HashTagGit`
  - The file should contain:
    ```
    MIT License

    Copyright (c) 2026 HashTagGit

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    ```

  **Must NOT do**:
  - Do not add a `.txt` or `.md` extension — filename must be exactly `LICENSE`
  - Do not modify the standard MIT text beyond the copyright line
  - Do not include additional clauses or custom modifications

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard boilerplate file with one custom line — trivial
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - Interview decision: MIT license, copyright holder "HashTagGit", year 2026
  - Standard MIT text from https://opensource.org/licenses/MIT (or https://choosealicense.com/licenses/mit/)

  **Acceptance Criteria**:
  - [ ] File exists at `LICENSE` (no extension)
  - [ ] Contains "MIT License" header
  - [ ] Contains "Copyright (c) 2026 HashTagGit"
  - [ ] Contains standard "Permission is hereby granted..." text
  - [ ] Contains "THE SOFTWARE IS PROVIDED \"AS IS\"" disclaimer

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Valid MIT license with correct copyright holder
    Tool: Bash
    Preconditions: File exists at LICENSE
    Steps:
      1. Read LICENSE full content
      2. head -1 LICENSE → assert contains "MIT License"
      3. grep "Copyright (c) 2026 HashTagGit" LICENSE → assert found
      4. grep "Permission is hereby granted" LICENSE → assert found
      5. grep "WITHOUT WARRANTY OF ANY KIND" LICENSE → assert found
      6. grep "THE SOFTWARE IS PROVIDED" LICENSE → assert found
    Expected Result: Standard MIT license with HashTagGit as copyright holder
    Failure Indicators: Wrong copyright name, missing standard MIT clauses, file has extension
    Evidence: .omo/evidence/task-4-license.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `LICENSE`

- [x] 5. Create ARCHITECTURE.md — system design documentation

  **What to do**:
  - Create `ARCHITECTURE.md` at repo root
  - Structure:
    1. **Header**: "EfficiencyMemo — Architecture"
    2. **Monorepo Layout**: ASCII tree showing `apps/web/`, `packages/shared/`, `packages/ui/`, `supabase/migrations/` with brief description of each
    3. **Route Groups**: Explain `(auth)` (sign-in surface, unauthenticated) vs `(shell)` (authenticated content). Note: NO middleware.ts — auth gating is in `(shell)/layout.tsx` → `requireSessionUser()`
    4. **Auth Flow**: Describe the flow — `signInWithOtp` (magic link) → `/auth/callback` → session → `requireSessionUser()` gate → mock auth for E2E. Note mock auth shim location (`features/charger-reminder/auth/mock.ts`) as an architectural quirk
    5. **Tool Registry Pattern**: Explain discovery + registration — `manifest.ts` → `index.ts` → `registerTool()` → `Map<string, RegisteredTool>`, lazy `discoverTools()` fallback, `[toolId]` catch-all page
    6. **Data Flow**: Server Components → Supabase server client → RLS policies → Server Actions with `revalidatePath`
    7. **Testing Architecture**: Vitest for unit/integration (mirrors source under `__tests__/`), Playwright for E2E (in `e2e/*.spec.ts`)
  - Cite actual file paths throughout (e.g., `apps/web/src/lib/auth/session.ts`, `apps/web/src/lib/tool-registry/registry.ts`)

  **Must NOT do**:
  - Do not speculate about future architecture — only document what exists today
  - Do not include diagrams that reference paths or patterns that aren't verified
  - Do not document SQL schemas in detail (reference `supabase/migrations/` instead)
  - Do not include per-feature implementation details (that's for per-feature AGENTS.md)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Structured technical documentation from codebase exploration results
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)
  - **Blocks**: None
  - **Blocked By**: None (explore agent results available in session context)

  **References** (CRITICAL):
  - Explore agent output (in session context) — Complete architectural map: route groups, auth flow (no middleware, layout-based gating), registration mechanism (manifest → index.ts → registerTool), catch-all `[toolId]` page, mock auth quirk
  - `apps/web/src/app/(shell)/layout.tsx` — The auth gate: `await requireSessionUser()`
  - `apps/web/src/lib/auth/session.ts` — `getSessionUser()` (mock-first, then Supabase) and `requireSessionUser()`
  - `apps/web/src/lib/tool-registry/registry.ts` — `Map<string, RegisteredTool>` + `registerTool/getRegisteredTools/getToolById`
  - `apps/web/src/lib/tool-registry/discovery.ts` — Hard-coded `featureNames = ['charger-reminder', 'core-hour']`, `discoverTools()`
  - `apps/web/src/features/charger-reminder/index.ts` — Registration pattern example
  - `apps/web/src/features/charger-reminder/auth/mock.ts` — Mock auth shim location (quirk: in a feature folder)
  - `AGENTS.md:1-57` — Workspace conventions and structure

  **Acceptance Criteria**:
  - [ ] File exists at `ARCHITECTURE.md`
  - [ ] Contains "Monorepo Layout" section with `apps/`, `packages/`, `supabase/`
  - [ ] Contains "Auth Flow" section explaining magic link + `requireSessionUser()` + mock auth
  - [ ] Contains "Tool Registry" section explaining `registerTool()`, `discoverTools()`, `[toolId]` catch-all
  - [ ] Cites at least 5 real file paths from the codebase (verify with `grep -c "src/" ARCHITECTURE.md`)
  - [ ] Notes that there is NO `middleware.ts` and auth is in route group layout
  - [ ] Mentions mock auth shim location as architectural quirk

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Architecture doc cites real codebase paths
    Tool: Bash
    Preconditions: File exists at ARCHITECTURE.md
    Steps:
      1. grep -oP 'apps/web/src/[^)\s]+' ARCHITECTURE.md → extract all referenced paths
      2. For each unique path, Test-Path to verify file exists in workspace
      3. Assert at least 5 file paths resolve
    Expected Result: All cited file paths exist in the actual codebase
    Failure Indicators: A referenced file path does not exist (speculative architecture)
    Evidence: .omo/evidence/task-5-architecture-paths.txt

  Scenario: All required sections present
    Tool: Bash (Read)
    Preconditions: File exists at ARCHITECTURE.md
    Steps:
      1. Read ARCHITECTURE.md full content
      2. grep "Monorepo Layout" → assert found
      3. grep "Auth Flow" → assert found
      4. grep "Tool Registry" → assert found
      5. grep "requireSessionUser\|requireSessionUser" → assert found (auth method cited)
      6. grep "registerTool" → assert found (registration method cited)
      7. grep "middleware.ts" → assert NOT found as active component (check context: should say "no middleware.ts" or similar)
    Expected Result: Complete architecture documentation grounded in real code
    Failure Indicators: Missing major section, speculative file references
    Evidence: .omo/evidence/task-5-architecture-content.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `ARCHITECTURE.md`

- [x] 6. Create CHANGELOG.md — curated commit history

  **What to do**:
  - Create `CHANGELOG.md` at repo root
  - Use [Keep a Changelog](https://keepachangelog.com/) format
  - Header: "# Changelog" + explanation that this is the initial documentation from git history
  - Single version entry: `## [0.0.1] - 2026-06-04` (initial release)
  - Group the 5 existing commits under conventional commit categories:
    - **Added**: Feature descriptions for Charger-Reminder and CoreHour (what the initial `main` branch delivers)
    - **Setup**: Build tooling, pnpm workspace, TypeScript strict mode, ESLint, Vitest, Playwright
    - **Infrastructure**: Supabase (Postgres + Auth), migrations, RLS policies, mock auth for E2E
  - Bottom: link section with `[0.0.1]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1` (even if tag doesn't exist yet — follows Keep a Changelog convention)
  - Reconstruct the actual 5 commits:
    - `chore: record final boulder completion state`
    - `chore: fix boulder.json corruption, mark complete`
    - `chore: mark boulder as completed`
    - `docs: add task evidence and research reports`
    - `chore: mark F1-F2 complete, finalize post-foundation cleanup`

  **Must NOT do**:
  - Do NOT dump raw commit messages verbatim — curate into meaningful grouped bullets
  - Do NOT invent features, versions, or dates that don't exist
  - Do NOT include `boulder.json` or `.omo/` internal references — these are dev artifacts
  - Do NOT create future version sections (v0.0.2, v1.0, etc.)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Curated changelog from git history — requires judgment to group and describe
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `git log --oneline` (5 commits): `7402f1a chore: record final boulder completion state`, `2911616 chore: fix boulder.json corruption, mark complete`, `7110a37 chore: mark boulder as completed`, `1abf8c2 docs: add task evidence and research reports`, `5eff901 chore: mark F1-F2 complete, finalize post-foundation cleanup`
  - `package.json:3` — Version `0.0.1`
  - Keep a Changelog format: https://keepachangelog.com/en/1.1.0/

  **Acceptance Criteria**:
  - [ ] File exists at `CHANGELOG.md`
  - [ ] Uses Keep a Changelog format (`## [0.0.1]`, categories like `### Added`, `### Changed`)
  - [ ] Contains project name/description in header
  - [ ] Version matches package.json (`0.0.1`)
  - [ ] Groups changes under semantic categories (not raw commit dump)
  - [ ] Contains link section at bottom
  - [ ] Does NOT contain `boulder.json` or `.omo/` references

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Changelog follows Keep a Changelog format
    Tool: Bash
    Preconditions: File exists at CHANGELOG.md
    Steps:
      1. Read CHANGELOG.md full content
      2. grep "## \\[0.0.1\\]" → assert found (version header)
      3. grep "### Added" → assert found (conventional category)
      4. grep "boulder.json" → assert NOT found (no internal artifacts)
      5. grep "\\.omo/" → assert NOT found (no internal artifacts)
      6. grep "\\[0.0.1\\]:" → assert found (link reference at bottom)
      7. Count lines → assert < 60 (curated, not verbose)
    Expected Result: Clean Keep a Changelog format, no internal references
    Failure Indicators: Raw commit messages, internal artifact references, wrong format
    Evidence: .omo/evidence/task-6-changelog.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `CHANGELOG.md`

- [x] 7. Replace apps/web/README.md — redirect stub

  **What to do**:
  - Overwrite `apps/web/README.md` completely (replace stock create-next-app template)
  - New content (~15-20 lines max):
    ```markdown
    # apps/web

    This is the web application package for EfficiencyMemo — the only deployable surface in the monorepo.

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
    ```
  - Links use `../../` paths since `apps/web/` is two levels deep from root

  **Must NOT do**:
  - Do NOT include feature descriptions (that's in root README)
  - Do NOT duplicate tech stack or architecture content
  - Do NOT reference `create-next-app`, Geist font, or Vercel deploy
  - Do NOT exceed 25 lines
  - Do NOT check for tooling references before replacing — verified none exist (no package.json references to this README)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Short replacement file with simple relative links
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - Existing `apps/web/README.md` — File to replace (stock template, 36 lines)
  - `apps/web/AGENTS.md` — Confirms this is the only deployable surface
  - Root `AGENTS.md` — Project context

  **Acceptance Criteria**:
  - [ ] File exists at `apps/web/README.md` and is ≤25 lines
  - [ ] No longer contains "create-next-app", "Geist", or "Vercel" references
  - [ ] Contains link to `../../README.md`
  - [ ] Contains link to `../../ARCHITECTURE.md`
  - [ ] Contains link to `../../CONTRIBUTING.md`
  - [ ] Contains `pnpm dev`, `pnpm test`, `pnpm test:e2e` commands

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Redirect stub replaces boilerplate completely
    Tool: Bash
    Preconditions: File exists at apps/web/README.md
    Steps:
      1. Read apps/web/README.md full content
      2. grep "create-next-app" → assert NOT found
      3. grep "Geist" → assert NOT found
      4. grep "Vercel" → assert NOT found
      5. grep "../../README.md" → assert found
      6. grep "../../ARCHITECTURE.md" → assert found
      7. grep "../../CONTRIBUTING.md" → assert found
      8. grep "pnpm dev" → assert found
      9. Count lines → assert ≤25
    Expected Result: Clean redirect stub with no boilerplate traces
    Failure Indicators: Boilerplate references found, no root links, exceeds 25 lines
    Evidence: .omo/evidence/task-7-redirect-stub.txt
  ```

  **Commit**: YES (groups with all)
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `apps/web/README.md`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Verify no source code files were modified (only .md files + LICENSE). Check AGENTS.md still contains all original constraints except the removed line. Verify markdown rendering: no broken links, valid heading hierarchy. Check LICENSE contains correct copyright holder and standard MIT text.
  Output: `Source code unchanged [PASS/FAIL] | AGENTS.md intact [PASS/FAIL] | Markdown valid [N/N files] | LICENSE valid [PASS/FAIL] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task — read each file, verify content against acceptance criteria. Test cross-file linking: README links to CONTRIBUTING.md, ARCHITECTURE.md, and LICENSE. Verify AGENTS.md no longer bans README generation. Verify apps/web/README.md is a redirect stub.
  Output: `Scenarios [N/N pass] | Cross-links [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual file. Verify 1:1 — everything in spec was created (no missing), nothing beyond spec was created (no creep). Check "Must NOT do" compliance. Detect unaccounted changes via `git diff --stat`.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- Commit all 7 files together in a single atomic commit:
  - Message: `docs: add project documentation suite (README, CONTRIBUTING, LICENSE, ARCHITECTURE, CHANGELOG)`
  - Files: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `ARCHITECTURE.md`, `CHANGELOG.md`, `AGENTS.md`, `apps/web/README.md`

---

## Success Criteria

### Verification Commands
```bash
# Verify all 7 files exist
ls -la README.md CONTRIBUTING.md LICENSE ARCHITECTURE.md CHANGELOG.md AGENTS.md apps/web/README.md

# Verify AGENTS.md no longer bans README
grep -c "Do not generate README" AGENTS.md  # Expected: 0

# Verify LICENSE contains copyright
grep -c "Copyright (c) 2026 HashTagGit" LICENSE  # Expected: 1

# Verify only intended files changed
git diff --stat  # Expected: exactly 7 files
```

### Final Checklist
- [ ] All "Must Have" present in each file
- [ ] All "Must NOT Have" absent across the repo
- [ ] All markdown files render correctly
- [ ] Internal links between docs resolve
- [ ] No source code modified (only docs)
