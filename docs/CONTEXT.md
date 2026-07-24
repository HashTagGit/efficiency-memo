# Context

A domain glossary for EfficiencyMemo. Use it as a shared vocabulary when discussing features, architecture, or trade-offs. It complements (not duplicates) the desktop-only decision in `docs/adr/0001-desktop-only-distribution.md`.

## Glossary

- **Desktop Surface** — The Tauri v2 application (`apps/desktop/`); the project's sole deployable surface.
- **CoreHour** — The active product workflow: local session timing, periodic check-ins, tags, and daily history.
- **Deferred Code** — Charger Reminder is retained but disabled; WebDAV sync is outside the current product scope. Neither should change without an explicit product decision.
- **Shared Package** — Cross-cutting code in `packages/shared/` (types and constants) and `packages/ui/` (React + Tailwind components); consumed by the desktop surface.
- **Tool Registry** — The feature-manifest registry that exposes CoreHour and keeps legacy features disabled.
- **Local Auth** — Single-user desktop authentication with no passwords or email verification; account identity is stored in local SQLite and the active session in local storage.
- **SQLite Storage** — Local database accessed via `tauri-plugin-sql`; migrations live in `src-tauri/migrations/`.
- **Archived Surface** — The original `apps/web/` Next.js + Supabase web app, removed in v0.1.0-desktop; available in git history if needed.
