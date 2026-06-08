# Tauri Desktop Transition Decisions

## 2026-06-08 -- Plan Execution Started
- Wave 1: Tasks 1-5 (scaffold, migrations, plugin, DB layer, shared/ui integration)
- Wave 2: Tasks 6-9 (feature migration, local auth, shell)
- Wave 3: Tasks 10-12 (WebDAV sync, sync UI, Windows build)

## 2026-06-08 -- Task 2 Migrations
- SQLite DDL ported directly from `supabase/migrations/001|002|003` into `apps/desktop/src-tauri/migrations/0001|0002|0003` with one canonical type mapping: uuid/timestamptz -> TEXT, numeric -> REAL, boolean/integer -> INTEGER.
- Client (not server) supplies UUIDs and ISO timestamps. Keeps the Rust side free of UUID/timestamp generation helpers and keeps the desktop schema aligned with what the web app already inserts.
- `users` table lives in the CR migration (`0001`) and is reused by the CH migration (`0003`) via shared FK. Single users table, no duplication.
- For seed-style upserts against UNIQUE/PK columns, prefer `INSERT OR REPLACE` over `ON CONFLICT ... DO UPDATE` — fewer moving parts and the original SQL's "always set to this exact row" semantics match.


