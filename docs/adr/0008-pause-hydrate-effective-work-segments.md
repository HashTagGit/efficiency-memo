# Treat effective work segments as the reminder clock

## Status

Accepted

## Context

Pause & Hydrate can have multiple work windows and multiple quiet windows on the same weekday. A reminder must not fire at a work-window boundary, at a quiet-window boundary, or during a quiet interval. Treating the whole work window as continuous caused a reminder calculated before a quiet period to fire immediately after the quiet period, and treating the save time as the clock caused a 09:30 work start with a 60-minute interval to appear as 09:31.

## Decision

For each weekday, subtract quiet windows from work windows to produce continuous Effective Work Segments. Segment starts and ends are Reminder Schedule Boundaries and never fire. The reminder clock starts at the current segment start, or at the next segment start when the current time is outside an effective segment. An interval that lands outside the current segment restarts from the next segment start and must accumulate the full interval there. Workday calendars and weekday activation decide whether a segment exists; they do not turn a boundary into an event.

Changing schedule policy recalculates enabled reminders against the new segments while preserving completed events and pending action ownership. Reminder actions still identify and update only their own reminder kind.

At a new local calendar day, discard the previous day's pending prompts and reminder-clock progress. Each enabled reminder starts with the first eligible effective segment plus its own full interval. A configured 09:31 start with a 45-minute interval legitimately produces 10:16; this does not indicate overnight accumulation. Completed events remain unchanged. An interval may never span a quiet gap merely because its final timestamp lands inside a later segment.

## Consequences

The frontend and Rust scheduler must share the same segment-boundary semantics. A reminder may move to a later segment or day when no full interval remains, which is intentional and avoids prompts at transitions. Regression tests cover multiple work windows, quiet-window subtraction, segment boundaries, schedule changes, and action isolation.
