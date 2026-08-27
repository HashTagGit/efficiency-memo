# CoreHour Daily Goals and Insights

## Objective

Turn CoreHour's recorded sessions into a small, verifiable feedback loop: set a daily focus target, see progress while working, and review the current week without leaving the local desktop app.

## Scope

- Persist one daily focus goal in the existing local `ch_settings` table.
- Show completed time plus the active session's live elapsed time against that goal on Today.
- Add an Insights route with:
  - current-week total and previous-week comparison;
  - goal attainment for elapsed days in the current week;
  - selectable 7-day and 30-day trends;
  - current-week activity ranking and selected-range tag distribution.
- Move aggregate analytics out of Timeline so Timeline remains the day-level correction surface.
- Support English and Simplified Chinese in light and dark themes.

## Acceptance Criteria

- The goal accepts 15-minute increments from 15 to 720 minutes and defaults to 120 minutes when missing or invalid.
- Today progress includes an active session without double-counting completed sessions.
- Weekly calculations use local calendar weeks starting Monday and do not count future days as missed goals.
- A zero previous-week total is shown without an invalid percentage.
- All data remains local and no new runtime dependency or database migration is introduced.

## Non-Goals

- Idle detection or automatic activity capture.
- Global shortcuts, tray controls, Pomodoro, or reminders.
- Timeline drag, resize, week view, or inferred activity suggestions.
- Cloud accounts, team goals, billing, or productivity scoring.
