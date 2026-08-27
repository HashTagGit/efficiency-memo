# CoreHour Uncertain Time Resolution

## Objective

Prevent sleep, timer throttling, and long user-idle periods from silently changing confirmed focus time.

## Scope

- Detect an all-platform scheduler gap when a running timer tick is delayed by at least 30 seconds.
- Detect at least five minutes of system idle on Windows through the native last-input clock.
- Treat scheduler gaps as initially uncounted and system-idle spans as initially counted.
- Pause CoreHour immediately when one uncertain interval is detected.
- Let the user include all, include a custom number of minutes, or discard the interval.
- Apply the decision by adding or subtracting only the difference between requested and currently counted seconds.
- Resume the timer after resolution and let normal check-in logic evaluate the adjusted elapsed time.
- Persist an unresolved interval with active-session progress across CoreHour navigation and app restart.
- Show the review surface across every CoreHour route with bilingual reason, duration, current accounting, and actions.
- Store no input events, window titles, application names, or content.

## Acceptance Criteria

- A normal one-second tick increments elapsed time once.
- A delayed tick that creates an uncertain scheduler gap does not increment elapsed time.
- Manual pause/resume never creates an uncertain interval.
- System idle never subtracts more than the elapsed session time.
- A second detector cannot replace an unresolved interval.
- Keep, trim, and discard clamp included time to the interval duration and never make elapsed negative.
- Resume and End controls cannot bypass unresolved review.
- An unresolved review returns after app restart for the same active session.
- Ending a resolved session persists the adjusted elapsed total and creates no duplicate check-in.
- Unsupported platforms continue to detect scheduler gaps without failing or requesting permissions.

## Non-Goals

- Window-title, URL, application, keystroke, screenshot, or clipboard collection.
- Automatic categorization, productivity scoring, punitive idle rules, DND detection, or meeting detection.
- Configurable thresholds in this first reliability slice.
- Contract tests, broad smoke suites, or hash verification.
