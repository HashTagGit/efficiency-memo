# features/charger-reminder

## Purpose
Charger-Reminder tracks user-owned battery-powered devices and tells each device when to charge. The feature owns its database contract, the deterministic reminder heuristic, and the UI for listing, creating, editing, and inspecting devices. It registers itself into the tool gallery on import so the sidebar picks it up without any manual wiring.

## Context
Feature folder: `apps/web/src/features/charger-reminder/`. It is auto-discovered by `src/lib/tool-registry/discovery.ts` and self-registers via `index.ts` -> `manifest.ts` + `component-loader.ts`. The manifest route is `/tools/charger-reminder`, rendered through the catch-all under `src/app/(shell)/tools/[toolId]/page.tsx`.

**Sub-folders**:
- `auth/`, `mock.ts` and `mock-bypass.ts` for the dev/test auth shim; the cookie name `efficiency-memo-mock-auth` is shared with `lib/auth/session.ts` and the auth callback
- `database/`, `contracts.ts` (types), `device-presets.ts` (5 seeded presets), `devices.ts` (Supabase server actions), `test-database.ts` (E2E mock)
- `reminders/`, `heuristic-engine.ts` (deterministic drain math, version `deterministic-v1`)
- `components/`, `device-card`, `device-detail`, `device-form`, `device-list`
- `pages/`, `device-list-page.tsx` (lazy-loaded by `component-loader.ts`)
- `__tests__/`, registration test, heuristic engine test, schema integration test

**Database tables** (all prefixed `cr_`):
- `cr_device_presets` (5 seeded rows: wireless-mouse, game-controller, wireless-keyboard, bluetooth-headphones, power-bank)
- `cr_devices` (per-user, FK to `auth.users`)
- `cr_charge_events` (append-only history)
- `cr_reminder_preferences` (1:1 with device, lead time in days)
- `cr_computed_reminder_states` (1:1 cached heuristic output)

## Patterns
- All public DB functions live in `database/devices.ts` and start with `"use server"`; they are the only path to Supabase for this feature
- The contract interface is `DevicePersistenceContract` in `database/contracts.ts`; mirror its shape when adding new operations
- Heuristic output is a literal `DeterministicReminderState` with status `needs-charge-log | tracking | remind | charge-now`
- `computeDeterministicReminderState` is pure and side-effect-free; call it from a server action, not from React render
- The mock DB path activates when `E2E_MOCK_DB=true` or when the Supabase URL contains `localhost`; use it for E2E and for offline dev
- Components use `@memo/ui` for buttons/cards/modals; do not reimplement these primitives
- Validation timestamps with `validateChargeEventTimestamp` before inserting into `cr_charge_events`
- After any write, call `revalidatePath` for `/tools/charger-reminder` and the per-device route

## Constraints
- Do not add a non-deterministic heuristic; the engine is versioned (`REMINDER_HEURISTIC_VERSION = 'deterministic-v1'`) and must stay reproducible
- Do not bypass `requireSessionUser` in the real DB path; the mock path is the only exception
- Do not allow future-dated `charged_at`; `validateChargeEventTimestamp` throws on it
- Do not hard-code thresholds; pull defaults from `cr_device_presets` or `getDefaultThresholdForPreset`
- Do not store computed reminder state without `heuristic_version`; the field is required and is how the engine self-checks
- Do not insert directly into `cr_devices`; always go through `createDevice` / `updateDevice` so reminder state gets recomputed
- Do not change the cookie name or the mock toggle names; the rest of the app reads them
- Do not import from other features (`core-hour`); keep boundaries clean

## Dependencies
- **External**: `@supabase/ssr`, `@supabase/supabase-js`, `@memo/ui` (Card, etc.), `@memo/shared` (ToolManifest)
- **Internal**: `src/lib/supabase/server` (server client), `src/lib/auth/session` (`requireSessionUser`, `SessionUser`), `src/lib/tool-registry/registry` (`registerTool`), `next/cache` (`revalidatePath`)
- **Schema**: `supabase/migrations/001_cr_device_reminder.sql` (tables + RLS) and `002_cr_seed_presets.sql` (presets)
- **Other features**: none; this feature has no inbound or outbound coupling with `core-hour`
- **Test deps**: Vitest, Testing Library, `pg-mem` (for the integration test in `database/__tests__/`)
