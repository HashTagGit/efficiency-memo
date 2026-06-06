# Project Docs — Learnings

## 2026-06-04 — AGENTS.md README constraint removed

**Task**: Remove the "Do not generate README files" constraint from the root `AGENTS.md` (line 49).

**What changed**:
- Root `AGENTS.md` line 49 deleted: `- Do not generate README files; the only docs surface in this repo is `AGENTS.md``
- Net file size: 57 lines -> 56 lines
- All adjacent constraints (line 48, original line 50) preserved verbatim
- Section structure (Constraints, Dependencies) preserved

**Why it matters**:
- This was the only AGENTS.md in the monorepo carrying the README ban (verified by grep across all 6 AGENTS.md files in the workspace)
- Removing this constraint unblocks generation of per-tool README files for the Charger-Reminder and CoreHour tools under `apps/web/src/features/<tool-id>/`
- `AGENTS.md` remains the canonical agent-facing doc surface; README files are now allowed as a separate user/developer-facing layer

**Verification evidence**: `.omo/evidence/task-1-constraint-removed.txt`

## 2026-06-04 — MIT LICENSE file created for HashTagGit

**Task**: Add an `MIT LICENSE` file at the repo root covering the HashTagGit project (no extension, standard MIT text, copyright `Copyright (c) 2026 HashTagGit`).

**What changed**:
- New file: `D:\documents\code\git\release\EfficiencyMemo\LICENSE` (1067 bytes, 21 lines)
- Filename is exactly `LICENSE` — no `.txt`/`.md` extension (so GitHub, npm, and most package managers will auto-detect MIT)
- Copyright holder: `HashTagGit`, year `2026`
- Body is the verbatim standard MIT text from https://opensource.org/licenses/MIT — no added/removed clauses

**Why it matters**:
- This monorepo is the public surface for HashTagGit's tool gallery (currently Charger-Reminder and CoreHour); without a LICENSE the code is implicitly "all rights reserved" under default copyright, which would block downstream reuse
- MIT is the de-facto license for Next.js / React / Supabase ecosystem projects and matches the permissive tone of the existing `AGENTS.md` constraints
- No prior LICENSE file existed in the repo (verified by glob `LICENSE*` returning empty), so this is a true addition, not a replacement

**Verification evidence**: `.omo/evidence/task-4-license.txt`

**Cross-platform note**: Verification on Windows PowerShell 7+ — `head`/`grep`/`wc` are not native cmdlets, so used `Get-Content -TotalCount 1` / `Select-String -SimpleMatch` / `(Get-Content).Count` as functional equivalents. Pattern literals with parentheses must be wrapped in single quotes inside `Select-String -Pattern` to avoid regex interpretation.

## 2026-06-04 — apps/web/README.md replaced with redirect stub

**Task**: Overwrite the stock create-next-app `apps/web/README.md` (36 lines, mentioning Geist font, npm/yarn/pnpm/bun dev, Vercel deploy) with a short redirect stub that defers to the root README, ARCHITECTURE.md, and CONTRIBUTING.md.

**What changed**:
- File: `apps/web/README.md` — replaced 36-line boilerplate with 14-line stub
- Final size: 14 lines (limit: 25) — 22 lines under budget
- All 7 grep assertions passed: zero matches for `create-next-app` / `Geist` / `Vercel`; matches for `../../README.md` (×2), `../../ARCHITECTURE.md`, `../../CONTRIBUTING.md`, `pnpm dev`
- Evidence: `.omo/evidence/task-7-redirect-stub.txt`

**Why it matters**:
- The stock template is wrong for a monorepo deployable: it claims `npm run dev` and `bun dev` work (they don't, only `pnpm dev` fans out to all workspaces), and it advertises Vercel-only deploys (the real quick start is in the root README)
- apps/web is one package in a 5-package monorepo — its README should defer to the canonical surfaces (root README for overview, ARCHITECTURE.md for system design, CONTRIBUTING.md for setup)
- The `../../` relative paths are correct because `apps/web/` sits two levels below the monorepo root (verified: `apps/web/../../` = repo root)
- Stub includes `pnpm dev` / `pnpm test` / `pnpm test:e2e` so newcomers visiting the package directly see the right commands without bouncing back to root docs

## 2026-06-04 — Root README.md created

**Task**: Create root `README.md` as a dual-purpose landing page for end users (feature descriptions) and developers (quick start, tech stack).

**What changed**:
- New file: `D:\documents\code\git\release\EfficiencyMemo\README.md` (87 lines, within 80-150 range)
- Structure follows the exact 9-section layout specified in the task
- All required sections present: Header, About, Features (Charger Reminder + CoreHour), Tech Stack, Quick Start, Scripts, Architecture, Contributing, License
- Links to `./ARCHITECTURE.md`, `./CONTRIBUTING.md`, `./LICENSE` (all relative paths from repo root)
- All constraint checks passed: zero GitHub badges, zero deployment instructions, zero `create-next-app`/`Geist`/`Vercel` references

**Why it matters**:
- This is the first user-facing documentation surface for the repo; prior to this, only `AGENTS.md` existed (agent-facing, not human-facing)
- The README bridges two audiences: end users who want to know what the tools do, and developers who need to get the monorepo running locally
- Tech stack versions are pinned to actual `package.json` values (Next.js 16.2.6, React 19.2.4, Playwright ^1.60.0) rather than generic "latest" placeholders
- Quick Start includes the `npx supabase start` step that is required but was missing from the original draft

**Verification evidence**: README.md line count = 87; grep confirms all 13 structural assertions pass; forbidden-terms check = clean

## 2026-06-04 — CHANGELOG.md created in Keep a Changelog format

**Task**: Create a curated `CHANGELOG.md` at repo root from the 5 existing commits, formatted per Keep a Changelog 1.1.0.

**What changed**:
- New file: `CHANGELOG.md` (27 lines, under 60 line limit)
- Single version `## [0.0.1] - 2026-06-04` grouping changes under Added, Setup, and Infrastructure
- Raw commit messages were translated into semantic categories; no verbatim dump
- No references to `boulder.json` or `.omo/` internal artifacts
- Link reference footer included: `[0.0.1]: https://github.com/HashTagGit/efficiency-memo/releases/tag/v0.0.1`

**Why it matters**:
- Keep a Changelog is the standard human-readable format for release notes; it replaces opaque commit history with curated, categorized changes
- Version 0.0.1 matches `package.json` and represents the initial foundation milestone
- Separating "Added" (user-facing features) from "Setup" and "Infrastructure" (developer-facing bootstrapping) makes the changelog useful to both audiences

**Verification evidence**: `.omo/evidence/task-6-changelog.txt`
