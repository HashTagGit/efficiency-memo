# CoreHour competitive analysis

Research date: 2026-08-27

## Scope and method

This report studies first-party product documentation, official feature pages, official repositories, and official release notes. It focuses on interaction patterns that fit CoreHour's single-user, desktop, local-first positioning. Marketing claims are treated as descriptions of product intent rather than independent proof of effectiveness.

Products covered:

- Commercial: Toggl Track, Clockify, Rize, Timing.
- Open source: ActivityWatch, Super Productivity.

## Executive recommendation

CoreHour should become a **manual-first focus tracker with assisted review**, not a miniature team timesheet system and not an always-on surveillance product.

The most useful combined loop is:

1. Pick a recent or favorite activity, optionally add a short description and tag.
2. Start with one unmistakable primary action; keep the active session visible from every CoreHour view.
3. Handle interruption explicitly: keep idle time, trim it, resume the previous activity, or record a break.
4. Stop into a small session summary rather than a large form.
5. Review today's blocks on a timeline and correct gaps by direct manipulation.
6. End the week with a compact trend and goal review.

This combines Toggl/Clockify's low-friction timer, Timing/Rize's review-and-correct workflow, ActivityWatch's local privacy model, and Super Productivity's break cadence. It deliberately excludes approvals, billing, employee monitoring, invoicing, team utilization, and AI chat.

## Product comparison

| Product | Core loop | Strongest relevant ideas | Mismatch with CoreHour |
|---|---|---|---|
| Toggl Track | Describe -> categorize -> run/continue -> edit -> report | Timer/manual mode, one-click continue, favorites, calendar blocks, idle choices, global shortcuts, Pomodoro | Workspace, billing, clients, and team reporting add concepts a local personal tracker does not need |
| Clockify | Timer/manual entry -> project/tag -> calendar/report | Familiar timer, favorites, direct calendar editing, simple personal dashboard | Product architecture is centered on workspaces, roles, billing, approvals, and team administration |
| Rize | Passive capture -> automatic category -> focus insight -> goal/break nudge | Automatic capture, daily review, focus metrics, planned sessions, break suggestions, goals | AI classification, cloud account, distraction blocking, and productivity scoring create privacy and complexity costs |
| ActivityWatch | Background capture -> local timeline -> category exploration | Local-only data, app/window timeline, explicit category rules, export/control | Its raw activity UI is an analysis console, not a polished task/session workflow |
| Super Productivity | Plan task -> track/timebox -> focus/break -> review | Task-linked timeboxing, Pomodoro/break reminders, personal metrics, local-first/no account | Full task manager, issue integrations, notes, plugins, and sync surface would overwhelm CoreHour |
| Timing | Passive capture -> review suggestions -> create corrected entries -> report | Colored timeline, gap suggestions, drag selection, explicit entries over raw app activity, learnable rules | macOS-focused passive capture and sophisticated rules are expensive to reproduce cross-platform |

## Findings by product

### Toggl Track

Toggl's Timer page is a command center with two capture modes: a running timer and manual entry. A previous entry can be continued with one click or a keyboard shortcut, and the entry can be enriched before or after tracking. The desktop description field also accepts project/tag shortcuts, reducing navigation while starting work. [Creating a Time Entry](https://support.toggl.com/en-us/article/creating-a-time-entry-wg8nug/), [Toggl Track Desktop App for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/)

Its calendar treats time as manipulable blocks: create in empty space, drag to move, resize to change duration, split, continue, pin, or delete. Calendar events and captured timeline activity can be copied into entries instead of silently becoming authoritative records. [Toggl Track Desktop App for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/)

Favorites are deliberately limited and ordered. They can be started by hover action or number key, and a favorite copies the useful activity context. This is a good model for a compact “Quick start” area rather than an unlimited second tag library. [Favorites](https://support.toggl.com/en-us/article/favorites-lmebfy/)

Toggl's idle notification is especially relevant: it presents four consequences rather than guessing what happened. Users can keep idle time, discard and stop, discard and resume, or turn idle time into its own entry. It also provides global show/hide and continue/stop shortcuts plus desktop shortcuts for start/continue/stop. [Toggl Track Desktop App for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/)

**Worth borrowing:** explicit timer/manual modes, one-click continue, a small ordered favorites set, direct timeline editing, and explicit idle resolution.

**Do not borrow:** clients, billable status, workspace policy, public favorites, or web-report handoffs.

### Clockify

Clockify validates the same basic capture model: one-click timer, resume a past timer, categorize by project/task/tag, manually add forgotten time, mark common entries as favorites, and optionally use breaks or Pomodoro. [Timer features](https://clockify.me/features/timer)

Its calendar uses a familiar direct-manipulation model. Time blocks can be moved, resized, and split. External calendar events remain read-only until the user explicitly starts a timer or copies the event into a tracked entry. [Calendar](https://clockify.me/help/track-time-and-expenses/calendar-view)

The personal dashboard answers one question at a glance: where did my tracked time go? It uses a top-level dimension switch and a ranked activity list, while the broader report suite adds detail, grouping, exports, and scheduled delivery. [Dashboard](https://clockify.me/help/reports/dashboard), [Reports](https://clockify.me/features/reports)

**Worth borrowing:** a restrained personal dashboard, direct calendar manipulation, favorites, and a clear distinction between external/planned events and actual tracked entries.

**Do not borrow:** approvals, time off, costs, invoices, team dashboards, required-field policy, and administrative hierarchy.

### Rize

Rize reframes time tracking around focus quality. Its product surface combines automatic capture with a dedicated session timer, planned sessions, focus metrics, break suggestions, and distraction blocking. Daily and weekly reports expose focus time, distraction frequency, application/website use, and trends. [Rize Productivity](https://www.rize.io/features/productivity)

Categorization is presented as an improvable system: explicit rules match apps, URLs, and window titles; unmatched activity is categorized later; users can override a single period or persist a correction as a rule. Rize itself recommends daily review so repeated corrections improve future classification. [Categories and Tracking Rules](https://www.rize.io/guides/categories-and-rules)

Goals are available for focus time, break time, work hours, and categories, with hit/miss notifications. This is more actionable than an abstract productivity score because the user controls the target and can understand the measurement. [Launching Rize Goals](https://rize.io/changelog/launching-rize-goals)

**Worth borrowing:** planned focus sessions, user-defined goals, day review, and corrections that can become rules.

**Do not borrow now:** AI scoring, chat/reports, cloud-dependent categorization, website blocking, focus music, billing, and team analytics.

### ActivityWatch

ActivityWatch demonstrates the strongest privacy boundary: app and website activity is captured automatically, stored locally, and not transmitted to the project's servers. It supports local export, deletion, and backup. [ActivityWatch](https://activitywatch.net/), [Privacy Policy](https://docs.activitywatch.net/en/latest/privacy.html)

Its activity view emphasizes a timeline, top applications/sites, and rule-based hierarchical categories. Categories can have children, colors, and regular-expression rules over app/window title data. [User Interface](https://docs.activitywatch.net/en/latest/features/user-interface.html), [Categorization](https://docs.activitywatch.net/en/latest/features/categorization.html)

The official documentation explicitly says highly configurable visualization is not a core priority. That makes ActivityWatch a strong architectural reference for local capture and a weak direct UI template for CoreHour. [User Interface](https://docs.activitywatch.net/en/latest/features/user-interface.html)

**Worth borrowing:** local-only capture, pause/export/delete controls, colored hierarchical categorization, and separation between raw activity and interpreted categories.

**Do not borrow directly:** an event/bucket-oriented analysis UI or an always-running watcher without clear onboarding and pause state.

### Super Productivity

Super Productivity links tasks, timeboxing, time tracking, break reminders, Pomodoro, and personal metrics. It also emphasizes that no account is required and users choose where data is stored. [Super Productivity README](https://github.com/super-productivity/super-productivity)

Its breadth is also a warning. Projects, subtasks, issue-provider integrations, notes, file attachments, plugins, calendar integration, and multiple sync providers make it a task manager with time tracking, not a focused time tracker. The project's own user feedback shows the interaction risk of separating focus/Pomodoro state from task tracking: users report confusion when one timer continues after the other stops. [Pomodoro integration feedback](https://github.com/super-productivity/super-productivity/issues/5737), [Focus mode and time tracking sync issue](https://github.com/super-productivity/super-productivity/issues/7502)

**Worth borrowing:** optional focus cadence attached to the active activity, break reminders, and personal routine metrics.

**Do not borrow:** task-management breadth, third-party issue integrations, plugin infrastructure, or two independently controlled timers.

### Timing

Timing offers the clearest passive-to-explicit review pattern. It highlights automatically detected work blocks as colored suggestions; users can click a suggestion to edit it, modifier-click to accept it quickly, or drag a range on the timeline to create an entry. Explicit time entries state the user's intent and sit above raw app activity. [Time Entries](https://timingapp.com/help/time-entries)

Its rules automate repeated categorization but preserve manual corrections. Rules apply to new activity, can be reordered when they overlap, and can be reapplied intentionally to visible historical activity. [Rules In-Depth](https://timingapp.com/help/rules)

**Worth borrowing:** suggested blocks that require confirmation, drag-to-create, and “make this correction a future rule.”

**Do not borrow now:** a full rules editor, billing reports, or platform-specific deep app/document capture.

## Mature UI and interaction patterns

These recommendations are derived from the first-party product behavior above.

### Information architecture

Use workflow-level destinations instead of technical entities:

```text
Today       Start, active session, quick starts, today's entries
Timeline    Day/week review and corrections
Insights    Goals, trends, weekly review
Library     Tags and favorite activities
Settings    Appearance, language, reminders, data and privacy
```

Keep Settings visually separated at the bottom of the sidebar. Do not expose database concepts, sync internals, or analytics subtypes in primary navigation.

### Today and timer

- Make `Start`/`Stop` the only filled primary button in the main work area.
- Let the user type a description first, then optionally choose a tag or favorite. Empty-description start should remain valid.
- Show favorites and recent activities as compact rows with a play icon; do not turn each one into a decorative card.
- Keep the active activity, elapsed time, pause/stop, and current tag visible in a stable header or mini-player when moving between CoreHour views.
- Use a segmented control for `Timer` and `Manual`, as these are mutually exclusive modes rather than navigation destinations.
- After stopping, use a small summary sheet/dialog with duration, description, tag, and optional reflection. Preserve the fast path: one action accepts the current values.

### Timeline and review

- Use a vertical day scale with colored blocks, current-time line, and clear empty gaps.
- Click an empty span to add; drag a block to move; resize edges to change duration; open an overflow menu for split/delete.
- Display automatically inferred activity as visually distinct suggestions until accepted. Never mix inferred activity and confirmed sessions without a legend.
- Resolve overlaps at edit time with a clear choice; silently changing adjacent entries damages trust.
- Provide `Today` as the default date and keep date navigation adjacent to the timeline, not in a distant filter panel.

### Insights and goals

- Lead with today's focused time versus a user-set target, then weekly trend, tag distribution, and longest focus block.
- Prefer absolute measures the user can verify. Avoid a proprietary “productivity score” until its calculation and value are demonstrable.
- Use charts only for comparisons over time; keep exact values accessible in labels/tooltips and a small supporting list.
- Weekly review should answer: total focus time, change from previous week, top activities/tags, target attainment, and missing/unclassified time.

### Visual system

More color should mean more semantics, not more decoration:

- Amber: active focus and primary timer action.
- Green: completed target or confirmed session.
- Coral: interruption, conflict, or destructive stop/delete state.
- Cyan/blue: informational timeline markers and planned/suggested blocks.
- Tag colors: user-owned categorization; ensure labels retain accessible contrast in both themes.
- Neutral surfaces: page hierarchy and dense review areas. Avoid coloring every container.

Use one consistent 4/8 px spacing rhythm, restrained radii, icon-first utility actions with tooltips, and fixed control dimensions so timer and timeline state changes do not shift layout.

## Recommended roadmap

### P0: complete the daily capture loop

1. **Today workspace**
   - Description field, optional tag, start/stop, and persistent active-session summary.
   - Today's confirmed sessions directly below, grouped chronologically.
   - One filled primary action; secondary actions use icons or quiet buttons.

2. **Recent and favorite activities**
   - Continue the latest session with one action.
   - Pin a small ordered list of favorites; a favorite stores description plus optional tag.
   - Reuse existing session/tag data rather than introducing projects or task entities.

3. **Fast manual correction**
   - Add/edit a session using native date/time inputs.
   - Validate end after start and surface overlap before save.
   - Keep delete/split in an overflow menu, not beside Start.

4. **Session-end summary**
   - Reuse the existing check-in flow, but make duration, activity, tag, and confirmation the first visual layer.
   - Reflection remains optional and progressively disclosed.

P0 is the commercial-quality foundation: the user can start, recover from forgetting, correct a record, and understand today without visiting separate technical pages.

### P1: review, goals, and desktop ergonomics

1. **Day timeline** with click/drag creation, resize/move, edit, and visible overlap handling.
2. **Daily focus goal** and a compact weekly review with previous-week comparison and tag/activity breakdown.
3. **Idle resolution** with keep, trim-and-stop, trim-and-resume, and record-break choices.
4. **Global shortcuts and tray mini-controls** for show/hide, continue latest, pause/resume, and stop.
5. **Optional focus cadence** attached to the same active session state; Pomodoro/Flowtime must not run as a second independent timer.
6. **Reminder controls** with schedule, quiet hours, and a clear disabled state.

P1 adds OS integration and more complex time editing, so it should follow stable P0 session semantics.

### P2: assisted automatic capture

1. **Local application activity watcher**, opt-in and paused visibly from the shell/tray.
2. **Suggested timeline blocks** that remain unconfirmed until the user accepts or edits them.
3. **Simple category rules** generated from a correction; defer a general regex/rule builder.
4. **Read-only calendar import**, initially via local/ICS data where practical; copy planned events into confirmed sessions explicitly.
5. **Privacy controls** for exclusions, retention, export, and deletion before any automated capture ships.

P2 should not start until CoreHour can clearly distinguish raw activity, inferred suggestions, and confirmed sessions in its data model and UI.

## Features that do not fit the current product

- Team workspaces, roles, approvals, timesheet locking, attendance, and utilization.
- Billing rates, invoicing, expenses, profitability, and client portals.
- Screenshot or keystroke surveillance.
- A general task manager with subtasks, boards, issue-provider integrations, notes, and attachments.
- Cloud-required accounts or cloud-only AI classification.
- Chat/agent/report automation before the core daily review is useful without it.
- Gamification layers that reward long hours rather than a user-defined healthy target.

## Implementation risks

| Risk | Why it matters | Minimum mitigation |
|---|---|---|
| Session overlap and midnight boundaries | Manual/timeline edits can corrupt totals or create ambiguous reports | Define overlap behavior and local-date boundaries before drag editing; never mutate adjacent sessions silently |
| Idle detection | OS APIs and suspend/resume behavior differ; an incorrect trim loses trusted time | Make detection advisory, preserve the original interval until the user chooses, and test sleep/wake separately per OS |
| Global shortcuts/tray | Key conflicts and background lifecycle differ by platform | Ship a small configurable shortcut set with conflict feedback; keep all actions routed through the existing timer state |
| Automatic app/window capture | Window titles may contain documents, URLs, clients, or secrets | Explicit opt-in, visible pause, local-only storage, exclusions, retention controls, and no telemetry |
| Automatic categorization | Wrong labels can make reports less trustworthy than manual data | Suggestions remain unconfirmed; corrections are reversible and only become rules with consent |
| Calendar integration | OAuth, recurrence, time zones, and network dependency conflict with the local-first scope | Start read-only, preserve source identity, never edit the source event, and prefer a simpler local/ICS path first |
| Pomodoro/Flowtime | Separate timer states drift and create contradictory controls | One session state owns elapsed time; focus cadence only schedules prompts and breaks around it |
| Goals and streaks | Poor defaults can reward overwork or shame missed days | User-defined targets, rest days, neutral language, and easy disable/reset |
| Rich color system | Too many colors reduce scanability and dark-theme contrast | Reserve colors for state/category semantics and verify contrast in both themes |

## Decision summary

The next implementation slice should be P0 `Today workspace + recent/favorite activities`, using the existing CoreHour session and tag model. It improves the most repeated action without new system permissions, cloud services, task-management entities, or automatic data collection.

Timeline editing is the next major differentiator, but only after start/stop/manual-edit semantics are stable. Idle detection, tray/global shortcuts, and Pomodoro belong together in a later desktop ergonomics slice because they all depend on one authoritative active-session state.

## Primary sources

- Toggl Track: [Creating a Time Entry](https://support.toggl.com/en-us/article/creating-a-time-entry-wg8nug/), [Desktop App for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/), [Favorites](https://support.toggl.com/en-us/article/favorites-lmebfy/), [Pomodoro](https://support.toggl.com/en-us/article/how-to-enable-the-pomodoro-timer-1ra91f7/)
- Clockify: [Timer](https://clockify.me/features/timer), [Calendar](https://clockify.me/help/track-time-and-expenses/calendar-view), [Dashboard](https://clockify.me/help/reports/dashboard), [Reports](https://clockify.me/features/reports)
- Rize: [Productivity Features](https://www.rize.io/features/productivity), [Categories and Tracking Rules](https://www.rize.io/guides/categories-and-rules), [Goals release](https://rize.io/changelog/launching-rize-goals), [AI Reports](https://www.rize.io/guides/ai-reports)
- ActivityWatch: [Official site](https://activitywatch.net/), [Privacy Policy](https://docs.activitywatch.net/en/latest/privacy.html), [User Interface](https://docs.activitywatch.net/en/latest/features/user-interface.html), [Categorization](https://docs.activitywatch.net/en/latest/features/categorization.html)
- Super Productivity: [Official repository/README](https://github.com/super-productivity/super-productivity), [Sync configuration](https://github.com/super-productivity/super-productivity/blob/master/docs/wiki/1.02-Configure-Data-Synchronization.md), [Pomodoro integration feedback](https://github.com/super-productivity/super-productivity/issues/5737)
- Timing: [Time Entries](https://timingapp.com/help/time-entries), [Rules](https://timingapp.com/help/rules), [Reports](https://timingapp.com/help/reports)
