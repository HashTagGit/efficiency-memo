# Test Relevance Audit — Task 7

**Date**: 2026-06-10
**Scope**: All 57 Vitest cases across `packages/shared` (16 tests) and `packages/ui` (41 tests)
**Method**: Read each test file, verify tested source still exists, grep desktop app for imports.

---

## Summary

| File | Tests | Status | Rationale |
|------|-------|--------|-----------|
| `packages/shared/src/__tests__/types.test.ts` | 16 | Mixed | 7 relevant (ToolManifest), 9 marginal/obsolescent |
| `packages/ui/src/__tests__/button.test.tsx` | 13 | Relevant | Button consumed by 5 desktop files |
| `packages/ui/src/__tests__/card.test.tsx` | 6 | Relevant | Card consumed by 2 desktop files |
| `packages/ui/src/__tests__/modal.test.tsx` | 7 | Obsolescent | Modal exists but **not imported** by desktop app |
| `packages/ui/src/__tests__/sidebar.test.tsx` | 8 | Relevant | Sidebar composed inside Shell, which desktop uses |
| `packages/ui/src/__tests__/shell.test.tsx` | 7 | Relevant | Shell consumed directly by desktop app |

**Grand total**: 57 tests (39 relevant, 10 marginal, 8 obsolescent).

---

## packages/shared/src/__tests__/types.test.ts (16 tests)

### ToolManifest — 7 tests → **RELEVANT**
- **Source**: `packages/shared/src/types.ts` (lines 2–9)
- **Consumed by**: `apps/desktop/src/components/shell-layout.tsx`, `lib/tool-registry/{types,registry}.ts`, `features/{core-hour,charger-reminder}/manifest.ts`
- **Also consumed by**: `packages/ui/src/{sidebar,shell}.tsx`
- The shape `id, name, icon, description, routes, enabled` drives the entire sidebar and registry.

### ToolRegistration — 1 test → **MARGINAL**
- **Source**: `packages/shared/src/types.ts` (lines 12–15)
- **Not imported** by desktop app or `packages/ui`.
- Desktop app defines its own `RegisteredTool` in `apps/desktop/src/lib/tool-registry/types.ts` with a `componentLoader` field instead of `component`.
- The exported `ToolRegistration` type is dead code.

### User — 3 tests → **MARGINAL**
- **Source**: `packages/shared/src/types.ts` (lines 18–24)
- **Not imported** by desktop app.
- Desktop app defines a local `User` interface in `apps/desktop/src/lib/auth.ts` with a different shape (`email` required locally, optional in shared).
- The shared `User` type is dead code.

### DashboardTool — 2 tests → **OBSOLESCENT**
- **Source**: `packages/shared/src/types.ts` (lines 27–30)
- **Not imported** anywhere outside this test file.
- `lastUsed` and `usageCount` fields are not surfaced in any dashboard UI.

### Constants (APP_NAME, APP_DESCRIPTION, DEFAULT_REDIRECT) — 3 tests → **MARGINAL**
- **Source**: `packages/shared/src/constants.ts`
- **Not imported** by desktop app or `packages/ui`.
- `APP_NAME` value (`"EfficiencyMemo"`) is hard-coded in `packages/ui/src/sidebar.tsx` line 33 instead of imported.
- `DEFAULT_REDIRECT` (`"/dashboard"`) is not referenced anywhere in desktop routing.

---

## packages/ui/src/__tests__/button.test.tsx (13 tests) → **RELEVANT**

- **Source**: `packages/ui/src/button.tsx` — exists, exports `Button` with `variant`, `size`, `isLoading`.
- **Consumed by desktop app** (5 files):
  - `apps/desktop/src/pages/sign-in/page.tsx`
  - `apps/desktop/src/pages/settings/sync/page.tsx`
  - `apps/desktop/src/features/charger-reminder/components/device-form.tsx`
  - `apps/desktop/src/features/core-hour/components/dashboard.tsx`
  - `apps/desktop/src/features/core-hour/components/tag-bar.tsx`
- All 13 tests exercise props that are actively used (`onClick`, `variant`, `size`, `isLoading`, `disabled`).

---

## packages/ui/src/__tests__/card.test.tsx (6 tests) → **RELEVANT**

- **Source**: `packages/ui/src/card.tsx` — exists, exports `Card` with `title`, `description`, `icon`, `onClick`, `href`.
- **Consumed by desktop app** (2 files):
  - `apps/desktop/src/pages/dashboard/page.tsx`
  - `apps/desktop/src/features/charger-reminder/components/device-card.tsx`
- All 6 tests cover active props (`title`, `description`, `icon`, `onClick`, `href`).

---

## packages/ui/src/__tests__/modal.test.tsx (7 tests) → **OBSOLESCENT**

- **Source**: `packages/ui/src/modal.tsx` — exists, exports `Modal` with `isOpen`, `onClose`, `title`, `children`.
- **NOT consumed by desktop app**. Grep for `Modal` in `apps/desktop/src/` returned zero matches.
- The component is exported from `packages/ui/src/index.ts` but never imported downstream.
- **Risk**: If Modal is removed or its API changes, these 7 tests will break despite having no consumer.

---

## packages/ui/src/__tests__/sidebar.test.tsx (8 tests) → **RELEVANT**

- **Source**: `packages/ui/src/sidebar.tsx` — exists, exports `Sidebar` with `tools`, `activeToolId`, `onToolSelect`, `isCollapsed`, `onToggle`.
- **Not directly imported** by desktop app, but **composed inside `Shell`** (`shell.tsx`), which **is** consumed by `apps/desktop/src/components/shell-layout.tsx`.
- Sidebar is therefore on the active render path; all 8 tests are relevant.

---

## packages/ui/src/__tests__/shell.test.tsx (7 tests) → **RELEVANT**

- **Source**: `packages/ui/src/shell.tsx` — exists, exports `Shell` with `tools`, `activeToolId`, `onToolSelect`, `isCollapsed`, `onToggle`, `userEmail`, `onSignOut`, `children`.
- **Consumed by desktop app**: `apps/desktop/src/components/shell-layout.tsx`
- All 7 tests cover active props and DOM structure (`desktop-sidebar`, `shell-header`, `sign-out-button`, `mobile-menu-button`).

---

## Obsolescent / Marginal Details

| Symbol | Location | Why marginal / obsolescent |
|--------|----------|---------------------------|
| `ToolRegistration` | `packages/shared/src/types.ts` | Desktop uses `RegisteredTool` (local) instead |
| `User` | `packages/shared/src/types.ts` | Desktop uses local `User` in `lib/auth.ts` |
| `DashboardTool` | `packages/shared/src/types.ts` | Zero consumers |
| `APP_NAME` | `packages/shared/src/constants.ts` | Hard-coded in sidebar; zero imports |
| `APP_DESCRIPTION` | `packages/shared/src/constants.ts` | Zero consumers |
| `DEFAULT_REDIRECT` | `packages/shared/src/constants.ts` | Zero consumers |
| `Modal` | `packages/ui/src/modal.tsx` | Exported but never imported by desktop |

---

## Recommendations (for future cleanup — out of scope for this audit)

1. **Remove dead exports** from `@memo/shared`: `ToolRegistration`, `User`, `DashboardTool`, `APP_NAME`, `APP_DESCRIPTION`, `DEFAULT_REDIRECT` — or start consuming them.
2. **Decide on Modal**: Either start using `Modal` in the desktop app (e.g., for confirmation dialogs) or remove the component and its 7 tests.
3. **If dead code is kept**, consider marking the associated tests with `.todo` or a comment explaining they guard unused API surface.
