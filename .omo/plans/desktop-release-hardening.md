# Desktop Release Hardening — v0.1.0-desktop

## TL;DR

> **Quick Summary**: Harden the EfficiencyMemo desktop app for a proper GitHub release with working Tauri installers (.msi/.dmg/.AppImage). Fix 5 blockers (broken sync import, placeholder icons, unverified Rust compile, version mismatch, 10 typecheck errors), clean up dead code, add desktop tests, verify CI, then retag v0.1.0-desktop.
>
> **Deliverables**:
> - Working `.msi`/`.dmg`/`.AppImage` installers with real app icon
> - `.db.next` sidecar auto-applied on restart (sync import works)
> - `pnpm typecheck` green across entire workspace (0 errors)
> - CI produces downloadable release artifacts on tag push
> - Desktop `vitest` setup with smoke tests for core logic
> - Dead code removed, device form bugs fixed
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves, 6 tasks in Wave 1
> **Critical Path**: Version bump → .db.next sidecar fix → Rust compile verify → CI test tag → retag

---

## Context

### Original Request
"I find in the github release v0.1.0-desktop, the zip doesn't contain *.exe or *.msi, so how do we use the software? → plan for this, we need a full consideration, we need to check this release is a good start."

### Interview Summary
**Key Discussions**:
- **Release target**: Personal use only — rough edges acceptable, core functionality must work
- **Blockers**: Fix all 5 (sync sidecar, icons, Rust compile, version mismatch, typecheck errors)
- **Version strategy**: Retag `v0.1.0-desktop` to current HEAD after all fixes verified
- **Test strategy**: Tests-after — desktop tests added after hardening fixes, not as release gate. Existing 57 tests + typecheck serve as gate.
- **Rough edges**: Assess each against "release gating" criteria. Fix bugs that break core flows; defer polish to post-release backlog.
- **Platforms**: Windows, macOS, Linux — all 3 via CI matrix. Unsigned installers acceptable for personal use.

**Research Findings** (4 explore agents):
- **`.db.next` sidecar** written by sync.rs:200-208 but no startup code detects/applies it — sync import is broken
- **Icons** are 5 × 67-byte 1×1 placeholder PNGs — installer icon is blank
- **Rust compile** never verified — `reqwest_dav` v0.3, `rusqlite`, `keyring` crate unproven
- **Version mismatch**: tauri.conf.json, Cargo.toml, desktop/package.json all say `0.0.1`, tag says `0.1.0-desktop`
- **10 typecheck errors** in `packages/shared/src/__tests__/types.test.ts` — missing `vitest/globals` types + `expectTypeOf` misuse
- **Dead code**: 8 files in `apps/desktop/src/pages/tools/` — unused duplicates of feature code
- **Device form bugs**: `<select onChange={() => {}}>` no-op, `reminderEnabled` never persisted
- **Sub-routes**: CoreHour /history /tags /settings and Charger Reminder /new /:id /:id/edit have no Route handlers

### Metis Review
**Identified Gaps** (addressed):
- **Scope inflation**: Metis warned against fixing all 17 items for a personal release. Resolved: 9 items deferred to post-release. Only build/crash/flow breakers fixed now.
- **Platform scope**: Added explicit Windows/macOS/Linux matrix. Code signing excluded. Unsigned installers acceptable.
- **Retag risk**: Retag is final step AFTER local build verified and CI tested with dummy tag. Backup branch created before force-push.
- **Test gating**: Desktop tests are post-release. Existing 57 tests + typecheck are the release gate.
- **Sync scope**: `.db.next` fix required (documented feature). CoreHour check-ins excluded.
- **Oracle phase gates**: All 3 phases must return GO before proceeding.

---

## Work Objectives

### Core Objective
Ship a working `v0.1.0-desktop` Tauri build with `.exe`/`.msi`/`.dmg`/`.AppImage` installers so users can download and run the desktop app on Windows, macOS, and Linux.

### Concrete Deliverables
- `apps/desktop/src-tauri/icons/` — 5 real icon files (not 1×1 placeholders)
- `apps/desktop/src-tauri/src/lib.rs` — `.db.next` detection + atomic application on startup
- `tauri.conf.json`, `Cargo.toml`, `apps/desktop/package.json` — version bumped to `0.1.0`
- `packages/shared/src/__tests__/types.test.ts` — 10 typecheck errors fixed
- `packages/shared/tsconfig.json` — `vitest/globals` types added
- `apps/desktop/src/__tests__/` — vitest setup + smoke tests
- `.github/workflows/release.yml` — enhanced CI (ui tests, root typecheck, lint)
- `apps/desktop/src/pages/tools/` — deleted (8 dead files)

### Definition of Done
- [ ] `pnpm typecheck` passes with 0 errors across entire workspace
- [ ] `pnpm test` passes (57 existing + new desktop smoke tests)
- [ ] `cargo check` passes in `apps/desktop/src-tauri/`
- [ ] `pnpm --filter desktop tauri:build` produces installer with correct version in filename
- [ ] CI triggers on test tag, produces downloadable artifacts for all 3 platforms
- [ ] Sync import: writing `.db.next` + restarting applies it to main DB
- [ ] App icon visible in installer, taskbar/dock, and window title bar

### Must Have
- `.db.next` sidecar auto-applied atomically on restart (with checksum verification)
- Real app icons (not placeholders)
- Rust crate compiles cleanly (`cargo check` + `cargo build --release`)
- All version strings read `0.1.0` in shipped manifests
- `pnpm typecheck` green (0 errors)
- CI produces release artifacts for all 3 platforms
- Dead `pages/tools/` tree deleted

### Must NOT Have (Guardrails)
- Do NOT implement CoreHour settings page (stub is acceptable for personal use)
- Do NOT add ErrorBoundary or 404 page (polish, not release gating)
- Do NOT fix CoreHour sub-routes (hide non-working links instead)
- Do NOT refactor design tokens (cosmetic, not gating)
- Do NOT fix AGENTS.md stale references (doc debt)
- Do NOT configure code signing (Windows SmartScreen warning is acceptable for personal use)
- Do NOT implement CoreHour check-in flow
- Do NOT test WebDAV sync against live server
- Do NOT force-push tag until ALL blockers verified
- Do NOT add desktop tests as release gate (they are post-release quality)
- Do NOT modify `packages/ui/` or `packages/shared/` source code (only test file + tsconfig)
- Do NOT touch SQLite migration files
- Do NOT modify `.gitignore`

### Spec Framework Integration

> *No SDD framework detected in this repository.*

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest in shared + ui)
- **Automated tests**: Tests-after (add desktop smoke tests, not TDD)
- **Framework**: vitest (node env for pure logic, jsdom for components)
- **Existing gate**: 57 existing tests + `pnpm typecheck` must be green

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Rust/CLI**: Use Bash — `cargo check`, `cargo build`, verify output
- **Frontend/UI**: Use Playwright (if applicable) — navigate, assert
- **API/Backend**: Use Bash (curl) — verify CI artifacts, GitHub API
- **File verification**: Use Bash (grep, ls, diff) — confirm changes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + blockers, MAX PARALLEL):
├── Task 1: Fix 10 typecheck errors [quick]
├── Task 2: Generate real app icons [quick]
├── Task 3: Bump version to 0.1.0 [quick]
├── Task 4: Fix Cargo.toml author [quick]
├── Task 5: Delete dead pages/tools/ tree [quick]
├── Task 6: Assess rough edges for Wave 2 [unspecified-low]
└── Task 7: Audit existing 57 tests for relevance [unspecified-low]

Wave 2 (After Wave 1 — core fixes + tests, MAX PARALLEL):
├── Task 8: Implement .db.next sidecar auto-apply (depends: 3) [deep]
├── Task 9: Verify Rust compile locally (depends: 3, 4, 5) [unspecified-high]
├── Task 10: Wire Charger Reminder deep links (depends: 5, 6) [deep]
├── Task 11: Fix device form bugs (depends: 5, 6) [deep]
├── Task 12: Hide broken CoreHour sub-routes (depends: 6) [quick]
└── Task 13: Add desktop vitest setup + smoke tests (depends: 3) [unspecified-high]

Wave 3 (After Wave 2 — CI + release, MAX PARALLEL):
├── Task 14: Enhance CI workflow (depends: none) [quick]
├── Task 15: Test CI with dummy tag (depends: 14) [quick]
├── Task 16: Verify local installer end-to-end (depends: 8, 9) [deep]
└── Task 17: Retag v0.1.0-desktop and push (depends: 15, 16) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

**Critical Path**: Task 3 (version bump) → Task 8 (.db.next fix) → Task 9 (Rust verify) → Task 16 (installer verify) → Task 17 (retag)
**Parallel Speedup**: ~60% faster than sequential
**Max Concurrent**: 7 (Wave 1)

---

## TODOs

- [x] 1. Fix 10 typecheck errors in packages/shared

  **What to do**:
  - Add `"types": ["vitest/globals"]` to `packages/shared/tsconfig.json` `compilerOptions` — fixes 4 `expect`-not-found errors (lines 176, 180, 181, 185)
  - Fix 5 `expectTypeOf(...).toBeString()`/`.toBeNumber()` calls on `string | undefined`/`number | undefined` operands (lines 69, 148, 149, 169, 170): use `.not.toBeUndefined()` assertion first, or access with `!` after a null check, or switch to `toMatchTypeOf<string>()`
  - Fix line 110 `toEqualTypeOf<ToolManifest>()` — the `satisfies` constraint collapses `enabled` to `"Expected: boolean, Actual: never"`. Refactor to use a typed `const x: ToolManifest = {...}` declaration instead of `satisfies`
  - Run `pnpm typecheck` after each fix to confirm no cascading errors
  - Target: `pnpm typecheck` → 0 errors across entire workspace

  **Must NOT do**:
  - Do NOT modify source types in `packages/shared/src/types.ts` — only fix test assertions
  - Do NOT exclude the test file from tsconfig — fix the code, not the config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file fix, well-understood root cause, deterministic fix
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: None needed — straightforward vitest typing fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: None directly
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/shared/src/__tests__/types.test.ts` — file with 10 errors
  - `packages/shared/tsconfig.json` — needs `"types": ["vitest/globals"]` added
  - `packages/shared/src/types.ts` — source types for `ToolManifest`, do NOT modify
  - Vitest docs: `https://vitest.dev/api/expect-typeof.html` — `expectTypeOf` API reference

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` exits 0 with no errors
  - [ ] `pnpm --filter @memo/shared test` still passes (16/16)
  - [ ] No source type changes in `packages/shared/src/types.ts`

  **QA Scenarios**:

  ```
  Scenario: Typecheck passes with zero errors
    Tool: Bash
    Preconditions: Working directory is repo root
    Steps:
      1. Run: pnpm typecheck
      2. Check exit code is 0
      3. Check stderr is empty (no TS error output)
    Expected Result: Exit code 0, stdout shows "Done" or no errors
    Failure Indicators: Non-zero exit code, any line containing "error TS"
    Evidence: .omo/evidence/task-1-typecheck-pass.txt

  Scenario: Existing tests still pass
    Tool: Bash
    Preconditions: Typecheck fix applied
    Steps:
      1. Run: pnpm test
      2. Check output for "57 passed" or similar success message
    Expected Result: All 57 tests pass, 0 failures
    Failure Indicators: Any test failure line, non-zero exit code
    Evidence: .omo/evidence/task-1-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `fix(shared): resolve 10 typecheck errors in types.test.ts`
  - Files: `packages/shared/tsconfig.json`, `packages/shared/src/__tests__/types.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 2. Generate real app icons

  **What to do**:
  - Create or locate a 1024×1024 PNG source icon for the app
  - Run `pnpm --filter desktop tauri icon path/to/source-1024x1024.png` to auto-generate all 5 required icon files (32x32.png, 128x128.png, 128x128@2x.png, icon.icns, icon.ico)
  - Verify generated files are NOT 67 bytes (current placeholder size)
  - If no source icon exists, create a simple one programmatically (e.g., a colored square with "EM" text using a canvas library or ImageMagick)

  **Must NOT do**:
  - Do NOT skip icon generation — 1×1 placeholders are unacceptable even for personal use
  - Do NOT use copyrighted or trademarked imagery

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Tool invocation, simple verification, no complex logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: None needed — `tauri icon` handles generation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: Task 16 (installer verification needs real icons)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src-tauri/icons/` — directory with 5 placeholder files to replace
  - Tauri icon docs: `https://v2.tauri.app/guides/icons-and-splash/` — icon generation command
  - Current placeholder size: 67 bytes each (1×1 PNG) — verify new files are larger

  **Acceptance Criteria**:
  - [ ] At least one icon file > 1KB (not 67 bytes)
  - [ ] All 5 icon files present: 32x32.png, 128x128.png, 128x128@2x.png, icon.icns, icon.ico
  - [ ] `tauri icon` command exits with success

  **QA Scenarios**:

  ```
  Scenario: Icons are real, not placeholders
    Tool: Bash
    Preconditions: Icon generation completed
    Steps:
      1. Run: Get-ChildItem apps/desktop/src-tauri/icons/* | Select-Object Name, Length
      2. Verify each file > 100 bytes (not 67-byte placeholder)
    Expected Result: All files > 100 bytes, at least one > 1KB
    Failure Indicators: Any file still 67 bytes
    Evidence: .omo/evidence/task-2-icon-sizes.txt

  Scenario: Icon files are valid images
    Tool: Bash
    Preconditions: Icon generation completed
    Steps:
      1. Run: file apps/desktop/src-tauri/icons/128x128.png (or identify equivalent)
      2. Verify output says "PNG image data, 128 x 128" or similar
    Expected Result: PNG files identify as valid PNG images with correct dimensions
    Evidence: .omo/evidence/task-2-icon-valid.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): replace placeholder icons with real app icon`
  - Files: `apps/desktop/src-tauri/icons/*`
  - Pre-commit: `pnpm --filter desktop tauri icon --help` (verify tool available)

- [x] 3. Bump version to 0.1.0 across manifests

  **What to do**:
  - Update `"version": "0.0.1"` → `"0.1.0"` in `apps/desktop/src-tauri/tauri.conf.json` line 4
  - Update `version = "0.0.1"` → `version = "0.1.0"` in `apps/desktop/src-tauri/Cargo.toml` line 3
  - Update `"version": "0.0.1"` → `"0.1.0"` in `apps/desktop/package.json` line 3
  - Do NOT change root `package.json`, `packages/shared/package.json`, or `packages/ui/package.json` — they are private workspace internals
  - Verify with `git diff` that exactly 3 files changed and version strings match

  **Must NOT do**:
  - Do NOT bump the root monorepo `package.json` version
  - Do NOT bump `packages/shared/package.json` or `packages/ui/package.json`
  - Do NOT change the `identifier` in `tauri.conf.json` (must stay `com.efficiency-memo.app`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Three single-line edits in known locations, deterministic
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-7)
  - **Blocks**: Tasks 8, 9, 13 (Rust/JS code depends on version)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src-tauri/tauri.conf.json:4` — `"version": "0.0.1"`
  - `apps/desktop/src-tauri/Cargo.toml:3` — `version = "0.0.1"`
  - `apps/desktop/package.json:3` — `"version": "0.0.1"`
  - CHANGELOG.md already documents `0.1.0-desktop`

  **Acceptance Criteria**:
  - [ ] `tauri.conf.json` version = `"0.1.0"`
  - [ ] `Cargo.toml` version = `"0.1.0"`
  - [ ] `apps/desktop/package.json` version = `"0.1.0"`
  - [ ] Root `package.json` stays at `0.0.1`

  **QA Scenarios**:

  ```
  Scenario: All 3 manifests show 0.1.0
    Tool: Bash
    Preconditions: Version bump applied
    Steps:
      1. Run: grep '"version"' apps/desktop/src-tauri/tauri.conf.json
      2. Run: grep '^version' apps/desktop/src-tauri/Cargo.toml
      3. Run: grep '"version"' apps/desktop/package.json
    Expected Result: All three show "0.1.0"
    Failure Indicators: Any showing "0.0.1" or other version
    Evidence: .omo/evidence/task-3-version-check.txt

  Scenario: Root package.json unchanged
    Tool: Bash
    Preconditions: Version bump applied
    Steps:
      1. Run: grep '"version"' package.json
    Expected Result: Shows "0.0.1" (not 0.1.0)
    Evidence: .omo/evidence/task-3-root-unchanged.txt
  ```

  **Commit**: YES
  - Message: `chore(desktop): bump version to 0.1.0`
  - Files: `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/package.json`
  - Pre-commit: `pnpm typecheck`

- [x] 4. Fix Cargo.toml author placeholder

  **What to do**:
  - Change `authors = ["You"]` → `authors = ["JunYe Lin <junyelin2000@163.com>"]` in `apps/desktop/src-tauri/Cargo.toml` line 5
  - Verify with `grep authors apps/desktop/src-tauri/Cargo.toml`

  **Must NOT do**:
  - Do NOT change any other Cargo.toml fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One-line edit, deterministic
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src-tauri/Cargo.toml:5` — `authors = ["You"]`
  - Git tag creator: `JunYe Lin <junyelin2000@163.com>`

  **Acceptance Criteria**:
  - [ ] `grep authors apps/desktop/src-tauri/Cargo.toml` shows real name, not "You"

  **QA Scenarios**:

  ```
  Scenario: Author is real, not placeholder
    Tool: Bash
    Preconditions: Fix applied
    Steps:
      1. Run: grep authors apps/desktop/src-tauri/Cargo.toml
    Expected Result: Shows "JunYe Lin <junyelin2000@163.com>"
    Failure Indicators: Still shows "You" or empty
    Evidence: .omo/evidence/task-4-author-fixed.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: Combined in Task 3 commit
  - Files: `apps/desktop/src-tauri/Cargo.toml`

- [x] 5. Delete dead pages/tools/ tree

  **What to do**:
  - Delete the entire `apps/desktop/src/pages/tools/` directory (8 files)
  - Verify no imports reference these files: `grep -r "pages/tools" apps/desktop/src/` should return empty (App.tsx uses feature paths, not pages/tools)
  - Verify `pnpm typecheck` still passes after deletion

  **Must NOT do**:
  - Do NOT delete `apps/desktop/src/pages/dashboard/`, `pages/sign-in/`, or `pages/settings/`
  - Do NOT modify App.tsx routing — it already uses feature paths correctly
  - Do NOT delete feature code in `apps/desktop/src/features/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion + grep verification, no code changes
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)
  - **Blocks**: None directly (cosmetic cleanup)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/pages/tools/` — 8 dead files confirmed by explore agent `bg_f004eb93`
  - `apps/desktop/src/App.tsx` — uses `lazy(() => import("./features/..."))`, not pages/tools

  **Acceptance Criteria**:
  - [ ] `apps/desktop/src/pages/tools/` no longer exists
  - [ ] `grep -r "pages/tools" apps/desktop/src/` returns empty
  - [ ] `pnpm typecheck` passes

  **QA Scenarios**:

  ```
  Scenario: Dead code deleted, no broken imports
    Tool: Bash
    Preconditions: Deletion applied
    Steps:
      1. Run: Test-Path apps/desktop/src/pages/tools
      2. Run: grep -r "pages/tools" apps/desktop/src/ 2>&1
      3. Run: pnpm typecheck
    Expected Result: Path does not exist, grep empty, typecheck passes
    Failure Indicators: Path still exists, grep finds references, typecheck fails
    Evidence: .omo/evidence/task-5-dead-code-gone.txt
  ```

  **Commit**: YES
  - Message: `chore(desktop): remove dead pages/tools/ tree`
  - Files: `apps/desktop/src/pages/tools/` (deleted)
  - Pre-commit: `pnpm typecheck`

- [x] 6. Assess rough edges for Wave 2 fix decisions

  **What to do**:
  - Read each rough edge area and determine: fix now (Wave 2), defer (post-release), or hide (remove broken links)
  - **Charger Reminder deep links**: Check if "Add Device" button navigates to `/tools/charger-reminder/new` and whether that route exists. If not, wire it or redirect.
  - **CoreHour sub-routes**: Check if sidebar/tab links for /history, /tags, /settings are present in UI. If yes, either wire them or hide the links.
  - **Device form bugs**: Verify `<select onChange={() => {}}>` in `device-form.tsx` still exists and whether reminderEnabled is still disconnected.
  - **CoreHour settings stub**: Verify `handleSave` is still no-op. Decision: hide the settings link (do NOT implement the page).
  - Document findings in `.omo/evidence/task-6-assessment.md`

  **Must NOT do**:
  - Do NOT implement any fixes in this task — assessment only
  - Do NOT remove feature code — only assess

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Read-only assessment, code reading + decision documentation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)
  - **Blocks**: Tasks 10, 11, 12 (informs what to fix in Wave 2)
  - **Blocked By**: None

  **References**:
  - `apps/desktop/src/features/charger-reminder/components/device-form.tsx` — device form bugs
  - `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` — "Add Device" navigation
  - `apps/desktop/src/features/core-hour/pages/settings-page.tsx` — stub handleSave
  - `apps/desktop/src/features/core-hour/pages/dashboard-page.tsx` — CoreHour main page, check for sub-route links
  - `apps/desktop/src/App.tsx` — current route definitions

  **Acceptance Criteria**:
  - [ ] `.omo/evidence/task-6-assessment.md` exists with fix/not-fix decision for each rough edge
  - [ ] Each decision has rationale referencing actual code state

  **QA Scenarios**:

  ```
  Scenario: Assessment document complete with evidence
    Tool: Bash
    Preconditions: Assessment completed
    Steps:
      1. Read .omo/evidence/task-6-assessment.md
      2. Verify all 4 areas covered: CR deep links, CH sub-routes, device form, CH settings stub
    Expected Result: Document exists with decisions and code references
    Evidence: .omo/evidence/task-6-assessment.md (self-documenting)
  ```

  **Commit**: NO (assessment artifact only, not source code)

- [x] 7. Audit existing 57 tests for relevance

  **What to do**:
  - Read all test files in `packages/shared/src/__tests__/` and `packages/ui/src/__tests__/`
  - For each test file, check if the code it tests still exists and is consumed by the desktop app
  - `packages/shared`: types.test.ts tests `ToolManifest`, `APP_NAME`, etc. — are these still used by desktop?
  - `packages/ui`: button.test.tsx, card.test.tsx, modal.test.tsx, sidebar.test.tsx, shell.test.tsx — are all 5 components still imported by desktop?
  - Flag any tests for deleted/removed code
  - Document findings in `.omo/evidence/task-7-audit.md`

  **Must NOT do**:
  - Do NOT modify test files — audit only
  - Do NOT delete tests without explicit approval

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Read-only audit, grep + code reading
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6)
  - **Blocks**: None (informational)
  - **Blocked By**: None

  **References**:
  - `packages/shared/src/__tests__/types.test.ts` — 16 tests
  - `packages/ui/src/__tests__/button.test.tsx` — 13 tests
  - `packages/ui/src/__tests__/card.test.tsx` — 6 tests
  - `packages/ui/src/__tests__/modal.test.tsx` — 7 tests
  - `packages/ui/src/__tests__/sidebar.test.tsx` — 8 tests
  - `packages/ui/src/__tests__/shell.test.tsx` — 7 tests
  - `packages/ui/src/index.ts` — verify all exported components still exist
  - `apps/desktop/src/` — verify desktop consumes tested components

  **Acceptance Criteria**:
  - [ ] `.omo/evidence/task-7-audit.md` exists with per-file relevance assessment
  - [ ] Any obsolete tests flagged with rationale

  **QA Scenarios**:

  ```
  Scenario: Audit document complete
    Tool: Bash
    Preconditions: Audit completed
    Steps:
      1. Read .omo/evidence/task-7-audit.md
      2. Verify all 6 test files covered
    Expected Result: Document exists, per-file verdicts, no untested files missed
    Evidence: .omo/evidence/task-7-audit.md
  ```

  **Commit**: NO (assessment artifact only)

- [ ] 8. Implement .db.next sidecar auto-apply on startup

  **What to do**:
  - Add a function `apply_pending_import` in `apps/desktop/src-tauri/src/lib.rs` (or a new file `sidecar.rs`)
  - Call it during app setup BEFORE `tauri-plugin-sql` opens the database connection
  - Logic: check `app_data_dir` for `efficiency-memo.db.next` file; if present, verify SHA256 checksum against the manifest entry written during `sync_import`; if valid, atomically rename `efficiency-memo.db.next` → `efficiency-memo.db` (using `std::fs::rename`); if corrupted, delete `.db.next` and log warning
  - Also update the JS side: after restart detects `.db.next` was applied, show a success toast/alert in the sync page
  - The `sync.rs` already writes SHA256 to `manifest.json` — reference that logic

  **Must NOT do**:
  - Do NOT open the DB connection before the sidecar check — `tauri-plugin-sql` must initialize AFTER potential rename
  - Do NOT delete the main DB without verification
  - Do NOT skip checksum verification — atomic rename must only happen on valid files

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Rust code, startup lifecycle, atomic file operations, cross-platform correctness
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9-13)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 16 (installer verification needs this)
  - **Blocked By**: Task 3 (version bump affects Cargo.toml context)

  **References**:
  - `apps/desktop/src-tauri/src/sync.rs:200-208` — writes `.db.next` and manifest with SHA256
  - `apps/desktop/src-tauri/src/sync.rs:1-50` — sync import logic, checksum creation pattern
  - `apps/desktop/src-tauri/src/lib.rs:9-42` — current startup, plugin registration, command wiring
  - `apps/desktop/src-tauri/src/main.rs` — entry point
  - `apps/desktop/src/pages/settings/sync/page.tsx` — JS side that shows sync status
  - Rust docs: `std::fs::rename` for atomic rename on same filesystem

  **Acceptance Criteria**:
  - [ ] `cargo check` passes in `apps/desktop/src-tauri/`
  - [ ] If `.db.next` exists and SHA256 matches manifest, it replaces `efficiency-memo.db` on startup
  - [ ] If `.db.next` is corrupted (SHA256 mismatch), it's deleted and main DB preserved
  - [ ] If no `.db.next` exists, normal startup proceeds
  - [ ] DB connection opens AFTER sidecar check

  **QA Scenarios**:

  ```
  Scenario: Valid .db.next is auto-applied on restart
    Tool: Bash
    Preconditions: App has been launched once (DB created). A valid .db.next exists in app data dir.
    Steps:
      1. Manually create a valid .db.next in the app data dir (or trigger via sync_import)
      2. Launch the app: pnpm --filter desktop tauri:dev
      3. Check that .db.next file no longer exists (was renamed)
      4. Check that efficiency-memo.db was updated (file timestamp changed)
    Expected Result: .db.next gone, main DB updated, app launches normally
    Failure Indicators: .db.next still present after launch, DB unchanged, app crashes
    Evidence: .omo/evidence/task-8-sidecar-applied.txt

  Scenario: Corrupted .db.next is safely discarded
    Tool: Bash
    Preconditions: App data dir has a corrupted .db.next (wrong SHA256 or truncated)
    Steps:
      1. Create a corrupted .db.next (e.g., echo "garbage" > .db.next)
      2. Launch the app
      3. Check that .db.next was deleted
      4. Check that efficiency-memo.db still exists and is unchanged
    Expected Result: Corrupted file deleted, main DB untouched, app launches normally
    Evidence: .omo/evidence/task-8-corruption-handled.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): auto-apply .db.next sidecar on startup`
  - Files: `apps/desktop/src-tauri/src/lib.rs` (+ maybe new `sidecar.rs`)
  - Pre-commit: `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`

- [ ] 9. Verify Rust compile locally

  **What to do**:
  - Run `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` — verifies all dependencies resolve and types are correct (fast, no codegen)
  - Run `cargo build --release --manifest-path apps/desktop/src-tauri/Cargo.toml` — full compilation, produces binary (slower, validates linker)
  - If either fails: diagnose and fix. Common failures: `reqwest_dav` API changes, `rusqlite` feature flags, `keyring` Linux dbus dependency, missing platform SDKs
  - Document any fixes needed

  **Must NOT do**:
  - Do NOT skip `cargo build` if `cargo check` passes — linker errors only surface at build time
  - Do NOT commit `Cargo.lock` if it was previously gitignored — check `.gitignore` first

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Potentially long compilation, may require diagnosing Rust dependency issues
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 10-13)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 16 (installer needs binary)
  - **Blocked By**: Tasks 3, 4, 5 (version bump + Cargo.toml fixes)

  **References**:
  - `apps/desktop/src-tauri/Cargo.toml` — dependency list with versions
  - `apps/desktop/src-tauri/src/lib.rs` — main crate code
  - `apps/desktop/src-tauri/src/sync.rs` — uses `reqwest_dav`, `keyring`, `rusqlite`
  - Tauri v2 docs: Rust setup per platform

  **Acceptance Criteria**:
  - [ ] `cargo check` exits 0 with no errors or warnings (warnings acceptable)
  - [ ] `cargo build --release` produces binary at `target/release/efficiency-memo.exe` (or platform equivalent)

  **QA Scenarios**:

  ```
  Scenario: cargo check passes
    Tool: Bash
    Preconditions: Task 8 changes applied (sidecar fix)
    Steps:
      1. Run: cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
    Expected Result: Exit code 0, "Checking efficiency-memo v0.1.0" in output, no errors
    Failure Indicators: "error[E" in output, non-zero exit code
    Evidence: .omo/evidence/task-9-cargo-check.txt

  Scenario: cargo build succeeds
    Tool: Bash
    Preconditions: cargo check passes
    Steps:
      1. Run: cargo build --release --manifest-path apps/desktop/src-tauri/Cargo.toml
      2. Wait for completion (may take 5-15 minutes first time)
    Expected Result: Exit code 0, binary exists in target/release/
    Failure Indicators: Linker errors, "could not compile", non-zero exit code
    Evidence: .omo/evidence/task-9-cargo-build.txt
  ```

  **Commit**: NO (verification only; if fixes needed, they go with respective tasks)

- [ ] 10. Wire Charger Reminder deep links

  **What to do**:
  - Check Task 6 assessment for exact fix scope
  - Likely fix: add nested `<Route>` elements inside the Charger Reminder feature's lazy-loaded component to handle `/new`, `/:id`, `/:id/edit`
  - Read `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` to see how "Add Device" navigates
  - Read `apps/desktop/src/features/charger-reminder/component-loader.ts` to understand how the feature is loaded
  - Wire the sub-routes so clicking "Add Device" navigates to the device form, clicking a device navigates to detail, etc.
  - If the feature pages already exist (device-form, device-detail in `features/charger-reminder/components/`), reuse them

  **Must NOT do**:
  - Do NOT create new pages if existing components can be used
  - Do NOT change the feature's data layer (db-tauri.ts)
  - Do NOT modify `packages/ui/` or `packages/shared/`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: React Router wiring, feature component integration, may need to understand existing routing patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-9, 11-13)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 5 (dead code removed), 6 (assessment)

  **References**:
  - `apps/desktop/src/App.tsx` — current route: `<Route path="/tools/charger-reminder/*" element={...} />`
  - `apps/desktop/src/features/charger-reminder/component-loader.ts` — lazy load entry
  - `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` — "Add Device" navigation
  - `apps/desktop/src/features/charger-reminder/components/device-form.tsx` — form component
  - `apps/desktop/src/features/charger-reminder/components/device-detail.tsx` — detail component
  - React Router v7 docs: nested routes, `<Outlet />`

  **Acceptance Criteria**:
  - [ ] `/tools/charger-reminder/new` renders the device creation form
  - [ ] `/tools/charger-reminder/:id` renders device detail
  - [ ] `/tools/charger-reminder/:id/edit` renders device edit form
  - [ ] `pnpm typecheck` passes

  **QA Scenarios**:

  ```
  Scenario: "Add Device" navigates to form
    Tool: Playwright (if available) or interactive_bash (tmux)
    Preconditions: Desktop app running in dev mode, signed in
    Steps:
      1. Navigate to /dashboard
      2. Click Charger Reminder in sidebar
      3. Click "Add Device" button
      4. Verify URL is /tools/charger-reminder/new
      5. Verify device form is rendered (form fields visible)
    Expected Result: Form renders with device name, type, battery fields
    Failure Indicators: Blank page, 404, URL doesn't change, form missing
    Evidence: .omo/evidence/task-10-cr-deep-links.txt (or screenshot)
  ```

  **Commit**: YES
  - Message: `fix(desktop): wire Charger Reminder sub-routes (/new, /:id, /:id/edit)`
  - Files: Charger Reminder feature files (component-loader, page components)
  - Pre-commit: `pnpm typecheck`

- [ ] 11. Fix device form bugs

  **What to do**:
  - Fix `<select onChange={() => {}}>` in `apps/desktop/src/features/charger-reminder/components/device-form.tsx` — wire onChange to update device type state
  - Fix `reminderEnabled` checkbox — ensure value flows from form state → `setReminderPreference` call in `new/page.tsx` and `[id]/edit/page.tsx`
  - Check the dead `pages/tools/charger-reminder/new/page.tsx` and `[id]/edit/page.tsx` — if they duplicate the form logic, the bug may be in the feature components instead. Read both versions to determine which is active.
  - Task 6 assessment will clarify exact scope — if dead pages had the bug but features don't, scope may be minimal

  **Must NOT do**:
  - Do NOT change DB schema or db-tauri.ts methods
  - Do NOT add new form fields — only fix existing broken bindings

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: React form state management, needs to trace data flow from UI → DB
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-10, 12-13)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 5 (dead code removed clarifies active files), 6 (assessment)

  **References**:
  - `apps/desktop/src/features/charger-reminder/components/device-form.tsx` — `<select onChange={() => {}}>` at line ~114
  - `apps/desktop/src/features/charger-reminder/db-tauri.ts` — `setReminderPreference` method
  - `apps/desktop/src/features/charger-reminder/contracts.ts` — type definitions

  **Acceptance Criteria**:
  - [ ] Device type `<select>` onChange wired to state — selecting a different type updates form data
  - [ ] `reminderEnabled` checkbox value is passed to `setReminderPreference` on save
  - [ ] `pnpm typecheck` passes

  **QA Scenarios**:

  ```
  Scenario: Device type selection works
    Tool: Playwright or interactive_bash (tmux)
    Preconditions: Desktop app running, on device creation form (/tools/charger-reminder/new)
    Steps:
      1. Select "Game Controller" from device type dropdown
      2. Verify the selection changes visually (dropdown shows "Game Controller")
      3. Fill other fields and submit
      4. Navigate back to device list, open the created device
    Expected Result: Created device shows type "Game Controller" in detail view
    Failure Indicators: Dropdown doesn't change, saved device shows wrong type
    Evidence: .omo/evidence/task-11-device-type.txt

  Scenario: Reminder enabled checkbox persists
    Tool: Playwright or interactive_bash
    Preconditions: On device creation form
    Steps:
      1. Check "Enable Reminder" checkbox
      2. Fill other fields and submit
      3. Edit the created device
      4. Verify "Enable Reminder" is still checked
    Expected Result: Checkbox state persists after save and reload
    Failure Indicators: Checkbox unchecked after edit, reminder preferences not saved
    Evidence: .omo/evidence/task-11-reminder-persist.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): wire device form select and reminderEnabled bindings`
  - Files: `apps/desktop/src/features/charger-reminder/components/device-form.tsx` (+ page files if needed)
  - Pre-commit: `pnpm typecheck`

- [ ] 12. Hide broken CoreHour sub-routes

  **What to do**:
  - Check Task 6 assessment for exact scope
  - If CoreHour has sidebar/tab links to /history, /tags, /settings that don't work: remove or disable those links
  - Do NOT implement the missing pages — just hide/grey-out the broken navigation
  - Alternatively: add a simple placeholder page that says "Coming in v0.2.0" instead of blank content
  - Target: no dead-end navigation in the CoreHour feature

  **Must NOT do**:
  - Do NOT implement CoreHour settings page (stub is fine, just hide the link)
  - Do NOT implement check-in flow
  - Do NOT modify the DB layer

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Remove/disable UI links, no new logic
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-11, 13)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 6 (assessment)

  **References**:
  - `apps/desktop/src/features/core-hour/pages/dashboard-page.tsx` — main page, may have sub-navigation
  - `apps/desktop/src/features/core-hour/manifest.ts` — manifest may declare routes for sidebar
  - `apps/desktop/src/features/core-hour/components/dashboard.tsx` — dashboard component

  **Acceptance Criteria**:
  - [ ] No active links in CoreHour navigate to non-functional routes
  - [ ] CoreHour timer flow (start/stop/tag) still works
  - [ ] `pnpm typecheck` passes

  **QA Scenarios**:

  ```
  Scenario: No dead-end navigation in CoreHour
    Tool: Playwright or interactive_bash
    Preconditions: Desktop app running, signed in, navigated to CoreHour
    Steps:
      1. Click every visible link/button/tab in the CoreHour interface
      2. Verify each one either works or is visibly disabled/absent
    Expected Result: No blank pages, no 404-like empty content
    Failure Indicators: Any click leads to empty white area, console errors
    Evidence: .omo/evidence/task-12-corehour-nav.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): hide broken CoreHour sub-route navigation`
  - Files: CoreHour feature files (dashboard, manifest)
  - Pre-commit: `pnpm typecheck`

- [ ] 13. Add desktop vitest setup + smoke tests

  **What to do**:
  - Add `vitest` to `apps/desktop/package.json` devDependencies: `pnpm --filter desktop add -D vitest`
  - Add `"test": "vitest run"` script to `apps/desktop/package.json`
  - Create `apps/desktop/vitest.config.ts` — node env for pure logic, jsdom for component tests
  - Write smoke tests for:
    - `apps/desktop/src/lib/auth.ts` — signIn/signOut/getCurrentUser (mock OS keychain)
    - `apps/desktop/src/features/charger-reminder/heuristic-engine.ts` — test reminder calculation
    - `apps/desktop/src/features/charger-reminder/device-presets.ts` — test preset data integrity
    - `apps/desktop/src/features/core-hour/hooks/use-timer.ts` — test timer logic (if pure enough)
  - Run `pnpm --filter desktop test` to verify

  **Must NOT do**:
  - Do NOT test Tauri-specific code (`@tauri-apps/api`, `tauri-plugin-sql`) — requires Tauri runtime
  - Do NOT make tests a release gate — they are supplementary

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New test infrastructure + multiple test files
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-12)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3 (version bump provides package.json context)

  **References**:
  - `packages/shared/vitest.config.ts` — pattern to follow for vitest config
  - `packages/ui/vitest.config.ts` — jsdom pattern for component tests
  - `packages/shared/package.json` — test script + vitest dependency pattern
  - `apps/desktop/src/lib/auth.ts` — auth functions to test
  - `apps/desktop/src/features/charger-reminder/heuristic-engine.ts` — pure logic, testable
  - `apps/desktop/src/features/charger-reminder/device-presets.ts` — static data, testable

  **Acceptance Criteria**:
  - [ ] `apps/desktop/package.json` has `"test": "vitest run"` script
  - [ ] `apps/desktop/vitest.config.ts` exists and is valid
  - [ ] At least 3 test files with minimum 5 total test cases
  - [ ] `pnpm --filter desktop test` passes

  **QA Scenarios**:

  ```
  Scenario: Desktop tests pass
    Tool: Bash
    Preconditions: vitest setup complete
    Steps:
      1. Run: pnpm --filter desktop test
    Expected Result: All tests pass, exit code 0
    Failure Indicators: Test failures, config errors, exit code non-zero
    Evidence: .omo/evidence/task-13-desktop-tests.txt
  ```

  **Commit**: YES
  - Message: `test(desktop): add vitest setup and smoke tests for core logic`
  - Files: `apps/desktop/package.json`, `apps/desktop/vitest.config.ts`, `apps/desktop/src/__tests__/*`
  - Pre-commit: `pnpm --filter desktop test`

- [ ] 14. Enhance CI workflow

  **What to do**:
  - Add `pnpm --filter @memo/ui test` to the `test` job (currently only runs shared tests)
  - Add `pnpm typecheck` (root) to the `test` job (catches type errors across all packages)
  - Add `pnpm -r lint` step (every workspace with a lint script has one)
  - Add `pnpm --filter desktop test` (once Task 13 adds the script)
  - Verify permission scopes: `contents: write` needed for release upload
  - Keep the existing matrix build job unchanged (already correct)

  **Must NOT do**:
  - Do NOT change the build matrix or release job structure
  - Do NOT add code signing or notarization steps
  - Do NOT add E2E/Playwright tests to CI

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CI YAML edits, well-understood additions
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15-17)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15 (dummy tag test needs enhanced CI)
  - **Blocked By**: None (entirely independent of Wave 1-2)

  **References**:
  - `.github/workflows/release.yml` — current workflow (97 lines)
  - `packages/ui/package.json` — has `test` script
  - `package.json` — root has `pnpm -r lint` and `pnpm typecheck` scripts

  **Acceptance Criteria**:
  - [ ] CI `test` job includes `@memo/ui` tests
  - [ ] CI `test` job includes root `pnpm typecheck`
  - [ ] CI `test` job includes lint step
  - [ ] GitHub Actions YAML validation passes (no syntax errors)

  **QA Scenarios**:

  ```
  Scenario: CI YAML is valid
    Tool: Bash
    Preconditions: CI edits applied
    Steps:
      1. Run: python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"
      (or use any YAML validator available)
    Expected Result: YAML parses without errors
    Failure Indicators: YAML parse error, invalid syntax
    Evidence: .omo/evidence/task-14-ci-valid.txt
  ```

  **Commit**: YES
  - Message: `ci: enhance release workflow with ui tests, typecheck, and lint`
  - Files: `.github/workflows/release.yml`
  - Pre-commit: YAML validation

- [ ] 15. Test CI with dummy tag

  **What to do**:
  - Create a lightweight test tag: `git tag v0.1.0-desktop-test HEAD`
  - Push it: `git push origin v0.1.0-desktop-test`
  - Monitor GitHub Actions for the triggered workflow
  - Verify: `test` job passes (typecheck + all tests), `build` job produces artifacts for all 3 platforms, `release` job creates a draft release
  - If CI fails: diagnose and fix (may need Task 14 edits or platform-specific deps)
  - After verification: delete the test tag locally and remotely: `git tag -d v0.1.0-desktop-test && git push origin --delete v0.1.0-desktop-test`
  - Also delete the test GitHub Release if one was created

  **Must NOT do**:
  - Do NOT skip this step — CI must be proven before retagging
  - Do NOT leave the test tag/release in place

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Git operations + GitHub Actions monitoring, no code changes
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs CI to complete, but can run in parallel with Task 16 which is local)
  - **Parallel Group**: Wave 3 (with Tasks 14, 16, 17 — parallel execution of 15 and 16 is fine)
  - **Blocks**: Task 17 (retag only after CI verified)
  - **Blocked By**: Task 14 (enhanced CI)

  **References**:
  - `.github/workflows/release.yml` — workflow triggered on `v*` tags
  - `https://github.com/HashTagGit/efficiency-memo/actions` — CI status page

  **Acceptance Criteria**:
  - [ ] CI workflow triggered on `v0.1.0-desktop-test` push
  - [ ] `test` job passes (green checkmark)
  - [ ] `build` job produces artifacts for windows-latest, macos-latest, ubuntu-latest
  - [ ] `release` job creates GitHub Release with uploaded assets
  - [ ] Test tag and release cleaned up after verification

  **QA Scenarios**:

  ```
  Scenario: CI passes on test tag
    Tool: Bash (curl to GitHub API)
    Preconditions: Test tag pushed, CI completed
    Steps:
      1. Run: gh run list --workflow release.yml --limit 1
      2. Verify status is "completed" and conclusion is "success"
    Expected Result: Latest release workflow run shows green
    Failure Indicators: Failed job, pending status, no run triggered
    Evidence: .omo/evidence/task-15-ci-pass.txt
  ```

  **Commit**: NO (tag operations, no source changes)

- [ ] 16. Verify local installer end-to-end

  **What to do**:
  - Run `pnpm --filter desktop tauri:build` to produce a local installer
  - Verify installer filename contains `0.1.0` (not `0.0.1`)
  - On Windows: install the `.msi`, verify app launches, check icon in taskbar
  - On macOS: mount `.dmg`, drag to Applications, right-click Open (unsigned), verify launch
  - On Linux: run `.AppImage`, verify launch
  - After launch: verify SQLite DB created in app data dir, verify 3 migrations ran (check tables exist)
  - Verify sync page loads without errors (WebDAV config UI visible)
  - Verify both tools (Charger Reminder, CoreHour) are accessible from sidebar
  - Capture screenshots: installer, app window, sidebar, sync page

  **Must NOT do**:
  - Do NOT skip platform verification — test on whatever platform is available
  - Do NOT sign or notarize the installer

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-step verification, installer testing, DB verification, may span multiple platforms
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17 (retag only after installer verified)
  - **Blocked By**: Tasks 8 (.db.next fix), 9 (Rust compile verified)

  **References**:
  - `apps/desktop/src-tauri/target/release/bundle/` — installer output directory
  - `docs/Installation.md` — platform-specific data dir paths
  - `apps/desktop/src-tauri/migrations/` — 3 SQL files to verify

  **Acceptance Criteria**:
  - [ ] Installer produced with correct version in filename (e.g., `EfficiencyMemo_0.1.0_x64_en-US.msi`)
  - [ ] App launches after installation
  - [ ] App icon visible (not blank) in taskbar/dock
  - [ ] SQLite DB created with all tables from 3 migrations
  - [ ] Sidebar shows both tools
  - [ ] Sync settings page loads

  **QA Scenarios**:

  ```
  Scenario: Installer launches and app works
    Tool: Bash (for file checks) + manual verification notes
    Preconditions: Tauri build complete
    Steps:
      1. Check installer filename: Get-ChildItem apps/desktop/src-tauri/target/release/bundle/msi/
      2. Verify version string present in filename
      3. Install and launch (platform-dependent)
      4. After launch: check app data dir for efficiency-memo.db
      5. Run: sqlite3 <path>/efficiency-memo.db ".tables"
    Expected Result: Filename contains 0.1.0, DB exists with expected tables (users, cr_devices, ch_sessions, etc.)
    Evidence: .omo/evidence/task-16-installer-verify.txt (+ screenshots)
  ```

  **Commit**: NO (verification only)

- [ ] 17. Retag v0.1.0-desktop and push

  **What to do**:
  - Create safety branch: `git branch backup/v0.1.0-desktop-old v0.1.0-desktop` (preserves old tag commit)
  - Delete old tag locally: `git tag -d v0.1.0-desktop`
  - Delete old tag remotely: `git push origin --delete v0.1.0-desktop`
  - If there's a GitHub Release attached to the old tag, delete it via `gh release delete v0.1.0-desktop --yes` or via GitHub UI
  - Create new tag at HEAD: `git tag -a v0.1.0-desktop -m "EfficiencyMemo v0.1.0-desktop — Tauri v2 release"`
  - Push the tag: `git push origin v0.1.0-desktop`
  - Verify CI triggers on the new tag push
  - Monitor CI until release job completes and produces downloadable assets
  - Verify the GitHub Release page shows `.msi`, `.dmg`, `.AppImage` assets

  **Must NOT do**:
  - Do NOT force-push the tag over the old one without deleting it first
  - Do NOT skip the backup branch
  - Do NOT push the tag until Tasks 15 (CI test) and 16 (installer verify) are both green

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git operations + GitHub API verification, well-defined sequence
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential — blocks on Tasks 15 and 16)
  - **Parallel Group**: Wave 3 (final sequential step)
  - **Blocks**: Final Wave verification
  - **Blocked By**: Tasks 15 (CI test green), 16 (installer verified)

  **References**:
  - Old tag: `v0.1.0-desktop` at commit `ac14c8d`
  - Backup branch: `backup/v0.1.0-desktop-old`
  - GitHub Releases API: `gh release view v0.1.0-desktop`

  **Acceptance Criteria**:
  - [ ] Backup branch `backup/v0.1.0-desktop-old` exists pointing to old tag commit
  - [ ] Old tag `v0.1.0-desktop` deleted from local and remote
  - [ ] Old GitHub Release deleted (if existed)
  - [ ] New tag `v0.1.0-desktop` points to HEAD
  - [ ] CI triggers and produces release assets within 30 minutes
  - [ ] GitHub Release page shows downloadable `.msi`/`.dmg`/`.AppImage` files

  **QA Scenarios**:

  ```
  Scenario: New tag triggers CI and produces assets
    Tool: Bash (curl / gh CLI)
    Preconditions: Tag pushed, CI running
    Steps:
      1. Run: git tag -l v0.1.0-desktop
      2. Verify points to HEAD: git rev-parse v0.1.0-desktop == git rev-parse HEAD
      3. Wait for CI: gh run list --workflow release.yml --limit 1
      4. After CI completes: gh release view v0.1.0-desktop --json assets
    Expected Result: Tag at HEAD, CI green, release has .msi/.dmg/.AppImage assets
    Failure Indicators: Tag wrong commit, CI failed, no assets in release
    Evidence: .omo/evidence/task-17-release-assets.txt
  ```

  **Commit**: NO (tag operations)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.omo/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `cargo check` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Typecheck [PASS/FAIL] | Cargo [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Verify local installer launches, DB initializes, icon appears. Test sync import flow (write .db.next, restart, verify DB updated). Test device form (change type, enable reminders). Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Installer [PASS/FAIL] | Sync [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1-7**: One commit per task (7 commits, Wave 1)
- **8-13**: One commit per task (6 commits, Wave 2)
- **14-17**: One commit per task (4 commits, Wave 3)
- **Final**: Single squash if corrections needed from Final Wave

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck                           # Expected: 0 errors
pnpm test                                # Expected: 57+ tests pass
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml  # Expected: 0 errors
pnpm --filter desktop tauri:build        # Expected: installer in target/release/bundle/
git tag -l v0.1.0-desktop               # Expected: points to HEAD
gh release view v0.1.0-desktop          # Expected: shows .msi/.dmg/.AppImage assets
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` green
- [ ] `cargo check` green
- [ ] Installer produced with correct version
- [ ] App icon visible (not blank)
- [ ] `.db.next` auto-applied on restart
- [ ] CI produces release artifacts on tag push
- [ ] Dead code removed
- [ ] Device form bugs fixed
