# Repo Cleanup — Second-Round Evaluation

## TL;DR

> **Quick Summary**: Systematically remove temporary files, tracked artifacts, and dead code (user-approved only) from the EfficiencyMemo monorepo, verify after each risk tier via `pnpm typecheck && pnpm test`, and fix documentation/config drift.
>
> **Deliverables**:
> - Clean working tree free of build artifacts, logs, screenshots, boilerplate, and duplicate lockfiles
> - 5 gitignore entries added for discovered clutter patterns
> - 2 unused devDependencies removed
> - 4 documentation files updated with accurate test counts and corrected claims
> - 9 config drifts resolved (vitest version, missing deps, tsconfig, etc.)
>
> **Estimated Effort**: Short (1–4h)
> **Parallel Execution**: YES — 5 waves, max 8 tasks per wave
> **Critical Path**: Wave 0 → Wave 1 → Wave 2 → Wave 3 (user review) → Wave 4 → Final Verification

---

## Context

### Original Request
User: "now i need a clean up on the out-dated files, give me a full clean up report."

After receiving a comprehensive 3-agent audit report identifying ~30+ cleanup candidates, the user requested a "second-round evaluation" with cautious risk-tiering: prioritize temporary/test files first, code deletions only with explicit user approval.

### Interview Summary
**Key Discussions**:
- **Risk tolerance**: Prefer safe deletions; source code deletions require per-candidate user approval
- **Verification**: Run `pnpm typecheck && pnpm test` after each wave (regression gate)
- **Scope priority**: Temp files → tracked artifacts → code (with approval) → config/docs

**Research Findings**:
- 3 parallel audit agents confirmed: 6 source files dead, 2 with dead exports only, 2 unused deps, 5 default SVGs, 1 duplicate lockfile, 12+ tracked evidence PNGs, 4 doc errors, 9 config drifts
- Baseline verified: `pnpm test` passes (37 files, 364 tests); `pnpm typecheck` has pre-existing failure in `packages/shared/src/__tests__/types.test.ts` (not blocking, not in cleanup scope)
- Metis flagged 3 false-positive deletion candidates: `buildMockMagicLink` (used by e2e), `discovery.ts` (live featureNames), `server-actions.ts` (keep for user review)

### Metis Review
**Identified Gaps** (addressed):
- `pnpm test` baseline claimed broken → verified green (37 files, 364 pass)
- `buildMockMagicLink` marked dead → reclassified as LIVE (used by e2e tests)
- `discovery.ts` marked for full deletion → reclassified as export-only cleanup (featureNames is live)
- `routes.ts` marked for full deletion → reclassified as export-only cleanup
- `server-actions.ts` flagged as potentially live → kept in Wave 3 for user decision
- Co-deletion of test files when source deleted → added to plan
- `.omo/` handling policy → added to Wave 2 as tracked evidence cleanup
- Baseline fix needed → added Wave 0

### Oracle Phase 1 Review
**Issues resolved**:
- Added single-sentence Core Objective
- Replaced vague Scope IN categories with concrete file inventory
- Declared explicit Test Strategy (tests-after, no new tests, co-deletion)
- Referenced audit agent outputs directly in Context

---

## Work Objectives

### Core Objective
Remove all temporary, unused, and duplicated files from the EfficiencyMemo repository so that the working tree is clean, minimal, and free of build artifacts, boilerplate, and evidence files that leaked into tracked source directories — without modifying any live production code.

### Concrete Deliverables
- 4 gitignored disk-litter files deleted (dev.log, tsconfig.tsbuildinfo, test-results/, playwright-report/)
- 12 tracked `.omo/evidence/*.png` files removed via `git rm`
- 1 tracked `.playwright-mcp/` artifact removed via `git rm`
- 2 tracked evidence PNGs at `apps/web/` removed via `git rm`
- 5 tracked default SVGs in `apps/web/public/` removed via `git rm`
- 1 tracked duplicate lockfile `apps/web/pnpm-lock.yaml` removed via `git rm`
- 2 orphaned capture scripts `packages/ui/scripts/capture-*.mjs` removed via `git rm`
- 1 untracked root log `console-errors.log` deleted
- `.next/` build output directory deleted
- 6 source code deletion candidates presented for user approval (Wave 3)
- 2 unused devDeps removed (`tsx` from apps/web, `@vitejs/plugin-react` from root)
- 5 gitignore entries added
- 4 documentation files updated
- 9 config drifts resolved

### Definition of Done
- [ ] `pnpm test` passes with zero failures (same 364 tests, minus any co-deleted test files)
- [ ] `git status --short` shows no unintended changes
- [ ] All Wave 3 candidates explicitly approved or rejected by user
- [ ] All gitignore entries committed and verified
- [ ] 4 docs match actual test counts and command behavior

### Must Have
- Verification after each wave (regression gate)
- User approval for ALL source code deletions (Wave 3)
- Co-deletion of test files when source deleted
- Git operations (`git rm`) for tracked file removal
- No modification to live production code or SQL migrations

### Must NOT Have (Guardrails)
- NO renaming, moving, or modifying any live production file
- NO updating dependency versions (only removing unused deps)
- NO changing TypeScript types, function signatures, or behavior
- NO fixing the pre-existing typecheck failure in `packages/shared/__tests__/types.test.ts`
- NO deleting `discovery.ts` or `routes.ts` in full (only dead exports within them)
- NO deleting `buildMockMagicLink` (used by e2e tests)
- NO modifying SQL migrations
- NO adding new dependencies or packages

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (existing suite as regression gate; no new tests)
- **Framework**: Vitest (364 cases) + Playwright (53 cases) + `pnpm typecheck`
- **Strategy**: Run full test suite after each wave; co-delete test files when source deleted

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI/File ops**: Use Bash — verify file existence/absence, verify git status
- **Test suite**: Use Bash — run `pnpm test`, assert exit code 0, assert test count matches expected

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Start Immediately — baseline check):
├── Task 0: Verify baseline (pnpm install + pnpm test green) [quick]

Wave 1 (After Wave 0 — delete untracked clutter, MAX PARALLEL):
├── Task 1: Delete console-errors.log (root) [quick]
├── Task 2: Delete apps/web/dev.log [quick]
├── Task 3: Delete apps/web/tsconfig.tsbuildinfo [quick]
├── Task 4: Delete apps/web/test-results/ and playwright-report/ [quick]
└── Task 5: Delete apps/web/.next/ [quick]

Wave 2 (After Wave 1 — git rm tracked artifacts, MAX PARALLEL):
├── Task 6: git rm 5 default SVGs in apps/web/public/ [quick]
├── Task 7: git rm apps/web/pnpm-lock.yaml [quick]
├── Task 8: git rm 2 evidence PNGs in apps/web/ [quick]
├── Task 9: git rm 12 .omo/evidence/*.png [quick]
├── Task 10: git rm 1 .playwright-mcp artifact + untracked YAML [quick]
└── Task 11: git rm 2 capture scripts in packages/ui/scripts/ [quick]

Wave 3 (After Wave 2 — code review candidates, USER APPROVAL REQUIRED):
├── Task 12: Review & execute candidate 1 — sign-out-form.tsx [quick]
├── Task 13: Review & execute candidate 2 — mock-bypass.ts [quick]
├── Task 14: Review & execute candidate 3 — update-device.ts [quick]
├── Task 15: Review & execute candidate 4 — session-controller.tsx + check-in-modal.tsx [quick]
└── Task 16: Review & execute candidate 5 — server-actions.ts (core-hour) [quick]

Wave 4 (After Wave 3 — config/docs fixes, MAX PARALLEL):
├── Task 17: Remove 2 unused devDeps from package.json [quick]
├── Task 18: Add 5 gitignore entries [quick]
├── Task 19: Fix stale test counts in 4 docs [quick]
├── Task 20: Fix misleading "fan out to all packages" + broken build example [quick]
├── Task 21: Fix README missing start script + landing page [quick]
├── Task 22: Fix ARCHITECTURE.md "three Supabase clients" claim [quick]
├── Task 23: Fix 9 config drifts (vitest version, packageManager, missing deps, tsconfig, vitest aliases, supabase config.toml, .env.example, eslint, packages scripts) [quick]
└── Task 24: Final verification (full test suite + git status check) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 0 → Tasks 1-5 → Tasks 6-11 → Tasks 12-16 (user review) → Tasks 17-24 → F1-F4 → user okay
Parallel Speedup: ~80% faster than sequential
Max Concurrent: 8 (Waves 1 & 4)
```

### Dependency Matrix

- **0**: — — 1-5, 0
- **1-5**: 0 — 6-11, 1
- **6-11**: 1-5 — 12-16, 2
- **12-16**: 6-11 — 17-24, 3 (sequential within wave per user review)
- **17-23**: 12-16 — 24, 4
- **24**: 17-23 — F1-F4, 4
- **F1-F4**: 24 — —, FINAL

### Agent Dispatch Summary

- **0**: **1** - T0 → `quick`
- **1**: **5** - T1-T5 → `quick`
- **2**: **6** - T6-T11 → `quick`
- **3**: **5** - T12-T16 → `quick` (sequential, user-reviewed)
- **4**: **8** - T17-T24 → `quick`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 0. Baseline Verification

  **What to do**:
  - Run `pnpm install` to ensure dependencies are synced
  - Run `pnpm test` to confirm test suite is green
  - Run `pnpm typecheck` to confirm typecheck status (note pre-existing failure)
  - Record baseline test count (364 Vitest + test file count)

  **Must NOT do**:
  - Do NOT fix the pre-existing typecheck failure in `packages/shared/__tests__/types.test.ts`
  - Do NOT modify any source files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single verification step, no code changes
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None — pure bash verification

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocker for all other tasks)
  - **Parallel Group**: Wave 0 (standalone)
  - **Blocks**: All tasks in Waves 1-4
  - **Blocked By**: None (can start immediately)

  **Acceptance Criteria**:
  - [ ] `pnpm test` exits with code 0, at least 364 tests pass
  - [ ] Baseline test file count recorded (expect 37 files)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Baseline test suite is green
    Tool: Bash
    Steps:
      1. cd D:\documents\code\git\release\efficiency-memo
      2. $env:CI="true"; pnpm install 2>&1
      3. pnpm test 2>&1
      4. Assert output contains "Tests 364 passed"
      5. Assert exit code is 0
    Expected Result: All 364 tests pass, zero failures
    Failure Indicators: Any test failure, non-zero exit code
    Evidence: .omo/evidence/task-0-baseline.txt

  Scenario: Typecheck status documented
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1
      2. Assert output contains the pre-existing types.test.ts errors (expected)
      3. Note: this failure is pre-existing and NOT in cleanup scope
    Expected Result: Same pre-existing errors, no new errors
    Evidence: .omo/evidence/task-0-typecheck.txt
  ```

  - [ ] Task evidence files exist in `.omo/evidence/`

  **Commit**: NO (verification only)

- [x] 1. Delete console-errors.log (root)

  **What to do**:
  - Verify the file is untracked: `git ls-files console-errors.log` (expect empty)
  - Delete the file: `Remove-Item console-errors.log`
  - Verify deletion: file no longer exists

  **Must NOT do**:
  - Do NOT `git rm` (file is untracked)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file deletion, no code dependencies
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **Acceptance Criteria**:
  - [ ] `console-errors.log` no longer exists at repo root
  - [ ] `git status --short` does not show this file

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: File deleted and not tracked
    Tool: Bash
    Steps:
      1. Test-Path "console-errors.log" | Should -BeFalse
      2. git ls-files console-errors.log | Should -BeNullOrEmpty
    Expected Result: File gone, not in git index
    Evidence: .omo/evidence/task-1-console-errors.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-1-console-errors.txt` — before/after file listing

  **Commit**: NO (filesystem cleanup only)

- [x] 2. Delete apps/web/dev.log

  **What to do**:
  - Verify the file is untracked (not in git ls-files)
  - Delete the file: `Remove-Item apps/web/dev.log`
  - Note: `.gitignore` already covers `*.log` but this specific file was present on disk

  **Must NOT do**:
  - Do NOT `git rm`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **Acceptance Criteria**:
  - [ ] `apps/web/dev.log` no longer exists on disk

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: dev.log deleted
    Tool: Bash
    Steps:
      1. Test-Path "apps/web/dev.log" | Should -BeFalse
    Expected Result: File gone
    Evidence: .omo/evidence/task-2-dev-log.txt
  ```

  **Commit**: NO

- [x] 3. Delete apps/web/tsconfig.tsbuildinfo

  **What to do**:
  - Delete the TypeScript incremental build cache file
  - Already covered by `*.tsbuildinfo` in `.gitignore`

  **Must NOT do**:
  - Do NOT `git rm` (untracked)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **Acceptance Criteria**:
  - [ ] `apps/web/tsconfig.tsbuildinfo` no longer exists

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: tsbuildinfo deleted
    Tool: Bash
    Steps:
      1. Test-Path "apps/web/tsconfig.tsbuildinfo" | Should -BeFalse
    Expected Result: File gone
    Evidence: .omo/evidence/task-3-tsbuildinfo.txt
  ```

  **Commit**: NO

- [x] 4. Delete apps/web/test-results/ and playwright-report/

  **What to do**:
  - Remove both directories (Playwright output artifacts)
  - Contents: `.last-run.json` in test-results, `index.html` in playwright-report
  - Both are gitignored but present on disk

  **Must NOT do**:
  - Do NOT `git rm`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **Acceptance Criteria**:
  - [ ] `apps/web/test-results/` directory no longer exists
  - [ ] `apps/web/playwright-report/` directory no longer exists

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Test artifact directories deleted
    Tool: Bash
    Steps:
      1. Test-Path "apps/web/test-results" | Should -BeFalse
      2. Test-Path "apps/web/playwright-report" | Should -BeFalse
    Expected Result: Both directories gone
    Evidence: .omo/evidence/task-4-test-artifacts.txt
  ```

  **Commit**: NO

- [x] 5. Delete apps/web/.next/

  **What to do**:
  - Remove the Next.js build output directory
  - Already covered by `.next/` in `.gitignore`

  **Must NOT do**:
  - Do NOT `git rm`
  - Do NOT delete any source files under `apps/web/src/`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **Acceptance Criteria**:
  - [ ] `apps/web/.next/` directory no longer exists

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: .next build output deleted
    Tool: Bash
    Steps:
      1. Test-Path "apps/web/.next" | Should -BeFalse
    Expected Result: Build directory gone (will regenerate on next build)
    Evidence: .omo/evidence/task-5-next-build.txt
  ```

  **Commit**: NO

- [x] 6. git rm 5 default SVGs in apps/web/public/

  **What to do**:
  - Remove the 5 default Next.js boilerplate SVGs tracked in git: `window.svg`, `vercel.svg`, `next.svg`, `globe.svg`, `file.svg`
  - Use `git rm apps/web/public/{window,vercel,next,globe,file}.svg`
  - Verify zero importers: grep for these filenames across `apps/web/src` returned 0 matches (confirmed by audit agent bg_3538294a)

  **Must NOT do**:
  - Do NOT delete `favicon.ico` (confirmed used by app)
  - Do NOT delete any custom assets that were added after the boilerplate

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple git rm, no code impact (0 importers confirmed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **Acceptance Criteria**:
  - [ ] 5 SVG files no longer in git index (`git ls-files` confirms removal)
  - [ ] `pnpm test` still passes (364 tests)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: SVGs removed from git and disk
    Tool: Bash
    Steps:
      1. git ls-files apps/web/public/window.svg | Should -BeNullOrEmpty
      2. git ls-files apps/web/public/vercel.svg | Should -BeNullOrEmpty
      3. git ls-files apps/web/public/next.svg | Should -BeNullOrEmpty
      4. git ls-files apps/web/public/globe.svg | Should -BeNullOrEmpty
      5. git ls-files apps/web/public/file.svg | Should -BeNullOrEmpty
    Expected Result: All 5 removed from git tracking
    Evidence: .omo/evidence/task-6-svgs-removed.txt

  Scenario: Test suite still green after SVG removal
    Tool: Bash
    Steps:
      1. pnpm test 2>&1
      2. Assert "Tests 364 passed"
    Expected Result: No regression (SVGs had zero importers)
    Failure Indicators: Any test failure
    Evidence: .omo/evidence/task-6-post-test.txt
  ```

  **Commit**: YES (groups with Tasks 7-11)
  - Message: `chore: remove 5 default Next.js boilerplate SVGs from public/`
  - Files: `apps/web/public/window.svg`, `apps/web/public/vercel.svg`, `apps/web/public/next.svg`, `apps/web/public/globe.svg`, `apps/web/public/file.svg`

- [x] 7. git rm apps/web/pnpm-lock.yaml

  **What to do**:
  - Remove the tracked duplicate lockfile from `apps/web/`
  - The canonical lockfile is at repo root (`pnpm-lock.yaml`)
  - In a pnpm workspace, there should be exactly ONE lockfile at the root
  - Use `git rm apps/web/pnpm-lock.yaml`

  **Must NOT do**:
  - Do NOT delete the root `pnpm-lock.yaml` — that is the real one
  - Do NOT run `pnpm install` from inside `apps/web/` directory (could regenerate it)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple git rm, no code impact

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] `apps/web/pnpm-lock.yaml` no longer in git index
  - [ ] Root `pnpm-lock.yaml` untouched
  - [ ] `pnpm test` still passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Duplicate lockfile removed, root lockfile intact
    Tool: Bash
    Steps:
      1. git ls-files apps/web/pnpm-lock.yaml | Should -BeNullOrEmpty
      2. Test-Path "pnpm-lock.yaml" | Should -BeTrue
      3. pnpm test 2>&1
      4. Assert "Tests 364 passed"
    Expected Result: Only root lockfile remains, tests green
    Evidence: .omo/evidence/task-7-lockfile.txt
  ```

  **Commit**: YES (groups with Tasks 6, 8-11)
  - Message: `chore: remove duplicate apps/web/pnpm-lock.yaml (root is canonical)`
  - Files: `apps/web/pnpm-lock.yaml`

- [x] 8. git rm 2 evidence PNGs in apps/web/

  **What to do**:
  - Remove `apps/web/task-26-mock-auth.png` and `apps/web/task-26-mock-auth-cr.png`
  - These are task-26 evidence screenshots committed at the deployable package root
  - `task-26-mock-auth.png` is regenerated by Playwright spec `e2e/mock-auth.spec.ts` on every run
  - `task-26-mock-auth-cr.png` has zero references anywhere

  **Must NOT do**:
  - Do NOT delete the `.omo/evidence/task-26-mock-auth.png` (canonical evidence location)
  - Do NOT modify the Playwright spec that writes to this path

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] Both PNGs removed from git index
  - [ ] `pnpm test:e2e` still works (spec regenerates the file as output)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Evidence PNGs removed from tracking
    Tool: Bash
    Steps:
      1. git ls-files apps/web/task-26-mock-auth.png | Should -BeNullOrEmpty
      2. git ls-files apps/web/task-26-mock-auth-cr.png | Should -BeNullOrEmpty
    Expected Result: Both removed from git
    Evidence: .omo/evidence/task-8-evidence-pngs.txt
  ```

  **Commit**: YES (groups with Tasks 6-7, 9-11)
  - Message: `chore: remove stray task-26 evidence PNGs from apps/web/`
  - Files: `apps/web/task-26-mock-auth.png`, `apps/web/task-26-mock-auth-cr.png`

- [x] 9. git rm 12 .omo/evidence/*.png

  **What to do**:
  - Remove the 12 tracked `.omo/evidence/task-*-*.png` files committed in initial commits
  - These are task evidence screenshots (task-5, task-7, task-8, task-14, task-19, task-20, task-26)
  - The `.txt` evidence files are also tracked and serve as the lightweight audit trail
  - Use `git rm .omo/evidence/task-*.png`

  **Must NOT do**:
  - Do NOT delete `.omo/evidence/task-*.txt` files (lightweight evidence)
  - Do NOT delete `.omo/boulder.json` (task state)
  - Do NOT delete `.omo/plans/` or `.omo/drafts/`
  - Do NOT remove the entire `.omo/` directory

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] 12 PNG files removed from git index
  - [ ] `.omo/evidence/task-*.txt` files still tracked
  - [ ] `.omo/boulder.json` still tracked

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Evidence PNGs removed, txt evidence preserved
    Tool: Bash
    Steps:
      1. git ls-files .omo/evidence/ | Select-String "\.png$" | Should -BeNullOrEmpty
      2. git ls-files .omo/evidence/task-1-config-check.txt | Should -Not -BeNullOrEmpty
    Expected Result: PNGs gone, txt files remain
    Evidence: .omo/evidence/task-9-omo-evidence.txt
  ```

  **Commit**: YES
  - Message: `chore: remove tracked .omo/evidence PNGs (txt evidence preserved)`
  - Files: `.omo/evidence/task-*.png` (12 files)

- [x] 10. git rm .playwright-mcp artifact + delete untracked files

  **What to do**:
  - Remove the tracked `.playwright-mcp/page-2026-05-31T17-03-07-337Z.png`
  - Delete untracked `.playwright-mcp/page-2026-06-05T06-52-08-438Z.yml`
  - Verify `.playwright-mcp/` directory exists (tool artifact)

  **Must NOT do**:
  - Do NOT remove the entire `.playwright-mcp/` directory — it may contain active config

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] Tracked `.playwright-mcp/page-*.png` removed from git index
  - [ ] Untracked `.playwright-mcp/page-*.yml` deleted from disk

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Playwright MCP artifacts cleaned
    Tool: Bash
    Steps:
      1. git ls-files .playwright-mcp/page-2026-05-31T17-03-07-337Z.png | Should -BeNullOrEmpty
      2. Test-Path ".playwright-mcp/page-2026-06-05T06-52-08-438Z.yml" | Should -BeFalse
    Expected Result: Artifacts removed
    Evidence: .omo/evidence/task-10-playwright-mcp.txt
  ```

  **Commit**: YES
  - Message: `chore: remove stale .playwright-mcp artifacts`
  - Files: `.playwright-mcp/page-2026-05-31T17-03-07-337Z.png`

- [x] 11. git rm 2 capture scripts in packages/ui/scripts/

  **What to do**:
  - Remove `packages/ui/scripts/capture-shell.mjs` and `packages/ui/scripts/capture-sidebar.mjs`
  - These are one-off Task 5 evidence-capture scripts
  - Hard-code `tool-a`/`tool-b` (not real tool IDs)
  - Write output to `.omo/evidence/task-5-*.png` (already covered in task 9)
  - Not referenced by any `package.json` script
  - Use bare `playwright` import (not `@playwright/test`, not a declared dep)

  **Must NOT do**:
  - Do NOT delete `packages/ui/` source components

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **Acceptance Criteria**:
  - [ ] Both `.mjs` files removed from git index
  - [ ] `packages/ui/scripts/` directory is now empty or nonexistent

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Capture scripts removed
    Tool: Bash
    Steps:
      1. git ls-files packages/ui/scripts/capture-shell.mjs | Should -BeNullOrEmpty
      2. git ls-files packages/ui/scripts/capture-sidebar.mjs | Should -BeNullOrEmpty
    Expected Result: Scripts removed; no package.json script references them
    Evidence: .omo/evidence/task-11-capture-scripts.txt
  ```

  **Commit**: YES
  - Message: `chore: remove one-off capture scripts from packages/ui/scripts/`
  - Files: `packages/ui/scripts/capture-shell.mjs`, `packages/ui/scripts/capture-sidebar.mjs`

- [ ] 12. Review & execute candidate 1 — sign-out-form.tsx + its test

  **What to do**:
  - **PRESENT to user**: `apps/web/src/components/auth/sign-out-form.tsx` exports `SignOutForm` with zero importers. The shell layout (`app/(shell)/shell-layout-client.tsx`) passes `signOutAction` directly to the `Shell` component's `onSignOut` prop — no form wrapper is rendered. The file's own test (`components/auth/__tests__/`) only imports this component.
  - **If user approves**: `git rm apps/web/src/components/auth/sign-out-form.tsx` + its test file
  - **If user rejects**: skip, mark as KEPT

  **Must NOT do**:
  - Do NOT delete `sign-out-form.tsx` without user's explicit "yes"
  - Do NOT delete `sign-in-form.tsx` (live, used by sign-in page)
  - Do NOT delete `signOutAction` from `lib/auth/actions.ts` (still used by shell layout)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential within Wave 3 per user review)
  - **Parallel Group**: Wave 3 (first of 5 sequential candidates)
  - **Blocks**: None
  - **Blocked By**: Tasks 6-11 (Wave 2)

  **References**:
  - `apps/web/src/app/(shell)/shell-layout-client.tsx:42` — shows `onSignOut` prop usage, not `SignOutForm`
  - Audit agent bg_3538294a confirmed zero importers

  **Acceptance Criteria**:
  - [ ] User explicitly approved or rejected
  - [ ] If approved: file + test removed from git index
  - [ ] `pnpm test` still passes (test file also removed)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: User-approved deletion verified
    Tool: Bash (pre-check only — actual deletion after user approval)
    Preconditions: User says "yes"
    Steps:
      1. git rm apps/web/src/components/auth/sign-out-form.tsx
      2. pnpm test 2>&1
      3. Assert "Tests N passed" (364 minus sign-out test count)
    Expected Result: Test suite green, sign-out-form gone
    Evidence: .omo/evidence/task-12-signout-form.txt

  Scenario: User-rejected — no action
    Tool: None (manual decision)
    Preconditions: User says "no"
    Steps:
      1. Record rejection in evidence file
    Expected Result: File kept, noted as intentionally preserved
    Evidence: .omo/evidence/task-12-kept.txt
  ```

  **Commit**: YES (if approved)
  - Message: `chore: remove unused sign-out-form.tsx (shell uses onSignOut prop directly)`
  - Files: `apps/web/src/components/auth/sign-out-form.tsx`

- [ ] 13. Review & execute candidate 2 — mock-bypass.ts

  **What to do**:
  - **PRESENT to user**: `apps/web/src/features/charger-reminder/auth/mock-bypass.ts` exports `mockBypassAction` (server action) with zero importers. The actual mock auth flow uses the API route at `app/api/mock-auth/bypass/route.ts`. This server action was never wired to any form or component. No test file imports it. AGENTS.md mentions it on line 10 — will need a doc update if deleted.

  **If user approves**: `git rm` the file.

  **Must NOT do**:
  - Do NOT delete `mock.ts` (live — MOCK_AUTH_COOKIE, isMockAuthEnabled, normalizeAuthEmail, getMockAuthCookieOptions all used)
  - Do NOT modify the API bypass route handler

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (second of 5)
  - **Blocks**: None
  - **Blocked By**: Task 12

  **References**:
  - `apps/web/src/app/api/mock-auth/bypass/route.ts` — the live alternative
  - Audit agent bg_3538294a confirmed zero importers

  **Acceptance Criteria**:
  - [ ] User explicitly approved or rejected
  - [ ] If approved: file removed, `pnpm test` still passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: User-approved or rejected
    Tool: Bash / manual
    Steps:
      1. Present candidate to user with evidence
      2. If approved: git rm, pnpm test, verify green
      3. If rejected: record in evidence
    Evidence: .omo/evidence/task-13-mock-bypass.txt
  ```

  **Commit**: YES (if approved)
  - Message: `chore: remove unused mock-bypass server action (API route is canonical)`

- [ ] 14. Review & execute candidate 3 — update-device.ts

  **What to do**:
  - **PRESENT to user**: `apps/web/src/app/(shell)/tools/charger-reminder/_actions/update-device.ts` exports `updateDeviceAction` (server action) with zero importers. The edit form at `[id]/edit/edit-form.tsx:6` calls `updateDevice` directly from `@/features/charger-reminder/database/devices` (which is also a `"use server"` file, so it's already a server action). The wrapper action is redundant. The sibling `create-device.ts` IS used — keep that.

  **If user approves**: `git rm` the file.

  **Must NOT do**:
  - Do NOT delete `_actions/create-device.ts` (live, used by `new/page.tsx`)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (third of 5)
  - **Blocks**: None
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] User explicitly approved or rejected

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Approved deletion
    Tool: Bash
    Steps:
      1. git rm apps/web/src/app/(shell)/tools/charger-reminder/_actions/update-device.ts
      2. pnpm test 2>&1
      3. Assert green
    Evidence: .omo/evidence/task-14-update-device.txt
  ```

  **Commit**: YES (if approved)
  - Message: `chore: remove unused updateDeviceAction (edit form calls updateDevice directly)`

- [ ] 15. Review & execute candidate 4 — session-controller.tsx + check-in-modal.tsx + their tests

  **What to do**:
  - **PRESENT to user**: Two components in `apps/web/src/features/core-hour/components/`:
    1. `session-controller.tsx` — `SessionController` only imported by its own test
    2. `check-in-modal.tsx` — `CheckInModal` only imported by `session-controller.tsx` (transitively dead)
  - The dashboard (`app/(shell)/tools/core-hour/dashboard-page.tsx`) renders `<Dashboard>` + `<TagBar>` directly — neither component reaches production
  - Both have corresponding test files that would also be deleted
  - AGENTS.md lists them as "hook consumers" but the production tree doesn't use them

  **If user approves**: `git rm` both component files + both test files.

  **Must NOT do**:
  - Do NOT delete `Dashboard` or `TagBar` components (live)
  - Do NOT delete the hooks (useSession, useTimer, etc.)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (fourth of 5)
  - **Blocks**: None
  - **Blocked By**: Task 14

  **Acceptance Criteria**:
  - [ ] User explicitly approved or rejected
  - [ ] If approved: 4 files removed, `pnpm test` passes (364 - session-controller tests - check-in-modal tests)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Approved — 4 files deleted, tests green
    Tool: Bash
    Steps:
      1. Confirm user approval
      2. git rm all 4 files (2 components + 2 test files)
      3. pnpm test 2>&1
      4. Assert green, test count decremented correctly
    Evidence: .omo/evidence/task-15-session-controller.txt
  ```

  **Commit**: YES (if approved)
  - Message: `chore: remove unused session-controller and check-in-modal (dashboard uses Dashboard+TagBar directly)`
  - Files: 4 files (2 components + 2 tests)

- [ ] 16. Review & execute candidate 5 — server-actions.ts (core-hour)

  **What to do**:
  - **PRESENT to user**: `apps/web/src/features/core-hour/database/server-actions.ts` declares 10 Supabase-backed server actions (`startSession`, `endSession`, `listSessions`, `createTag`, etc.). All 10 are ONLY used by their own test file (`__tests__/server-actions.test.ts`). The feature actually uses local-DB implementations in `hooks/context.tsx` + `hooks/db.ts`.
  - **⚠️ Caution**: The `core-hour/AGENTS.md` says server actions are "the only path to Supabase," but the production code uses local DB. This looks like a planned Supabase migration that was abandoned mid-flight.
  - **Metis flagged this as potentially live** — user must confirm before deletion.

  **If user approves**: `git rm` server-actions.ts + its test file.

  **Must NOT do**:
  - Do NOT delete `hooks/context.tsx` or `hooks/db.ts` (live local-DB implementations)
  - Do NOT delete without user's explicit confirmation

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (fifth of 5)
  - **Blocks**: None
  - **Blocked By**: Task 15

  **References**:
  - `apps/web/src/features/core-hour/AGENTS.md:30-31` — mentions server-actions as Supabase path (may be aspirational)
  - Audit agent bg_463745c6 confirmed all 10 exports only referenced in own test

  **Acceptance Criteria**:
  - [ ] User explicitly confirmed "yes, this was abandoned"
  - [ ] If approved: 2 files removed, `pnpm test` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: User confirms abandoned, files deleted
    Tool: Bash
    Steps:
      1. User confirms deletion
      2. git rm server-actions.ts + its test
      3. pnpm test 2>&1
      4. Assert green
    Evidence: .omo/evidence/task-16-server-actions.txt
  ```

  **Commit**: YES (if approved)
  - Message: `chore: remove abandoned core-hour server-actions (feature uses local DB)`
  - Files: `apps/web/src/features/core-hour/database/server-actions.ts`, `__tests__/server-actions.test.ts`

- [ ] 17. Remove 2 unused devDeps from package.json

  **What to do**:
  - Remove `"tsx": "^4.22.4"` from `apps/web/package.json` line 36 — zero imports, zero script usage
  - Remove `"@vitejs/plugin-react": "^5.2.0"` from root `package.json` line 19 — only `apps/web/vitest.config.mts` imports it, resolves via apps/web's own `^4.7.0`
  - Run `pnpm install` after removal to update lockfile

  **Must NOT do**:
  - Do NOT remove `@vitejs/plugin-react` from `apps/web/package.json` (that one is used)
  - Do NOT update any version numbers — removal only

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18-23)
  - **Blocks**: Task 24 (final verification)
  - **Blocked By**: Tasks 12-16 (Wave 3)

  **Acceptance Criteria**:
  - [ ] `tsx` no longer in `apps/web/package.json` devDependencies
  - [ ] `@vitejs/plugin-react` no longer in root `package.json` devDependencies
  - [ ] `pnpm install` succeeds
  - [ ] `pnpm test` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Deps removed, install and test succeed
    Tool: Bash
    Steps:
      1. Edit apps/web/package.json: remove tsx line
      2. Edit package.json (root): remove @vitejs/plugin-react line
      3. pnpm install 2>&1
      4. pnpm test 2>&1
      5. Assert "Tests 364 passed"
    Expected Result: Install and test both green
    Evidence: .omo/evidence/task-17-deps-removed.txt
  ```

  **Commit**: YES (groups with Tasks 18-23)
  - Message: `chore: remove unused devDeps (tsx, @vitejs/plugin-react from root)`
  - Files: `apps/web/package.json`, `package.json`, `pnpm-lock.yaml`

- [ ] 18. Add 5 gitignore entries

  **What to do**:
  - Add the following lines to `apps/web/.gitignore`:
    1. `/dev.log` — dev server output (currently only covered by root `*.log`)
    2. `/test-results/` — Playwright output
    3. `/playwright-report/` — Playwright HTML report
    4. `task-26-*.png` — Playwright screenshot output from `e2e/mock-auth.spec.ts`
    5. `pnpm-lock.yaml` — prevent re-tracking in apps/web/ after deletion
  - Verify: `git status --short` no longer shows these as potential untracked files

  **Must NOT do**:
  - Do NOT modify root `.gitignore` — this task is for `apps/web/.gitignore` only
  - Do NOT remove existing entries

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 17, 19-23)
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16

  **Acceptance Criteria**:
  - [ ] All 5 entries present in `apps/web/.gitignore`
  - [ ] `pnpm test` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: gitignore entries added and verified
    Tool: Bash
    Steps:
      1. Edit apps/web/.gitignore: append the 5 entries
      2. git status --short apps/web/ 2>&1
      3. Assert no untracked clutter shows from these patterns
    Expected Result: Clean git status
    Evidence: .omo/evidence/task-18-gitignore.txt
  ```

  **Commit**: YES
  - Message: `chore: add gitignore entries for dev.log, test-results, playwright-report, task-26 PNGs, pnpm-lock`
  - Files: `apps/web/.gitignore`

- [ ] 19. Fix stale test counts in 4 docs

  **What to do**:
  - In `AGENTS.md:23`, `CONTRIBUTING.md:43-44`, `CHANGELOG.md:17-18`, `ARCHITECTURE.md:131,136`:
    - Replace "364 Vitest cases" with the actual current count (currently 364 as verified by `pnpm test` output)
    - Replace "42 Playwright cases" with the actual current count (currently 53 as verified by audit agent count)
  - Or: replace hard-coded numbers with a note like "Run `pnpm test` for current count"

  **Must NOT do**:
  - Do NOT change any other content in these files

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16

  **Acceptance Criteria**:
  - [ ] All 4 docs show correct test counts
  - [ ] `pnpm test` still passes (no behavior change)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Docs updated with accurate counts
    Tool: Bash
    Steps:
      1. Edit each of the 4 docs to reflect actual counts
      2. grep "364" AGENTS.md | Should -Not -BeNullOrEmpty (or new count)
      3. grep "53" AGENTS.md (or the actual current Playwright count)
    Expected Result: Counts match reality
    Evidence: .omo/evidence/task-19-doc-counts.txt
  ```

  **Commit**: YES
  - Message: `docs: update test counts to current actual values (364 Vitest, 53 Playwright)`
  - Files: `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `ARCHITECTURE.md`

- [ ] 20. Fix misleading "fan out to all packages" + broken build example

  **What to do**:
  - In `AGENTS.md:28-30` and `CONTRIBUTING.md:39-44`:
    - Replace "fan out to all packages" with accurate description: "build/lint run on apps/web; test/typecheck run on all packages"
  - In `AGENTS.md:30`:
    - Remove or fix the broken `pnpm --filter @memo/ui build` example (packages/ui has no build script)

  **Must NOT do**:
  - Do NOT add stub build scripts to packages/ui or packages/shared (that's a separate decision)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16

  **Acceptance Criteria**:
  - [ ] AGENTS.md no longer claims build/lint/dev fan out to all packages
  - [ ] Broken `@memo/ui build` example removed or corrected
  - [ ] CONTRIBUTING.md matches reality

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Docs accurately describe command fan-out
    Tool: Bash
    Steps:
      1. Edit AGENTS.md and CONTRIBUTING.md
      2. grep "fan out to all" AGENTS.md | Should -BeNullOrEmpty
      3. grep "@memo/ui build" AGENTS.md | Should -BeNullOrEmpty
    Expected Result: Misleading claims removed
    Evidence: .omo/evidence/task-20-doc-fanout.txt
  ```

  **Commit**: YES
  - Message: `docs: correct misleading "fan out to all packages" claims and broken build example`
  - Files: `AGENTS.md`, `CONTRIBUTING.md`

- [ ] 21. Fix README missing start script + landing page

  **What to do**:
  - Add `pnpm start` to `README.md:62-71` Scripts table
  - Add a one-liner noting the public landing page at `/` (rendered by `apps/web/src/app/page.tsx`)
  - CLIENTS.md is already correct (1-line redirect to AGENTS.md) — no changes needed

  **Must NOT do**:
  - Do NOT modify the landing page itself

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16

  **Acceptance Criteria**:
  - [ ] `pnpm start` appears in README Scripts table
  - [ ] Landing page mentioned in README

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: README updated
    Tool: Bash
    Steps:
      1. Edit README.md
      2. grep "pnpm start" README.md | Should -Not -BeNullOrEmpty
    Expected Result: Start command and landing page documented
    Evidence: .omo/evidence/task-21-readme.txt
  ```

  **Commit**: YES
  - Message: `docs: add pnpm start to README scripts table, document public landing page`
  - Files: `README.md`

- [ ] 22. Fix ARCHITECTURE.md "three Supabase clients" claim

  **What to do**:
  - In `ARCHITECTURE.md:116-122`:
    - If `proxy.ts` was deleted in Wave 3 (user approved): remove the `proxy.ts` line, update to "two Supabase clients"
    - If `proxy.ts` was kept: note that it exists but is not wired to a middleware
  - The doc already correctly states "There is NO `middleware.ts`" at line 45 — no change needed there

  **Must NOT do**:
  - Do NOT modify the accurate "no middleware" statement

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16 (depends on Wave 3 outcome)

  **Acceptance Criteria**:
  - [ ] ARCHITECTURE.md supabase clients section matches reality (2 or 3, as per Wave 3 outcome)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Architecture doc updated
    Tool: Bash
    Steps:
      1. Check Wave 3 outcome for proxy.ts
      2. Update ARCHITECTURE.md accordingly
    Expected Result: Doc matches actual client count
    Evidence: .omo/evidence/task-22-architecture.txt
  ```

  **Commit**: YES
  - Message: `docs: update ARCHITECTURE.md Supabase client count to match reality`
  - Files: `ARCHITECTURE.md`

- [ ] 23. Fix 9 config drifts

  **What to do**:
  1. **Root package.json**: Add `"packageManager": "pnpm@10.33.0"` (matches installed version)
  2. **Vitest version skew**: Update `apps/web/package.json` vitest from `^2.0.0` to `^3.0.0` to match `packages/ui` (or vice versa; choose consistency)
  3. **packages/shared/package.json**: Add `"vitest": "^3.0.0"` and `"typescript": "^5"` to devDependencies (currently relies on hoisting)
  4. **packages/ui/package.json**: Add `"test": "vitest run"` script and `"vitest": "^3.0.0"` to devDependencies
  5. **apps/web/vitest.config.mts**: Add `@memo/shared` and `@memo/ui` alias resolution to match tsconfig
  6. **tsconfig.base.json**: Remove `declaration`, `declarationMap`, `sourceMap` (all consumers use `noEmit: true`)
  7. **apps/web/.env.example**: Add commented mock-toggle vars (`NEXT_PUBLIC_ENABLE_AUTH_MOCK`, `AUTH_E2E_MOCK`)
  8. **supabase/**: Run `npx supabase init` to generate `supabase/config.toml` with project name and port defaults
  9. **ESLint packages**: Add `"lint": "eslint ."` stub to `packages/ui/package.json` and `packages/shared/package.json` (or document that lint is apps/web-only)

  **Must NOT do**:
  - Do NOT change behavior — only fix configurations and documentation
  - Do NOT run `supabase start` (only generate config.toml)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 24
  - **Blocked By**: Tasks 12-16

  **Acceptance Criteria**:
  - [ ] `packageManager` field added to root `package.json`
  - [ ] Vitest version consistent across workspace
  - [ ] `packages/shared` and `packages/ui` have direct devDeps (no hoisting dependency)
  - [ ] `vitest.config.mts` aliases match `tsconfig.json`
  - [ ] `tsconfig.base.json` no longer has no-op emit flags
  - [ ] `.env.example` has mock-toggle comments
  - [ ] `supabase/config.toml` committed
  - [ ] `pnpm test` passes after all changes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All 9 config fixes applied, tests green
    Tool: Bash
    Steps:
      1. Apply all 9 fixes
      2. pnpm install 2>&1
      3. pnpm test 2>&1
      4. Assert "Tests 364 passed"
    Expected Result: All configs consistent, test suite green
    Evidence: .omo/evidence/task-23-config-fixes.txt
  ```

  **Commit**: YES
  - Message: `chore: fix 9 config drifts (vitest version, packageManager, missing deps, tsconfig, vitest aliases, supabase config.toml, .env.example, eslint stubs)`
  - Files: `package.json`, `apps/web/package.json`, `packages/shared/package.json`, `packages/ui/package.json`, `tsconfig.base.json`, `apps/web/vitest.config.mts`, `apps/web/.env.example`, `supabase/config.toml`, `pnpm-lock.yaml`

- [ ] 24. Final verification — full test suite + git status check

  **What to do**:
  - Run `pnpm install` to ensure lockfile is consistent after all changes
  - Run `pnpm typecheck` to verify no new errors introduced
  - Run `pnpm test` to verify test count and zero failures
  - Run `git status --short` to verify clean working tree
  - Compare test count against baseline (Task 0): expect decrement equal to co-deleted test files from Wave 3

  **Must NOT do**:
  - Do NOT skip verification
  - Do NOT proceed to Final Wave if any test fails

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential — blocks Final Wave)
  - **Parallel Group**: Wave 4 (last task)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Tasks 17-23

  **Acceptance Criteria**:
  - [ ] `pnpm test` passes, test count matches expected (364 minus co-deleted test file cases)
  - [ ] `pnpm typecheck` has same pre-existing failures, no new ones
  - [ ] `git status --short` is clean (no unintended changes)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Full test suite passes after all cleanup
    Tool: Bash
    Steps:
      1. pnpm install 2>&1 | Select-Object -Last 5
      2. pnpm test 2>&1 | Select-Object -Last 10
      3. Assert "Tests N passed" with expected count
      4. git status --short 2>&1
      5. Assert output is clean or only shows expected files
    Expected Result: All tests green, clean git status
    Evidence: .omo/evidence/task-24-final-verification.txt
  ```

  **Commit**: NO (verification only; commits were made per task above)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. Plan Compliance Audit

  **Recommended Agent Profile**: `oracle`

  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.omo/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. Code Quality Review

  **Recommended Agent Profile**: `unspecified-high`

  Run `pnpm typecheck` + `pnpm test`. Review all changed files for: broken imports, unused imports, missing test co-deletion, stale references in AGENTS.md files to deleted modules. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Typecheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. Real Manual QA

  **Recommended Agent Profile**: `unspecified-high`

  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Verify git status is clean. Verify test suite passes. Verify no orphan test files remain. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Git Clean [YES/NO] | Tests [N/N] | VERDICT`

- [ ] F4. Scope Fidelity Check

  **Recommended Agent Profile**: `deep`

  For each task: read "What to do", read actual git diff/log. Verify 1:1 — everything in spec was cleaned (no missing), nothing beyond spec was touched (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **6-11**: `chore: remove tracked artifacts (5 SVGs, duplicate lockfile, evidence PNGs, capture scripts)`
- **12**: `chore: remove unused sign-out-form.tsx` (if approved)
- **13**: `chore: remove unused mock-bypass server action` (if approved)
- **14**: `chore: remove unused updateDeviceAction` (if approved)
- **15**: `chore: remove unused session-controller and check-in-modal` (if approved)
- **16**: `chore: remove abandoned core-hour server-actions` (if approved)
- **17-23**: `chore: fix config drifts and doc drift, remove unused deps` (single commit for config/docs wave)
- **F1-F4**: `chore: final verification evidence` (if files changed)

---

## Success Criteria

### Verification Commands
```bash
pnpm test                         # Expected: N tests pass (364 minus co-deleted test cases from Wave 3)
pnpm typecheck                    # Expected: same pre-existing failure in types.test.ts only
git status --short                # Expected: clean (no unintended changes)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] All Wave 3 user approvals recorded
- [ ] All gitignore entries committed and verified
- [ ] Wave 3 candidate approvals/rejections documented in `.omo/evidence/`
- [ ] Baseline test count matches final test count (adjusted for Wave 3 co-deletions)
