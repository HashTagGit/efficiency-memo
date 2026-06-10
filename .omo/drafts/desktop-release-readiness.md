# Draft: Desktop Release Readiness Assessment

## Core Objective
Ship a working `v0.1.0-desktop` Tauri build with `.exe`/`.msi`/`.dmg`/`.AppImage` installers so users can download and run the desktop app on Windows, macOS, and Linux.

## Original Request
"I find in the github release v0.1.0-desktop, the zip doesn't contain *.exe or *.msi, so how do we use the software?"
→ "plan for this, we need a full consideration, we need to check this release is a good start."

## Context
- `v0.1.0-desktop` tag exists but points to pre-cleanup commit `05e6893`
- Old CI was Docker-based, never built Tauri installers
- New CI (commit `d43681b`) has Tauri build matrix but was never triggered
- GitHub auto-generates source archives for tags without Releases
- Tauri bundle config is active with targets: msi, nsis, dmg, appimage, deb

## Decisions Made
- **Release target**: Personal use only — rough edges acceptable, core functionality must work
- **Blockers**: Fix ALL 5 (sync sidecar auto-apply, icons, Rust compile verify, version mismatch, typecheck errors)
- **Version strategy**: Retag `v0.1.0-desktop` to current HEAD (force-push), but only AFTER all blockers fixed and local installer verified
- **Test strategy**: Tests-after — add desktop tests after hardening fixes, not as release gate. Use vitest (matches existing shared/ui pattern)
- **Desktop test framework**: vitest (node env for pure logic, jsdom for components), matching `packages/shared` and `packages/ui` patterns
- **Rough edges**: Assess each against "release gating" criteria. Fix only items that would cause build failure, app crash, or unusable core flows. Defer polish items to post-release backlog.
- **Metis scope directive**: Split work into Blockers (release-gating) and Backlog (post-release). Do not let the plan mix them.

## Scope Boundaries
- INCLUDE: 5 blockers (sync .db.next auto-apply, icon generation, Rust compile verify, version bump, typecheck fix), dead code removal, CI verification with test tag, retag, installer verification
- EXCLUDE: New feature development, code signing, Linux CI hardening, CoreHour check-in flow implementation, WebDAV live testing, ErrorBoundary, 404 page, CoreHour settings page implementation, design token refactor, AGENTS.md stale references
- ASSESS/DEFER: Broken sub-routes (hide or fix based on effort), desktop test suite (post-release), CI enhancements (post-release), device form bugs (fix only if trivial)

## Research Findings
### From explore agent `bg_b2800f0b` (Release Readiness)
- **`.db.next` sidecar**: sync.rs:200-208 writes `.db.next` on import, but NO startup code in lib.rs/main.rs detects/renames it. Sync import is functionally broken.
- **Icons**: All 5 icon files in `apps/desktop/src-tauri/icons/` are 67-byte 1×1 placeholder PNGs.
- **Rust compile**: Never executed in any tracked environment. `reqwest_dav` v0.3, `rusqlite`, `keyring` crate unverified.
- **tauri.conf.json**: bundle targets = ["msi","nsis","dmg","appimage","deb"], active = true, productName = "EfficiencyMemo", identifier = "com.efficiency-memo.app".
- **Cargo.toml**: version 0.0.1, author = "You" (placeholder).
- **Zero TODO/FIXME/HACK** in desktop source code.

### From explore agent `bg_024c7ecd` (Git State)
- Version mismatch: tauri.conf.json, Cargo.toml, apps/desktop/package.json all say 0.0.1. Tag says 0.1.0-desktop.
- v0.1.0-desktop tag points to commit `ac14c8d` (not `05e6893`). 6 commits exist between tag and HEAD — all doc/cleanup, no user-facing feature changes.
- 9 typecheck errors confirmed in `packages/shared/src/__tests__/types.test.ts` — caused by missing `vitest/globals` types in tsconfig + `expectTypeOf` API misuse on `string | undefined` operands.
- 57/57 tests pass: 16 in `@memo/shared` + 41 in `@memo/ui`.

### From explore agent `bg_f004eb93` (UX Readiness)
- Dead `pages/tools/` tree: 8 files in `apps/desktop/src/pages/tools/` are unused duplicates/wrappers of feature code. App.tsx lazy-loads features directly.
- CoreHour sub-routes broken: `/tools/core-hour/history`, `/tags`, `/settings` have no Route handlers — fall through to empty content.
- Charger Reminder deep links broken: `/tools/charger-reminder/new`, `/:id`, `/:id/edit` have no Route handlers.
- No ErrorBoundary, no 404 page.
- CoreHour settings page is a stub: `handleSave` is no-op, `ch_settings` table seeded but never read/written from UI.
- Device form bugs: `<select onChange={() => {}}>` is no-op; `reminderEnabled` never persisted.
- Sync settings page is polished (status indicators, alert banners, empty states, password security).
- All 3 SQLite migrations complete and valid.

### From explore agent `bg_e56c7306` (Test Infrastructure)
- `packages/shared`: vitest ^3.0.0, node env, 16 tests, `typecheck` script present.
- `packages/ui`: vitest ^3.0.0 + jsdom + @testing-library/react, 41 tests, NO `typecheck` script.
- `apps/desktop`: NO test script, NO vitest, NO test files — zero test infrastructure.
- CI runs `pnpm --filter desktop typecheck` + `pnpm --filter @memo/shared test` — missing `@memo/ui` tests and root typecheck.

## Metis Review Gaps (addressed)
- **Scope inflation risk**: Metis warned against fixing all 17 items. Resolved: only items causing build failure, app crash, or unusable core flows will be fixed. 9 items deferred to post-release.
- **Platform scope undefined**: Resolved: CI matrix for all 3 platforms (Windows/macOS/Linux). No code signing. Personal use accepts unsigned installers.
- **Retag risk**: Resolved: retag is final step, after local build verified and CI tested with dummy tag.
- **Sync scope**: .db.next fix is required (sync is a documented feature). But CoreHour check-in flow and WebDAV live testing are excluded.
- **Test gating**: Desktop tests are post-release, not a release gate. Existing 57 tests + typecheck are the release gate.
