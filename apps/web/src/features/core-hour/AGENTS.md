# features/core-hour

## Purpose
CoreHour is a time-tracking tool built around periodic check-ins. A user starts a session with a configurable interval, the UI prompts for a check-in every N minutes, and each check-in is tagged so the user can later see how their time broke down. The feature owns its types, the local DB abstraction for in-progress sessions, the React Context providers, and the per-route pages.

## Context
Feature folder: `apps/web/src/features/core-hour/`. It self-registers through `index.ts` and surfaces four routes declared in `manifest.ts`: `/tools/core-hour` (dashboard), `/tools/core-hour/history`, `/tools/core-hour/tags`, `/tools/core-hour/settings`. Pages are loaded by `component-loader.ts` from `pages/dashboard-page.tsx`.

**Sub-folders**:
- `hooks/`, `use-timer.ts` (interval timer with visibility auto-pause), `use-session.ts` and `use-tags.ts` (re-exports of the providers in `context.tsx`), `use-history.ts` (read-only filter for completed sessions), `db.ts` (mockable `getDb()` abstraction), `context.tsx` (both `SessionProvider` and `TagsProvider`)
- `components/`, `dashboard`, `session-controller`, `check-in-modal`, `tag-bar`
- `pages/`, `dashboard-page.tsx` is the entry point for the lazy loader; sibling files (`history-page.tsx`, `tags-page.tsx`, `settings-page.tsx`) live under their respective `app/(shell)/tools/core-hour/<route>/` folders
- `database/`, `server-actions.ts` (Supabase server actions for sessions, tags, check-ins, entries, settings) and `test-database.ts`
- `types.ts`, `Session`, `Tag`, `CheckIn`, `SessionTag`, `Settings`, plus `Uuid` and `IsoTimestamp`

**Database tables** (all prefixed `ch_`):
- `ch_sessions` (active and historical sessions)
- `ch_tags` (user-owned labels, archiveable)
- `ch_check_ins` (a single check-in event for a session, may be skipped)
- `ch_check_in_entries` (tag rows attached to a check-in with a percentage)
- `ch_settings` (key/value, currently `interval_minutes`)

## Patterns
- Context providers in `hooks/context.tsx` use refs (`activeRef`, `tagsRef`) so callback closures can read fresh state without re-binding
- The `useTimer` hook mirrors the Rust Tauri timer behavior: 1s `setInterval`, ±30s drift is acceptable, auto-pause on `visibilitychange`
- `getDb()` is the only entry point for the in-feature SQL surface; it throws if `setDb()` was not called (test-friendly)
- Server actions in `database/server-actions.ts` are the only path to Supabase; each action revalidates `/tools/core-hour` after write
- Tag percentages on a single check-in should sum to 100; enforce this in the UI, not in the database
- Components use `@memo/ui` primitives (Button, Modal, Card), `components/check-in-modal.tsx` is the canonical example
- Tests live in `__tests__/` next to the source they cover; register a hook test by importing the provider + render from `@testing-library/react`

## Constraints
- Do not introduce a real web-DB implementation (IndexedDB, wa-sqlite) without coordinating; the `getDb()` interface is the contract and the actual backend wires in later
- Do not put Supabase client construction inside a hook; it belongs in `database/server-actions.ts` only
- Do not use absolute timestamps; everything is ISO 8601 (`new Date().toISOString()`)
- Do not skip the `revalidatePath` after a write; pages must refresh
- Do not couple CoreHour to Charger-Reminder; the two features are independent
- Do not change the table prefix (`ch_`) or the field names; migrations assume the current shape
- Do not use the timer hook outside of CoreHour components; it depends on the rest of the feature's state
- Do not call `setDb` from production code; it is for tests and the future web-DB init

## Dependencies
- **External**: `@memo/ui` (Modal, Button, Card, Shell), `@memo/shared` (ToolManifest), `next` (cache, redirect, server actions)
- **Internal**: `src/lib/supabase/server` (server client), `src/lib/tool-registry/registry` (`registerTool`), `src/lib/auth/session` (when called from server actions that need the user id)
- **Schema**: `supabase/migrations/003_ch_core_hour.sql` (tables + RLS)
- **Hooks consumers**: `components/dashboard.tsx`, `components/session-controller.tsx`, `components/check-in-modal.tsx`, `components/tag-bar.tsx`
- **Test deps**: Vitest, Testing Library, fake-indexeddb or `pg-mem` (depending on whether the test is hook-level or schema-level)
