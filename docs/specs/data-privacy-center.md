# Data & Privacy Center

## Objective

Give a local user one understandable place to inspect, export, restore, and delete EfficiencyMemo data without an account or WebDAV.

## Scope

- Show current record counts for CoreHour and Pause & Hydrate.
- Create a versioned, single-file `.ememo` portable backup using a clean SQLite snapshot.
- Include the database, locale, theme mode, and palette; exclude OS-keychain secrets, WebDAV connection state, and active-session progress.
- Reject backup, restore, and destructive reset while a CoreHour session is active.
- Preview creation time, package/schema versions, preferences, and module record counts before scheduling restore.
- Validate SQLite integrity and required schema without hash verification.
- Stage restore for the next native startup; preserve the current database if replacement fails.
- Export complete, human-readable module JSON for CoreHour and Pause & Hydrate.
- Reset CoreHour, Pause & Hydrate, or the whole local application with explicit confirmation.
- Require typed `RESET` confirmation for whole-application reset and offer backup first.
- Support English and Simplified Chinese in every appearance palette and mode.

## Acceptance Criteria

- A portable backup is created only from a database with no open CoreHour session.
- A failed snapshot, preview, staging, integrity check, or startup replacement leaves the current dataset usable.
- A future-schema backup is rejected before staging.
- Successful restore applies its stable preferences only after the native database replacement succeeds.
- CoreHour reset removes plans, sessions, check-ins, tags, and CoreHour settings without changing Pause & Hydrate data.
- Pause & Hydrate reset removes schedules and events without changing CoreHour data.
- Whole reset removes user-owned database records and known local preferences; seeded device presets remain application data.
- Human exports clearly state that they cannot be restored.
- No operation uploads data or reads/writes keychain credentials.

## Non-Goals

- Cloud backup, WebDAV changes, encrypted archives, scheduled backups, or version history.
- Merging two databases or importing arbitrary CSV/JSON.
- Exporting a running session, raw future activity collection, or application logs.
- Contract tests, broad smoke suites, or hash verification.
