# EfficiencyMemo

Repository instructions for Codex. Keep this file short and limited to rules that are specific to this repository.

## Priority and scope

- User instructions take precedence over this file and any Skill. Ask only when a missing answer would materially change the result; otherwise make the smallest reasonable assumption and finish the authorized work.
- The repository is a pnpm monorepo. The only deployable surface is `apps/desktop/` (Tauri v2 + Vite/React SPA + local SQLite). `packages/shared/` is a dependency-free leaf package; `packages/ui/` is a presentational React/Tailwind library.
- Instructions closer to a file override this file. Read the nearest `AGENTS.md` before editing package code.

## Hard boundaries

- Keep persistence local through `apps/desktop/src/lib/db.ts` and Tauri SQLite. Schema changes add a numbered migration under `apps/desktop/src-tauri/migrations/`; never rewrite existing migrations.
- Do not restore `bak/`, re-enable WebDAV sync, add web/SSR/Supabase infrastructure, or change product scope without an explicit product decision recorded in `docs/adr/`.
- Reuse `@memo/shared` and `@memo/ui`; do not create feature-local copies of shared contracts or primitives. Do not add a production dependency without checking the whole workspace and documenting why.
- Preserve secrets, PII, generated output, `node_modules/`, and user changes. Never edit `.gitignore` without user approval.

## Commands

Run from the repository root:

```text
pnpm install --frozen-lockfile
pnpm lint                         # all workspaces
pnpm typecheck                    # workspaces that define it
pnpm test                         # all workspace tests
pnpm --filter desktop build       # frontend build
pnpm --filter desktop tauri:build # native installer build
```

Use the narrowest command that proves the change, then run the required broader check before handoff. The native Tauri window from `pnpm --filter desktop tauri:dev` is required for SQLite/native APIs; the Vite URL alone is not an equivalent runtime.

## Code and review rules

- TypeScript is strict: no `any`, `@ts-ignore`, or `@ts-expect-error`. Keep tests beside the source under `__tests__/` and test behavior, not implementation constants.
- Feature or component behavior changes require focused tests when the behavior is non-trivial. Docs-only and reversible metadata edits do not need new tests.
- UI uses semantic tokens from `apps/desktop/src/index.css` (`bg-surface`, `text-foreground`, `text-muted`, `bg-accent`, etc.); do not add hardcoded Tailwind color utilities. Use existing `@memo/ui` primitives and preserve keyboard/screen-reader behavior.
- Add an ADR only for a hard-to-reverse, surprising decision with a real trade-off. Use terms from [`docs/CONTEXT.md`](docs/CONTEXT.md).
- For review, report actionable correctness, scope, security, accessibility, and maintainability findings with file/line evidence. Leave formatting and lint enforcement to CI unless the task changes them.

## Collaboration and handoff

Delegate only an independently describable, verifiable slice when parallel work saves time; the root agent owns integration and final verification. Keep updates concise, state assumptions, and report changed files plus the checks actually run.
