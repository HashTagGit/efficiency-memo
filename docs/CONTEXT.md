# Context

A domain glossary for EfficiencyMemo. Use it as a shared vocabulary when discussing features, architecture, or trade-offs. It complements (not duplicates) the desktop-only decision in `docs/adr/0001-desktop-only-distribution.md`.

## Glossary

- **Desktop Surface** — The Tauri v2 application (`apps/desktop/`); the project's sole deployable surface.
- **Tool** — A self-contained productivity feature (e.g., Charger-Reminder, CoreHour); each lives in `apps/desktop/src/features/<id>/`.
- **Feature Copy** — An independent copy of a tool's UI and logic in `apps/desktop/src/features/`; not a symlink, intentionally duplicated to avoid coupling.
- **Shared Package** — Cross-cutting code in `packages/shared/` (types and constants) and `packages/ui/` (React + Tailwind components); consumed by the desktop surface.
- **Tool Registry** — The pattern where each feature self-registers via `manifest.ts` + `component-loader.ts` + `index.ts`; discovered at build time.
- **WebDAV Sync** — Manual backup/restore to a WebDAV-compatible server; Strategy A is per-device folders with last-write-wins.
- **Local Auth** — Single-user desktop authentication with no passwords and no email verification; credentials stored in the OS keychain.
- **SQLite Storage** — Local database accessed via `tauri-plugin-sql`; migrations live in `src-tauri/migrations/`.
- **Archived Surface** — The original `apps/web/` Next.js + Supabase web app, removed in v0.1.0-desktop; available in git history if needed.
