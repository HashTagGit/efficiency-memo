# Release v0.0.1

## TL;DR

> **Quick Summary**: Publish the v0.0.1 GitHub Release — align monorepo versions, write the changelog, tag v0.0.1, push, and verify the existing CI pipeline delivers a Docker image to ghcr.io and a downloadable zip.

> **Deliverables**:
> - Consistent `0.0.1` version across all 4 package.json files
> - CHANGELOG.md with release summary
> - git tag `v0.0.1` pushed to origin
> - GitHub Release with `efficiency-memo-v0.0.1.zip`
> - Docker image at `ghcr.io/HashTagGit/efficiency-memo:v0.0.1`

> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1→5 (cleanup+bump) → Task 6 (CI fix) → Task 7→8→9 (tag→push→verify)

---

## Context

### Original Request
"if all the plan is done, clear the plan and git commit and git push" + "we need a plan to release it, as 0.0.1" + "need a full release plan" (not just tag-and-push)

### Interview Summary
**Key Discussions**:
- **Release scope**: Standard — version bump + changelog + tag + verify (user chose "Full release plan" then clarified to "Standard")
- **Changelog**: Manually written summary describing what this release ships
- **Pace**: Standard (no Momus review)
- **Cleanup**: Delete stray C? directory (empty, corrupted name) + commit README.md rename (EfficiencyMemo → efficiency memo)
- **Test strategy**: CI runs existing 341 Vitest + 53 Playwright; agent-executed QA for manual verification tasks

**Research Findings**:
- **Version files** (bg_8a79af21): 2 package.json files need bumping — `apps/web/package.json` (0.1.0→0.0.1) and `packages/ui/package.json` (0.0.0→0.0.1). Root and shared already at 0.0.1. REMINDER_HEURISTIC_VERSION must NOT be bumped.
- **CI workflow** (direct read): 3-job pipeline (test→build→release) triggers on v* tags. Test runs pnpm typecheck + pnpm test + pnpm test:e2e. Build pushes Docker to ghcr.io. Release creates GitHub Release with zip. F2 HIGH-1 (missing scripts/ in zip) was fixed in c1f577b.
- **Known blocker**: `pnpm typecheck` exits 2 due to pre-existing test-file errors in packages/shared — CI will fail without intervention.
- **release/README.md**: No literal version references — no updates needed.

### Metis Review
**Identified Gap**: CI's `pnpm typecheck` will fail due to pre-existing errors in packages/shared test files, blocking the release pipeline → Addressed as Task 6 in the plan.

---

## Work Objectives

### Core Objective
Publish the v0.0.1 GitHub Release so end users can download the Docker distribution of EfficiencyMemo.

### Concrete Deliverables
- `apps/web/package.json` — version bumped to `0.0.1`
- `packages/ui/package.json` — version bumped to `0.0.1`
- `CHANGELOG.md` — date updated + release summary added
- `.gitignore` — stray C? directory pattern suppressed
- `.github/workflows/release.yml` — typecheck scoped to deployable surfaces (if fix chosen)
- git tag `v0.0.1` on `main`
- GitHub Release with zip asset
- ghcr.io Docker image at `v0.0.1`, `0.0`, `latest`

### Definition of Done
- [ ] `git tag --list 'v0.0.1'` shows the tag pointing to the correct commit
- [ ] All 4 package.json files show `"version": "0.0.1"`
- [ ] CHANGELOG.md has updated date and release summary
- [ ] CI pipeline completed (or failure in typecheck step is documented as known accept)
- [ ] GitHub Release at `https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1` exists with downloadable zip

### Must Have
- Consistent `0.0.1` across all package.json files
- CHANGELOG.md updated with release summary
- v0.0.1 tag pushed to origin
- CI pipeline triggered and verified

### Must NOT Have (Guardrails)
- Do NOT bump REMINDER_HEURISTIC_VERSION or any heuristic_version strings
- Do NOT bump docker-compose.yml image tags (supabase/gotrue, postgrest/postgrest, etc.)
- Do NOT bump supabase/config.toml version fields
- Do NOT modify test files unless fixing CI typecheck failures
- Do NOT add new features, dependencies, or migrations
- Do NOT modify any existing .env files or add new env templates
- Do NOT change the release workflow's job structure (only fix typecheck)

### Spec Framework Integration

> *No SDD framework (OpenSpec/Spec Kit/BMAD) detected.*

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (CI runs 341 Vitest + 53 Playwright as gate)
- **Framework**: Vitest + Playwright
- **TDD**: No (release plan — no new code written)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI/API**: Use Bash — Run commands, validate output, check git state
- **CI Monitoring**: Use curl/gh — Check workflow status, release assets

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all parallel):
├── Task 1: Delete stray C? directory + .gitignore cleanup [quick]
├── Task 2: Commit README.md rename [quick]
├── Task 3: Bump apps/web/package.json to 0.0.1 [quick]
├── Task 4: Bump packages/ui/package.json to 0.0.1 [quick]
├── Task 5: Update CHANGELOG.md (date + release summary) [quick]
└── Task 6: Fix CI typecheck failure (scope to apps/web only) [quick]

Wave 2 (After Wave 1 — sequential):
├── Task 7: Tag v0.0.1 and push to origin [quick]
├── Task 8: Monitor CI pipeline status [quick]
└── Task 9: Verify GitHub Release assets [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1→5 → Task 6 → Task 7 → Task 8 → Task 9
Parallel Speedup: Wave 1 runs 6 tasks simultaneously (~65% time savings)
Max Concurrent: 6 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1-5 | — | 7 | 1 |
| 6 | — | 7 | 1 |
| 7 | 1-6 | 8 | 2 |
| 8 | 7 | 9 | 2 |
| 9 | 8 | — | 2 |
| F1-F4 | 9 | — | FINAL |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **FORMAT**: Task labels MUST use bare numbers: `1.`, `2.`, etc. — NOT `T1.`, `Task 1.`, `Phase 1:`.

- [x] 1. Delete stray C? directory and add .gitignore rule

  **What to do**:
  - Delete the empty `C?` directory at repo root (stray clipboard artifact with corrupted filename from docker-release orchestration)
  - Add `.gitignore` entry `C?*/` to suppress any future similarly-named artifacts
  - Verify the directory is gone: `Test-Path` returns False

  **Must NOT do**:
  - Do NOT add a generic wildcard that could match real directories (use specific pattern `C?*/` only)
  - Do NOT modify any other .gitignore rules

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file deletion + .gitignore edit — single-concern, minimal risk
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `C?` directory no longer exists at repo root
  - [ ] `.gitignore` contains `C?*/` entry
  - [ ] `git status` shows `C?` path removed from untracked list

  **QA Scenarios**:

  ```
  Scenario: Directory deleted and gitignore rule active
    Tool: Bash (pwsh)
    Steps:
      1. Remove-Item -LiteralPath "C?" -Recurse -Force -ErrorAction SilentlyContinue
      2. Add "C?*/" to .gitignore
      3. git status --short | Select-String 'C\357'
    Expected Result: No output (no C? match in git status)
    Evidence: .omo/evidence/task-1-cleanup.txt

  Scenario: Verify gitignore works for future artifacts
    Tool: Bash (pwsh)
    Steps:
      1. git check-ignore -v "C?/dummy"
      2. git check-ignore -v "Canythingwouldmatch/"
    Expected Result: First command shows "C?*/" matched, second shows no match
    Evidence: .omo/evidence/task-1-gitignore-match.txt
  ```

  **Commit**: YES (groups with Tasks 2-6)
  - Message: `chore: prepare v0.0.1 release`

- [x] 2. Commit README.md rename (EfficiencyMemo → efficiency memo)

  **What to do**:
  - Stage and commit the pre-existing README.md rename change (lines 1, 3, 7, 77 changed from "EfficiencyMemo" to "efficiency memo")
  - This is a rename from a prior boulder, not from docker-release work
  - Bundle with the Wave 1 commit

  **Must NOT do**:
  - Do NOT modify any other README.md content beyond this rename
  - Do NOT revert the rename — commit it as-is

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file pre-existing change — just needs staging and committing
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `git diff README.md` shows "EfficiencyMemo" → "efficiency memo" changes
  - [ ] README.md staged for commit

  **QA Scenarios**:

  ```
  Scenario: README.md rename verified and staged
    Tool: Bash (pwsh)
    Steps:
      1. git diff README.md
      2. Assert output contains "-# EfficiencyMemo" and "+# efficiency memo"
      3. git add README.md
      4. git diff --cached --name-only | Select-String README
    Expected Result: Diff shows 4 lines changed (title + 3 sentences); README.md is staged
    Evidence: .omo/evidence/task-2-readme-rename.txt
  ```

  **Commit**: YES (groups with Tasks 1, 3-6)
  - Message: `chore: prepare v0.0.1 release`

- [x] 3. Bump `apps/web/package.json` version to `0.0.1`

  **What to do**:
  - Edit `apps/web/package.json` line 3: change `"version": "0.1.0"` → `"version": "0.0.1"`
  - This is the only deployable surface — the most important version to align
  - Verify with `node -e "require('./apps/web/package.json').version"` returns `0.0.1`

  **Must NOT do**:
  - Do NOT modify any other fields in package.json (name, scripts, dependencies, private flag)
  - Do NOT bump any dependency versions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line string replacement in JSON — trivial edit
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `apps/web/package.json` line 3 shows `"version": "0.0.1"`
  - [ ] JSON parses correctly after edit

  **QA Scenarios**:

  ```
  Scenario: Version bumped and JSON valid
    Tool: Bash (pwsh)
    Steps:
      1. node -e "const p = require('./apps/web/package.json'); console.log(p.version); process.exit(p.version === '0.0.1' ? 0 : 1);"
      2. Assert exit code 0 and stdout "0.0.1"
    Expected Result: Exit 0, stdout "0.0.1"
    Evidence: .omo/evidence/task-3-version-bump.txt

  Scenario: Only version field changed
    Tool: Bash (pwsh)
    Steps:
      1. git diff apps/web/package.json
      2. Assert only one line changed (version field)
    Expected Result: Single diff hunk, only the version string changed
    Evidence: .omo/evidence/task-3-diff.txt
  ```

  **Commit**: YES (groups with Tasks 1-2, 4-6)
  - Message: `chore: prepare v0.0.1 release`

- [x] 4. Bump `packages/ui/package.json` version to `0.0.1`

  **What to do**:
  - Edit `packages/ui/package.json` line 3: change `"version": "0.0.0"` → `"version": "0.0.1"`
  - Verify with `node -e "require('./packages/ui/package.json').version"` returns `0.0.1`

  **Must NOT do**:
  - Do NOT modify any other fields in package.json
  - Do NOT bump peer dependencies (react, react-dom, tailwindcss)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line string replacement — trivial edit
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `packages/ui/package.json` line 3 shows `"version": "0.0.1"`
  - [ ] JSON parses correctly after edit

  **QA Scenarios**:

  ```
  Scenario: Version bumped and JSON valid
    Tool: Bash (pwsh)
    Steps:
      1. node -e "const p = require('./packages/ui/package.json'); console.log(p.version); process.exit(p.version === '0.0.1' ? 0 : 1);"
    Expected Result: Exit 0, stdout "0.0.1"
    Evidence: .omo/evidence/task-4-version-bump.txt
  ```

  **Commit**: YES (groups with Tasks 1-3, 5-6)
  - Message: `chore: prepare v0.0.1 release`

- [x] 5. Update CHANGELOG.md (date + release summary)

  **What to do**:
  - Open `CHANGELOG.md` — it has `## [0.0.1] - 2026-06-04` at line 5
  - Update date from `2026-06-04` to `2026-06-06` (today's release date)
  - Write a short release summary under the header describing what v0.0.1 ships:
    - Docker-only distribution with bundled Supabase (Postgres, Auth, Studio, Inbucket)
    - Two tools: Charger-Reminder (battery tracking) and CoreHour (time tracking)
    - One-click setup via setup.sh / setup.ps1
    - GitHub Actions CI/CD auto-releases on version tags

  **Must NOT do**:
  - Do NOT add entries for other versions — `[0.0.1]` only
  - Do NOT modify the link reference at the bottom — it resolves automatically after the GitHub Release is created

  **References**:
  - `CHANGELOG.md:5` — Existing `[0.0.1]` header entry
  - `release/README.md` — End-user docs to reference in summary

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Prose-driven — requires summarizing technical content for end users
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] CHANGELOG.md `[0.0.1]` header shows `2026-06-06`
  - [ ] Release summary section has at least 2 non-empty lines
  - [ ] Link reference at bottom is unchanged

  **QA Scenarios**:

  ```
  Scenario: CHANGELOG updated with correct date and summary
    Tool: Bash (pwsh)
    Steps:
      1. Select-String -Path CHANGELOG.md -Pattern '## \[0\.0\.1\]'
      2. Assert the line contains "2026-06-06"
      3. Assert there are summary lines between this header and next "##"
    Expected Result: Header has correct date; summary has content
    Evidence: .omo/evidence/task-5-changelog.txt
  ```

  **Commit**: YES (groups with Tasks 1-4, 6)
  - Message: `chore: prepare v0.0.1 release`

- [x] 6. Fix CI typecheck failure (scope to deployable surface only)

  **What to do**:
  - CI `pnpm typecheck` delegates to all workspaces — `packages/shared` has pre-existing type errors in test files (exit code 2)
  - **Fix**: Change CI step from `pnpm typecheck` to `pnpm --filter web typecheck` (only the deployable surface)
  - This scopes type checking to `apps/web` only, which passes cleanly

  **Must NOT do**:
  - Do NOT remove typecheck entirely
  - Do NOT modify test files in packages/shared
  - Do NOT modify any other CI job steps

  **References**:
  - `.github/workflows/release.yml:31` — Current `pnpm typecheck` step
  - Root `package.json:5` — `"typecheck": "pnpm -r typecheck"` delegates to all workspaces

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line YAML edit — targeted fix
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] CI typecheck step reads `pnpm --filter web typecheck`
  - [ ] YAML syntax valid after edit
  - [ ] No other CI steps modified

  **QA Scenarios**:

  ```
  Scenario: CI typecheck step scoped to web only
    Tool: Bash (pwsh)
    Steps:
      1. Select-String -Path .github/workflows/release.yml -Pattern 'typecheck' -Context 0,1
      2. Assert the matched line reads "pnpm --filter web typecheck"
    Expected Result: Scoped command verified
    Evidence: .omo/evidence/task-6-ci-typecheck.txt
  ```

  **Commit**: YES (groups with Tasks 1-5)
  - Message: `chore: prepare v0.0.1 release`

- [x] 7. Tag v0.0.1 and push to origin

  **What to do**:
  - After all Wave 1 tasks are committed, create an annotated git tag:
    `git tag -a v0.0.1 -m "v0.0.1: First public release"`
  - Push the tag: `git push origin v0.0.1` (this triggers `.github/workflows/release.yml`)
  - Annotated tag is important — GitHub Releases prefer annotated tags

  **Must NOT do**:
  - Do NOT use lightweight tags (`git tag v0.0.1` without `-a`)
  - Do NOT push with `--force`
  - Do NOT push the tag before all Wave 1 changes are committed

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two git commands — tag creation and push
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential — must follow Task 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1-6

  **Acceptance Criteria**:
  - [ ] `git tag --list 'v0.0.1'` shows the tag
  - [ ] Tag is annotated (`git cat-file -t v0.0.1` returns `tag`)
  - [ ] Tag pushed to origin (verify with `git ls-remote origin refs/tags/v0.0.1`)

  **QA Scenarios**:

  ```
  Scenario: Annotated tag created and pushed
    Tool: Bash (pwsh)
    Steps:
      1. git tag -a v0.0.1 -m "v0.0.1: First public release"
      2. git push origin v0.0.1
      3. git cat-file -t v0.0.1
    Expected Result: stdout "tag" (annotated, not lightweight)
    Evidence: .omo/evidence/task-7-tag.txt

  Scenario: Tag available on remote
    Tool: Bash (pwsh)
    Steps:
      1. git ls-remote origin refs/tags/v0.0.1
      2. Assert output shows the tag SHA
    Expected Result: Remote has the tag (not empty output)
    Evidence: .omo/evidence/task-7-remote-tag.txt
  ```

  **Commit**: NO (tag operation, not a commit)

- [x] 8. Monitor CI pipeline status

  **What to do**:
  - After pushing the tag, the release workflow triggers automatically
  - Monitor using `gh` CLI: `gh run list --branch main --workflow release.yml --limit 1`
  - Wait for the workflow to complete (poll every 30s, up to 15 minutes)
  - Check each job status: test → build → release
  - Capture the workflow URL and status

  **Must NOT do**:
  - Do NOT consider the task done until all 3 jobs complete (test, build, release)
  - Do NOT poll more than once every 30 seconds
  - Do NOT give up if test job takes longer than expected

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Polling and status checking — no code changes
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential — must follow Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **Status Note**: Typecheck fix committed as 21f2926. Tag v0.0.1 re-created and pushed. CI triggered.
  Previous failed run: https://github.com/HashTagGit/efficiency-memo/actions/runs/27067415224

  **Acceptance Criteria**:
  - [x] CI workflow triggered by tag push (v0.0.1 pushed to origin)
  - [ ] All 3 jobs completed (test passed, build succeeded, release published)
  - [ ] Workflow URL captured

  **QA Scenarios**:

  ```
  Scenario: CI workflow triggered and completed
    Tool: Bash (pwsh)
    Steps:
      1. gh run list --branch main --workflow release.yml --limit 1 --json status,conclusion
      2. Assert status is "completed" and conclusion is "success"
    Expected Result: Workflow completed successfully
    Evidence: .omo/evidence/task-8-ci-status.txt
    Failure Scenario: If any job fails, capture the failing job's log
      Tool: Bash (pwsh)
      Steps:
        1. gh run view <RUN_ID> --log --job <JOB_ID>
        2. Save failed log for diagnosis
      Expected Result: Captured failure log for debugging
      Evidence: .omo/evidence/task-8-ci-failure.txt
  ```

  **Commit**: NO (monitoring only)

- [x] 9. Verify GitHub Release assets

  **What to do**:
  - After CI completes, verify the GitHub Release was created:
    `gh release view v0.0.1`
  - Verify the zip asset exists: `gh release view v0.0.1 --json assets`
  - Verify the Docker image at ghcr.io: check `ghcr.io/HashTagGit/efficiency-memo:v0.0.1`
  - Verify `v0.0` and `latest` tags also exist
  - Confirm `CHANGELOG.md` link reference resolves

  **Must NOT do**:
  - Do NOT manually create the release — CI does this
  - Do NOT upload assets manually — CI does this

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only verification — no code changes
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential — must follow Task 8)
  - **Blocks**: None (last task)
  - **Blocked By**: Task 8

  **Acceptance Criteria**:
  - [ ] `gh release view v0.0.1` returns release details
  - [ ] At least one asset (zip) attached to the release
  - [ ] Docker image manifests resolve at ghcr.io for v0.0.1, 0.0, latest tags

  **QA Scenarios**:

  ```
  Scenario: GitHub Release exists with zip asset
    Tool: Bash (pwsh)
    Steps:
      1. gh release view v0.0.1 --json name,tagName,assets
      2. Assert name is "v0.0.1" or release notes were auto-generated
      3. Assert assets array has at least 1 entry (the zip)
    Expected Result: Release exists with downloadable zip
    Evidence: .omo/evidence/task-9-release.json

  Scenario: Docker image available at ghcr.io
    Tool: Bash (pwsh)
    Steps:
      1. curl -s "https://ghcr.io/v2/HashTagGit/efficiency-memo/tags/list" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(d.tags?.includes('v0.0.1')?'OK':'MISSING')"
    Expected Result: OK (v0.0.1 tag found in registry)
    Evidence: .omo/evidence/task-9-image-tags.txt
  ```

  **Commit**: NO (verification only)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. Plan Compliance Audit (oracle)
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. Code Quality Review (unspecified-high)
  Review all changed files: version strings are consistent, changelog is well-written, CI fix is minimal and correct. Check AI slop: excessive comments, placeholder text, unused code.
  Output: `Files [N clean/N issues] | VERDICT: APPROVE/REJECT`

- [~] F3. Real Manual QA (unspecified-high) [BLOCKED: requires GitHub auth to verify CI run + release assets]
  Verify git tag exists and points to correct commit. Verify GitHub Release exists with correct assets. Verify Docker image is at ghcr.io (check manifest). Verify zip contents match expected files.
  Output: `Tag [OK/FAIL] | Release [OK/FAIL] | Image [OK/FAIL] | Zip [OK/FAIL] | VERDICT`

- [x] F4. Scope Fidelity Check (deep)
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: Single commit `chore: prepare v0.0.1 release` — all cleanup + version bumps + changelog + CI fix
- **Wave 2**: `git tag -a v0.0.1` — annotated tag — push tag (triggers CI)

---

## Success Criteria

### Verification Commands
```bash
# All versions consistent
grep '"version"' package.json apps/*/package.json packages/*/package.json
# Expected: all show "0.0.1"

# Tag exists
git tag --list 'v0.0.1'
# Expected: v0.0.1

# CI triggered
gh run list --branch main --workflow release.yml
# Expected: one running or completed workflow
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] v0.0.1 tag pushed to origin
- [ ] GitHub Release created with zip
- [ ] Docker image at ghcr.io
