# Pause & Hydrate MVP

## Objective

Provide a local, low-friction reminder loop for taking breaks and drinking water without turning CoreHour into a general health tracker.

## Scope

- Register `Pause & Hydrate` as an independent desktop tool at `/tools/pause-hydrate`.
- Support fixed reminder kinds: `break` and `hydration`.
- Each reminder supports enabled state, a 15-240 minute interval, completion, 10-minute postponement, and mute-until-tomorrow.
- Persist reminder state and timestamped completion/postpone/mute events in SQLite.
- Show today's completion counts, next due time, pending prompts, and today's event history.
- Poll while the app is running and send native notifications when a reminder becomes pending.
- Defer a due reminder while a CoreHour session is active; prompt after focus ends if it is still due.
- Support English and Simplified Chinese in both themes.

## Acceptance Criteria

- Both reminders are disabled by default and request notification permission only after the user enables one and saves.
- Work windows minus quiet windows form Effective Work Segments; segment boundaries never trigger reminders.
- If a reminder interval starts before a segment or lands outside a segment, it restarts from the next segment start plus the full interval.
- Changing work, quiet, weekday, calendar, or sync settings recalculates enabled reminders against the new schedule without changing completed history.
- A reminder becomes pending once when due and is not repeatedly notified until the user acts.
- Completing schedules the next interval and increments today's count.
- Postponing schedules the next reminder exactly 10 minutes later.
- Muting schedules the next reminder for one interval after the next local midnight.
- A disabled reminder has no next due or pending state.
- CoreHour focus deferral does not modify either tool's authoritative state.

## Non-Goals

- Pets, skins, animated overlays, sounds, streaks, trends, or health scoring.
- Distraction detection, foreground-window capture, or accessibility permissions.
- Custom reminder kinds, medication reminders, cloud accounts, or team policy.
- A second focus timer or automatic control of CoreHour.
