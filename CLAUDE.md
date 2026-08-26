# EfficiencyMemo — CLAUDE.md

## Quick Commands

| Command | Purpose |
|---|---|
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode (HMR + DevTools) |
| `pnpm --filter desktop tauri:build` | Build production installer (.msi / .exe) |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest across all workspaces |
| `pnpm --filter @memo/ui test` | Run UI package tests only |
| `pnpm lint` | ESLint across all workspaces |

> Always use the native Tauri window launched by `tauri:dev`. `http://localhost:1420` is only the Vite dev server — it lacks the SQLite bridge and will crash on any DB call.

## Monorepo Structure

```
EfficiencyMemo/
├── apps/desktop/          # Tauri v2 app — the sole deployable surface
│   ├── src/               # Vite + React SPA (features/, pages/, lib/, components/)
│   └── src-tauri/         # Rust native shell + SQLite migrations
├── packages/shared/       # TypeScript types and constants (zero runtime deps)
└── packages/ui/           # React + Tailwind v4 component library
```

Packages are linked via `workspace:*` in `apps/desktop/package.json`.

## Architecture Constraints

- **Desktop-only, no SSR.** The web surface was archived in v0.1.0-desktop (ADR-0001). Do not add web routes, Docker, or Supabase.
- **Local SQLite only.** All persistence goes through `lib/db.ts` (`dbSelect` / `dbExecute`). Migrations live in `apps/desktop/src-tauri/migrations/` — add a new numbered file for any schema change.
- **Local profile.** No sign-in or external auth service. Startup reuses the existing SQLite user or creates one automatically. See `lib/auth.ts`.
- **SPA routing.** React Router with `BrowserRouter` + `<Routes>`. No file-system routing.
- **Design tokens.** All UI uses dark-theme CSS variables defined in `apps/desktop/src/index.css`. Never use hardcoded Tailwind color utilities (`bg-white`, `text-gray-*`, `bg-blue-*`, etc.) in components or pages — use the token classes (`bg-surface`, `text-foreground`, `text-muted`, `bg-accent`, etc.).

## What Is In Scope

- **CoreHour**: session timing, periodic check-ins (15/30/60 min intervals), tags, daily history, settings, native background notifications.

## What Is Out of Scope — Do Not Change Without an Explicit Product Decision

- **Charger Reminder**: code is retained in `features/charger-reminder/` but the tool is disabled in the Tool Registry. Do not re-enable.
- **WebDAV sync**: code is retained in `pages/settings/sync/` but is not part of the current product. Do not wire it up.

## Domain Vocabulary

Canonical glossary: [`docs/CONTEXT.md`](docs/CONTEXT.md). Use its terms in code, commits, and PRs. Key terms:

| Term | Meaning |
|---|---|
| **CoreHour** | The active product workflow (timing + check-ins) |
| **Desktop Surface** | The Tauri app — the only deployable surface |
| **Deferred Code** | Charger Reminder + WebDAV sync — retained but disabled |
| **Local Profile** | Single local SQLite user selected or created automatically at startup |
| **SQLite Storage** | Local DB via `tauri-plugin-sql`; path is OS app-data dir |

## Component Library (`packages/ui/`)

Components exported from `packages/ui/src/index.ts`: `Button`, `Card`, `Modal`, `Sidebar`, `Shell`, `Input`, `Alert`, `EmptyState`, `PageHeader`.

All components:
- Use `forwardRef`
- Accept `className` and spread `...rest` HTML attributes
- Include `data-testid` on the root/primary element
- Stay under 250 LOC
- Use no third-party icon sets (inline SVGs only)

## Testing

- Framework: Vitest + `@testing-library/react` + jsdom
- Test files: `packages/ui/src/__tests__/*.test.tsx`, `apps/desktop/src/**/__tests__/*.test.tsx`
- Run `pnpm test` before any commit that touches component logic
- Do not use `any` types or `as any` casts

## Commit Convention

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`  
Scopes: `ui`, `desktop`, `core-hour`, `auth`, `db`, `shared`, `settings`, `dashboard`, `sign-in`

## ADRs

Architecture decisions live in [`docs/adr/`](docs/adr/). Create an ADR only when a decision is hard to reverse, surprising without context, and the result of a real trade-off between genuine alternatives.

## AI Agent Workflow Rules

- **不得在没有测试的情况下修改 `features/` 下的逻辑文件。** 每次改动 feature 逻辑，必须同步更新或新增对应的 `__tests__/` 测试，并在提交前通过 `pnpm test`。
- **不得修改 Deferred Code**（`features/charger-reminder/`、`pages/settings/sync/`）除非有明确的产品决策记录在 ADR 中。修改前必须先创建 ADR。
- **不得引入新的第三方依赖**而不说明原因。新依赖须在 PR 描述中列出名称、版本、用途。
- **每次改动组件后**，运行 `pnpm --filter @memo/ui test` 确认全绿再提交。

## Feature Boundary Rules

### Deferred 功能解锁条件

| 功能 | 解锁前提 |
|---|---|
| Charger Reminder | 在 `docs/adr/` 新建 ADR，明确产品目标和 UI 接入方案，获得用户确认 |
| WebDAV Sync | 同上，需额外明确多设备冲突解决策略 |

### Token 使用规则

- 所有颜色必须通过 CSS 变量 utility（`bg-surface`、`text-foreground`、`text-muted`、`bg-accent`、`text-danger` 等）
- 禁止使用 Tailwind 内置颜色 utility：`bg-white`、`text-gray-*`、`bg-blue-*`、`text-red-*` 等
- 新增 token 时先在 `apps/desktop/src/index.css` 的 `:root` + `@theme inline` 两处同步声明
