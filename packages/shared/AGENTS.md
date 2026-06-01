# packages/shared

## Purpose
`@memo/shared` is the cross-tool type and constant package. It owns the contracts that let the tool registry, the shell sidebar, and the per-tool features agree on the shape of a tool manifest, the application identity, and the user model. Because the package has no runtime side effects, both `apps/web` and `packages/ui` can import it without creating cycles.

## Context
The package is consumed by every other workspace. The web app imports it for `APP_NAME` (rendered in the root layout) and for the `ToolManifest` type that drives the sidebar. The UI package imports `ToolManifest` to type its `Sidebar` and `Shell` props.

**Exports** (from `src/index.ts`):
- **Types** (`src/types.ts`): `ToolManifest`, `ToolRegistration`, `User`, `DashboardTool`
- **Constants** (`src/constants.ts`): `APP_NAME = 'EfficiencyMemo'`, `APP_DESCRIPTION = 'A unified tool gallery for daily productivity'`, `DEFAULT_REDIRECT = '/dashboard'`

**ToolManifest fields**: `id`, `name`, `icon`, `description`, `routes[]`, `enabled`, every feature must produce one to register.

**ToolRegistration** couples a `ToolManifest` with a `componentLoader: () => Promise<{ default: React.ComponentType }>` for lazy loading.

## Patterns
- Keep the package dependency-free at runtime; do not pull in `react`, `next`, or `@supabase`
- Use `type` exports for interfaces and value exports for constants; never `default export` from this package
- All new shared types must extend or compose `ToolManifest` rather than redefine an id/name pair
- Run `pnpm --filter @memo/shared typecheck` and `pnpm --filter @memo/shared test` to validate changes
- Add a matching test in `src/__tests__/` whenever a type or constant is added or renamed
- Use `as const` only for genuinely frozen objects; prefer `ReadonlyArray<T>` and explicit `interface` for new shapes

## Constraints
- Do not import from `apps/web` or `packages/ui`; that would create a cycle and the package would no longer be leaf-level
- Do not add code that requires a runtime polyfill; this package runs in the browser, Node, and the Supabase server context
- Do not put React components, server actions, or Supabase client construction here
- Do not include PII, secrets, or environment-specific values in the constants; the three exports are static and ship to every consumer
- Do not rename the public exports without a deprecation step; the sidebar, the registry, and the auth flow all read them
- Do not introduce a build step; consumers read `.ts` straight from `src/`

## Dependencies
- **Runtime**: none (zero dependencies, leaf package)
- **Dev**: `typescript ^5` (declared in `tsconfig.base.json` via the workspace), `vitest ^3.0.0` for tests
- **Downstream consumers**: `apps/web`, `packages/ui`, every feature under `apps/web/src/features/*`
- **Config**: `package.json` exposes `.` as `./src/index.ts` for both `main`, `types`, and `exports`
