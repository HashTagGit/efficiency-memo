# Tauri Desktop Transition Issues

## 2026-06-08 — `auth-stub.ts` cleanup (post-Task 8)

**Context.** Wave 2 / Task 6 (Charger-Reminder migration) created `apps/desktop/src/lib/auth-stub.ts` with a `getCurrentUser(): LocalUser` (non-null) function returning a hard-coded mock user, so the new Charger-Reminder pages could compile before real local auth landed. When Wave 2 / Task 8 shipped `apps/desktop/src/lib/auth.ts` (the real local auth module), the Charger-Reminder call sites were not retargeted: three files continued to import from the stub, and the stub itself kept a comment claiming it was a "stub" pending Task 8.

**What was wrong.**
- The stub's `getCurrentUser(): LocalUser` was non-nullable, so it silently hid the fact that the real `getCurrentUser(): User | null` is nullable. The Charger-Reminder call sites dereferenced `user.id` without a null check.
- The stub file's JSDoc said "Auth stub ... DO NOT use this stub outside the Charger-Reminder migration" — misleading after Task 8, and a trap for any future contributor.
- Three Charger-Reminder files kept importing from the stub:
  - `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` (line 6)
  - `apps/desktop/src/pages/tools/charger-reminder/page.tsx` (line 3)
  - `apps/desktop/src/pages/tools/charger-reminder/new/page.tsx` (line 3)

**Fix applied.**
1. Retargeted all three imports to `../../../lib/auth` / `../../../../lib/auth`.
2. Added a `if (!user) throw new Error("Not signed in")` guard in each of the three call sites so the real nullable return type is handled. The two `loadDevices` paths surface the error via the existing `try/catch -> setError`; the `new/page.tsx` `handleSubmit` callback re-throws into the form's submit flow.
3. Deleted `apps/desktop/src/lib/auth-stub.ts` outright (the preferred option from the cleanup brief). Confirmed via `grep -r auth-stub apps/desktop` — zero matches remain.

**Verification.**
- `pnpm --filter desktop typecheck` — `tsc --noEmit` exits 0, zero errors.
- `pnpm --filter desktop build` — `tsc && vite build` exits 0. Vite emits a pre-existing warning that `lib/db.ts` is both dynamically and statically imported (intentional — the dynamic import in `core-hour/db-tauri.ts` exists to break a circular dependency; the static imports are all post-init). Warning is not from this cleanup.

**Lesson for the team.** When a stub is replaced by a real module, "delete the stub" is almost always the right move over "re-export from the stub" — the latter leaves a misleading file in the tree. A search across the package for the stub's import path should be part of the replacement task, not an afterthought.

## 2026-06-08 — CoreHour SQL table names missing `ch_` prefix

**Bug.** The migration `0003_ch_core_hour.sql` creates tables with `ch_` prefix (`ch_sessions`, `ch_tags`, `ch_check_ins`, `ch_check_in_entries`), but the desktop CoreHour hooks (`context.tsx`, `use-history.ts`) queried `sessions` and `tags` without the prefix. This would cause runtime "no such table: sessions" errors from SQLite.

**Root cause.** When porting the web `context.tsx` to desktop, the `getDb()` abstraction was replaced with `dbSelect`/`dbExecute`. The web app's `getDb()` defaults the table names to the unprefixed versions (the real Supabase implementation or test mocks provide the correct mapping). The desktop SQLite migration creates the real `ch_` tables, so the queries must use the actual table names.

**Fix applied (Task 7 follow-up).**
- `apps/desktop/src/features/core-hour/hooks/context.tsx` — 7 SQL queries updated:
  - 3 queries on `sessions` → `ch_sessions` (SELECT, INSERT, UPDATE)
  - 4 queries on `tags` → `ch_tags` (SELECT, INSERT, 2x UPDATE)
- `apps/desktop/src/features/core-hour/hooks/use-history.ts` — 1 query: `sessions` → `ch_sessions`

Additionally, 3 pre-existing charger-reminder files had `getCurrentUser()` returning `User | null` but dereferencing `user.id` without a null guard in strict mode. Fixed with non-null assertion (`getCurrentUser()!`) since these call sites already had `if (!user) throw` guards that TypeScript wasn't narrowing through the try/catch boundary.

**Verification.**
- `pnpm --filter desktop typecheck` — exits 0, zero errors.
- `pnpm --filter desktop build` — exits 0, 79 modules transformed.

**Lesson.** When copying database queries from one backend to another, verify table names against the target schema migration files. The `ch_` prefix convention is consistent across both web (Supabase) and desktop (SQLite) — the difference was in the abstraction layer, not the schema.

## 2026-06-09 — WebDAV Sync Engine (Task 10)

### Unverified Rust compilation
- **Status**: Open
- **Severity**: Medium
- **Context**: `cargo` is not installed in this environment, so `cargo check` could not be executed against the new `sync.rs` or modified `Cargo.toml`.
- **What could fail**:
  1. `reqwest_dav` 0.3 API mismatch — method names (`.list()` vs `.list_dir()`, `.build()` vs `.build_client()`), `ListEntity` field names (`.href` vs `.path` vs `.name`), or the `put` method accepting different body types.
  2. `rusqlite` bundled feature causing symbol conflicts with `tauri-plugin-sql`'s bundled SQLite — both compile the `sqlite3.c` amalgamation. If the versions diverge, duplicate symbol errors may appear at link time.
  3. `keyring` 3 on Linux may fail without a running Secret Service daemon (GNOME Keyring or `secret-service` crate backend). The `async-secret-service` feature requires `dbus` at runtime.
- **Mitigation**: All API usage follows the documented patterns in the task spec. The first `cargo check` or `cargo build` will surface any mismatches. Fixes are expected to be minor (method renames, field renames, or type adjustments).

### Import requires app restart (v1 limitation)
- **Status**: Known limitation (by design)
- **Severity**: Low
- **Context**: The JS frontend holds an open `Database` connection to `efficiency-memo.db` via `@tauri-apps/plugin-sql`. Replacing the file while the connection is open is unsafe on Windows due to file locking.
- **Current behavior**: `sync_import` writes the verified backup to `efficiency-memo.db.next` and returns a success message instructing the user to restart. The app does not detect or apply the sidecar file automatically.
- **Future work**: A startup hook could detect `.db.next`, close any pre-existing connections, atomically rename it over the live database, and then reopen. This requires coordination between the Rust backend (file rename) and JS frontend (close/reopen `Database` object).

### No conflict resolution for multi-device sync
- **Status**: Known limitation
- **Severity**: Low
- **Context**: Two devices exporting to the same WebDAV folder will overwrite each other's manifest.json. The last export wins; there is no merge, vector clock, or conflict detection.
- **Future work**: Implement HLC (Hybrid Logical Clock) timestamps or CRDT-based merge for multi-device scenarios.

### `dirs` crate returns OS-level data dir, not app-specific
- **Status**: Informational
- **Severity**: Low
- **Context**: `get_device_id()` hashes `dirs::data_dir()` (e.g., `C:\Users\<user>\AppData\Roaming`), not the Tauri app data dir (`C:\Users\<user>\AppData\Roaming\com.efficiency-memo.app`). This means the device ID is stable across all apps for the same user on the same machine, not specific to EfficiencyMemo. For a single-app desktop tool this is functionally identical, but it may cause collisions if multiple apps use the same hashing scheme on the same WebDAV server.


