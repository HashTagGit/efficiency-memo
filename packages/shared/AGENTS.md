# `@memo/shared`

Leaf package for cross-tool TypeScript contracts and static constants. It has zero runtime dependencies and is consumed by the desktop app and `@memo/ui`.

## Rules

- Keep this package runtime-independent: no React, Tauri, Supabase, browser-only APIs, server actions, or imports from `apps/desktop`/`@memo/ui`.
- Export types and constants from `src/index.ts`; do not add default exports. Extend or compose `ToolManifest` instead of redefining identity fields.
- Preserve public export names. Renames require a deprecation path and updates to all consumers.
- Keep constants environment-agnostic; never include secrets or PII. Avoid a build step and runtime polyfills.
- Add a focused behavior/contract test under `src/__tests__/` when a type or constant changes. Do not add tests that only restate a literal.

## Verification

```text
pnpm --filter @memo/shared typecheck
pnpm --filter @memo/shared lint
pnpm --filter @memo/shared test
```
