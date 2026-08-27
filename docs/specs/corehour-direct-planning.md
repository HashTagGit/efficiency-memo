# CoreHour Direct Planning and Weekly Review

## Objective

Make planned focus blocks fast to adjust and turn the week timeline into a practical plan-versus-actual review without changing the distinction between intention and confirmed time.

## Scope

- Move a planned block vertically in Day and Week timelines.
- Move a planned block to another visible day in Week view.
- Resize a planned block from its start or end edge.
- Snap direct changes to 15-minute increments, keep at least 15 minutes, and keep the result within one local calendar day.
- Allow plans to overlap plans and actual sessions; never mutate neighboring records.
- Keep converted and skipped plans read-only.
- Preserve click-to-edit and provide keyboard move/resize actions.
- Persist once when a pointer or keyboard action completes and reload authoritative plan data.
- Show planned minutes, actual minutes, plan completion rate, and actual-minus-planned variance for the selected week.
- Use the same compact review in current-week Insights.

## Metric Semantics

- Planned minutes include every plan in the selected week, including skipped and future plans.
- Actual minutes include confirmed session time apportioned to each visible local day.
- Completion rate is completed plans divided by completed, skipped, and overdue unresolved plans. Future unresolved plans are excluded from the denominator.
- Variance is actual minutes minus planned minutes and may be positive or negative.

## Acceptance Criteria

- Pointer movement and resize show a snapped preview before persistence.
- A simple click still opens the plan editor and does not save.
- Up/Down moves a focused plan by 15 minutes; in Week view Left/Right moves it one visible day.
- Start/end handles support Up/Down in 15-minute increments.
- Direct manipulation never changes title, tag, status, linked session, or another block.
- A failed write restores the rendered database state and shows a bilingual error.
- Actual sessions cannot be dragged or resized.
- Day and Week remain scrollable and readable in narrow desktop windows.
- Every interaction works across all palettes and light/dark modes without relying on color alone.

## Non-Goals

- Dragging actual sessions, recurring plans, external calendars, auto-scheduling, or automatic plan completion.
- Moving plans outside the visible week in one pointer gesture.
- Mutating adjacent blocks to resolve overlaps.
- Contract tests, broad smoke suites, or hash verification.
