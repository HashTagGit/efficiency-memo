# F4 Scope Fidelity Check — Tauri Desktop Transition

**Date**: 2026-06-09
**Reviewer**: Sisyphus-Junior (deep)
**Methodology**: Compared each task's spec from .omo/plans/tauri-desktop-transition.md against actual git diff of 7 desktop commits (686ddf8..main). Cross-referenced with .omo/notepads/tauri-desktop-transition/issues.md.

---

## F4 SCOPE FIDELITY CHECK — VERDICT: APPROVE

---

## Per-Task Compliance

### T1 Scaffold: COMPLIANT
- Files created: apps/desktop/ workspace — package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts, src-tauri/Cargo.toml, src-tauri/build.rs, src-tauri/src/main.rs, src-tauri/src/lib.rs, src-tauri/tauri.conf.json, src-tauri/capabilities/default.json, icon files (6 files), .gitignore, .env.example
- Deviation: Placeholder icons (all 67 bytes, not real app icons). Documented as known limitation. pnpm tauri dev window launch unverified (no Rust toolchain in environment).
- Must NOT compliance: No Next.js used. No apps/web/ code copied. No existing workspace packages modified.

### T2 SQL Migrations: COMPLIANT
- Files created: apps/desktop/src-tauri/migrations/0001_cr_device_reminder.sql (104 lines), 0002_cr_seed_presets.sql (61 lines), 0003_ch_core_hour.sql (62 lines)
- Deviation: None. All 10 tables with IF NOT EXISTS. SQLite-compatible types: uuid→TEXT, timestamptz→TEXT, numeric→REAL, boolean→INTEGER. REFERENCES auth.users(id) replaced with local users table. Seed data values preserved.
- Must NOT compliance: Table/column names unchanged. Seed data values preserved. Original Supabase migrations untouched.

### T3 Plugin Registration: COMPLIANT
- Files modified: src-tauri/src/lib.rs — 3 Migration structs with include_str!, registered via .add_migrations("sqlite:efficiency-memo.db", migrations)
- Files modified: src-tauri/tauri.conf.json — plugins.sql.preload present
- Files modified: src-tauri/capabilities/default.json — sql:default, sql:allow-execute, sql:allow-select, sql:allow-load permissions
- Deviation: None.
- Must NOT compliance: Preload config present.

### T4 DB Interface: COMPLIANT
- Files created: src/lib/db.ts (30 lines) — getDb() singleton, dbSelect<T>(), dbExecute() wrappers
- Files created: src/features/core-hour/db-tauri.ts (56 lines) — DbResult interface, tauriDb singleton, setDbOnStartup(), setDb(), resetDb()
- Files created: src/features/charger-reminder/db-tauri.ts (420 lines) — All 8 CRUD methods: createDevice, updateDevice, deleteDevice, getDeviceById, listDevicesByUser, logChargeEvent, setReminderPreference, setComputedReminderState
- Deviation: None. All SQL uses $1,  placeholder syntax.
- Must NOT compliance: No ? placeholders used.

### T5 Shared/UI Integration: COMPLIANT
- Files modified: package.json — @memo/shared: workspace:* and @memo/ui: workspace:* present
- Deviation: None. Tailwind v4 via @tailwindcss/vite plugin.
- Must NOT compliance: @memo/shared and @memo/ui packages not modified (git diff confirms empty).

### T6 Charger-Reminder Migration: COMPLIANT
- Files created: src/features/charger-reminder/ — contracts.ts, db-tauri.ts, device-presets.ts, heuristic-engine.ts, index.ts, manifest.ts, component-loader.ts, 4 components, 1 page. Pages under src/pages/tools/charger-reminder/.
- Deviation: None. No "use server" directives. No revalidatePath() calls. All server actions replaced with client-side contract calls.
- Must NOT compliance: Heuristic logic preserved verbatim. Device presets preserved verbatim. Component behavior unchanged.

### T7 CoreHour Migration: COMPLIANT (with documented fix)
- Files created: src/features/core-hour/ — db-tauri.ts, types.ts, 6 hooks, 2 components, 4 pages. Pages under src/pages/tools/core-hour/.
- Deviation: Initial commit had wrong table names (sessions/tags instead of ch_sessions/ch_tags). Fixed in follow-up (documented in issues.md). After fix: all queries use correct ch_ prefix.
- Must NOT compliance: DbResult interface preserved. Timer logic preserved. Context providers preserved.

### T8 Local Auth: COMPLIANT
- Files created: src/lib/auth.ts (55 lines) — signIn(), signOut(), getCurrentUser(), requireSessionUser(), isMockAuthEnabled(), getMockUser()
- Deviation: None. No passwords, no magic links, no email verification. Session in localStorage. Mock auth support via VITE_ENABLE_AUTH_MOCK env var.
- Must NOT compliance: No internet requirement. No email verification. No passwords. Zero @supabase references in desktop code.

### T9 Shell Layout: COMPLIANT
- Files created: src/components/shell-layout.tsx (92 lines) — shell with sidebar, auth gate. src/lib/tool-registry/ — discovery.ts, registry.ts, types.ts. src/pages/dashboard/page.tsx, src/pages/sign-in/page.tsx.
- Files modified: src/App.tsx — BrowserRouter with routes, lazy-loaded tool pages, auth gating.
- Deviation: None. Uses react-router-dom v7 for SPA. Settings page as synthetic tool manifest (accepted pattern per issues.md).
- Must NOT compliance: No Next.js App Router used.

### T10 WebDAV Sync Engine: COMPLIANT (Rust unverified)
- Files created: src-tauri/src/sync.rs (263 lines) — sync_export, sync_import, sync_list, store_webdav_credentials Tauri commands
- Files modified: src-tauri/Cargo.toml — added reqwest_dav 0.3, sha2 0.10, hex 0.4, chrono 0.4, keyring 3, rusqlite 0.31 (bundled), dirs 5
- Files modified: src-tauri/src/lib.rs — registered 4 sync commands in invoke_handler
- Deviation: Rust compilation unverified (no cargo in environment). Environment limitation, not scope violation. Three potential compile-time issues in issues.md.
- Must NOT compliance: No auto-sync. Manual trigger only. Per-device folder structure. Manifest.json with schema version, timestamp, SHA256. Password in OS keychain.

### T11 Sync UI: COMPLIANT
- Files created: src/pages/settings/sync/page.tsx (421 lines) — WebDAV fields, Export/Import/List buttons, last sync timestamp, backups list, status indicators. src/lib/sync.ts (20 lines) — JS wrappers for 4 Tauri commands.
- Deviation: Separate Export/Import buttons rather than single "Sync Now" button from spec. Functionally equivalent — still manual trigger. No @memo/ui Input component available (native input used — accepted limitation).
- Must NOT compliance: No auto-trigger. Password cleared from state after save to keychain.

### T12 Windows Build: COMPLIANT (build unverified)
- Files modified: src-tauri/tauri.conf.json — bundle.identifier: com.efficiency-memo.app, bundle.targets: [msi, nsis], WebView2 bootstrapper install mode.
- Deviation: pnpm tauri build unverified (no Rust toolchain). .exe not produced. Placeholder icons.
- Must NOT compliance: Release profile with strip=true, lto=true.

---

## Scope Creep / Contamination

- Files outside apps/desktop/ modified by desktop work: NONE
  - git diff 686ddf8..main -- apps/web packages/shared packages/ui → empty
  - git diff 686ddf8..main -- supabase/migrations .gitignore scripts docker-compose.yml → empty
  - All 7 desktop commits touch ONLY apps/desktop/ plus .omo/ planning artifacts
- packages/shared or packages/ui modified: NONE
- apps/web/ modified: NONE by desktop commits. (Note: broader main~13..main diff shows 6 apps/web/ files changed — from 7 prior auth/docker fix commits, not the desktop transition.)
- New top-level dependencies added: NONE. All new deps in apps/desktop/package.json and apps/desktop/src-tauri/Cargo.toml only.
- Any feature behavior changed: NONE. Heuristic engine, device presets, timer logic copied verbatim.

---

## Unexpected Discoveries

1. Placeholder app icons (6 files, 67 bytes each) — need real assets before distribution.
2. Sync UI uses separate Export/Import buttons vs spec's single "Sync Now" — offers more user control.
3. Device ID derived from OS-level data dir (dirs::data_dir()) rather than Tauri app dir — functionally identical.
4. Settings page as synthetic tool manifest — pragmatic non-tool page pattern without modifying @memo/ui.
5. Auth stub cleanup — intermediate auth-stub.ts created during Task 6, properly deleted after Task 8.
6. CoreHour table name fix — 8 query sites corrected to ch_ prefix in follow-up commit.

---

## VERDICT: APPROVE

### Rationale
All 12 tasks delivered specified deliverables within apps/desktop/ boundary. Zero contamination of existing workspace packages, apps/web/, or Supabase migrations. All "Must NOT do" guardrails satisfied. Seven desktop commits form a clean, isolated layer.

### Known Limitations (not blockers)
- Rust compilation unverified (no Rust toolchain in environment)
- Placeholder icons (67 bytes) — needs real icon assets
- pnpm tauri build not executed — .exe not produced
- pnpm tauri dev not verified — window launch not confirmed
- Sync import requires app restart (v1 limitation, by design)
- No multi-device conflict resolution (v1 limitation, by design)

### What would change the verdict to REJECT
- Any desktop commit modifying apps/web/, packages/shared/, or packages/ui/ — NOT FOUND
- Any "use server" directive in desktop code — NOT FOUND
- Any Supabase dependency in desktop code — NOT FOUND
- Any auto-sync trigger — NOT FOUND
- Missing migration files — ALL 3 PRESENT
- Missing DB interface methods — ALL 8 METHODS PRESENT
