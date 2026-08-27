# CoreHour Plan vs Actual

## Objective

Let users plan focused time, compare intention with actual sessions, and explicitly convert a plan into a confirmed record without weakening CoreHour's trusted analytics.

## Scope

- Persist Planned Blocks separately from Actual Sessions.
- Support planned, completed, and skipped plan states with an optional linked session.
- Create and edit same-day plans with a title, optional tag, start, and end time.
- Show plans and actual sessions together in the Day Timeline with distinct semantic colors and a text legend.
- Add a Monday-to-Sunday Week view with previous/current/next navigation.
- Allow a planned block to be skipped or explicitly converted into an Actual Session.
- Perform Plan Conversion inside the existing session transaction so overlap rejection leaves the plan unchanged.
- Keep plans out of Today totals, Insights, check-ins, and exports of actual time.
- Support English and Simplified Chinese in every active palette and mode.

## Acceptance Criteria

- A plan must end after it starts and remain within one local calendar day.
- Plans may overlap plans or sessions; the UI never mutates adjacent records automatically.
- Planned blocks use informational blue/cyan treatment; actual sessions use tag color or success treatment.
- Completed plans remain visible as intent, linked to the actual session; skipped plans are visible in review but visually subdued.
- Blank Day or Week timeline space creates a 30-minute plan snapped to 15-minute increments.
- Clicking an editable plan opens its editor; clicking an actual session opens the existing SessionEditor.
- Converting a plan pre-fills the session editor with the plan's title, tag, and scheduled time.
- Week view remains readable at desktop width and horizontally scrollable on narrow windows.

## Non-Goals

- External calendar sync, recurrence, all-day plans, tasks, subtasks, or reminders.
- Automatic plan completion or automatic timer start.
- Drag/resize in this first data-semantics slice; it follows after week/day behavior is verified.
- Plans in Insights totals or productivity scoring.
