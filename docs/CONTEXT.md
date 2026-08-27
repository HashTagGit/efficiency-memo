# Context

A domain glossary for EfficiencyMemo. Use it as a shared vocabulary when discussing features, architecture, or trade-offs. It complements (not duplicates) the desktop-only decision in `docs/adr/0001-desktop-only-distribution.md`.

## Glossary

- **Desktop Surface** — The Tauri v2 application (`apps/desktop/`); the project's sole deployable surface.
- **CoreHour** — The active product workflow: local session timing, periodic check-ins, tags, and daily history.
- **Deferred Code** — Charger Reminder is retained but disabled; WebDAV sync is outside the current product scope. Neither should change without an explicit product decision.
- **Shared Package** — Cross-cutting code in `packages/shared/` (types and constants) and `packages/ui/` (React + Tailwind components); consumed by the desktop surface.
- **Tool Registry** — The feature-manifest registry that exposes CoreHour and keeps legacy features disabled.
- **Local Profile** — The single SQLite user selected or created automatically at startup; there is no sign-in step.
- **SQLite Storage** — Local database accessed via `tauri-plugin-sql`; migrations live in `src-tauri/migrations/`.
- **Archived Surface** — The original `apps/web/` Next.js + Supabase web app, removed in v0.1.0-desktop; available in git history if needed.

## Pause & Hydrate

**Pause & Hydrate**:
The independent local tool for periodic break and hydration reminders.
_Avoid_: Wellbeing, health tracker

**Reminder**:
A configured break or hydration prompt with its own interval and next due time.
_Avoid_: Alarm, timer

**Reminder Event**:
A timestamped record that a reminder was completed, postponed, or muted for the day.
_Avoid_: Health score, counter

**Focus Deferral**:
The rule that a due reminder waits while CoreHour has an active session, without changing that session.
_Avoid_: Focus timer, automatic pause

## CoreHour planning

**Planned Block**:
A user-declared intention to focus during a specific local time range; it is not tracked time.
_Avoid_: Session, calendar event

**Actual Session**:
A confirmed record of focused time that contributes to CoreHour history and Insights.
_Avoid_: Plan, estimate

**Plan Conversion**:
An explicit action that creates an Actual Session from a Planned Block and links the two records.
_Avoid_: Auto-complete, scheduled timer

**Skipped Plan**:
A Planned Block the user intentionally did not execute; it remains part of plan-versus-actual review.
_Avoid_: Deleted plan, failed session

**Uncertain Interval**:
A detected span during an active session whose inclusion is ambiguous because timer scheduling stopped or the device received no user input.
_Avoid_: Confirmed time, activity log

**Included Time**:
The portion of an Uncertain Interval the user explicitly keeps in elapsed focus after review.
_Avoid_: Automatic idle estimate

## Data control

**Portable Backup**:
A single local `.ememo` SQLite snapshot containing all database-backed records plus stable language and appearance preferences.
_Avoid_: Cloud sync, human export

**Backup Preview**:
The validated package metadata and record counts shown before a Portable Backup can replace local data.
_Avoid_: Import log, checksum

**Human Export**:
A readable, module-scoped JSON document for inspection or analysis; it is not a restorable application package.
_Avoid_: Portable Backup

**Module Reset**:
A transactional deletion of one tool's user-owned records while preserving the local profile and other tools.
_Avoid_: Sign out, uninstall
