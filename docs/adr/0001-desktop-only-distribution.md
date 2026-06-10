# ADR 0001: Desktop-Only Distribution

## Status

Accepted

## Context

EfficiencyMemo originally shipped as a Docker-based web app (v0.0.1). Tauri v2 desktop support was added in v0.1.0-desktop. Maintaining both surfaces doubled the burden: two build pipelines, two storage backends (Postgres + SQLite), two auth systems (Supabase + local), and two sets of deployment docs.

## Decision

Remove Docker and web distribution entirely. Ship only Tauri desktop builds (.msi/.dmg/.AppImage). Archive the apps/web/ source code. Delete all Docker and Supabase-dependent infrastructure.

## Rationale

Desktop is local-first and offline-capable, which fits personal productivity tools better. A single surface simplifies CI, documentation, and onboarding. Users who need the web app can retrieve it from git history.

## Trade-offs

- **Lost**: Web accessibility from any browser; Supabase multi-user auth.
- **Gained**: Simpler maintenance; no Docker dependency; unified local storage.

## Consequences

Documentation has been rewritten for desktop-only workflows. CI now builds Tauri installers. The web app remains available in git history if future needs arise.
