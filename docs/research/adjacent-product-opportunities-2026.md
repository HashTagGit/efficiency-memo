# EfficiencyMemo adjacent product opportunities, 2026

Research date: 2026-08-28

## Executive decision

EfficiencyMemo should become a **local-first personal work-rhythm desktop suite**, not a smaller clone of a team time tracker or calendar SaaS.

The strongest adjacent opportunities are:

1. **CoreHour Plan vs Actual**: add planned focus blocks, week capacity, and a short weekly review while keeping plans separate from confirmed sessions.
2. **Desktop Companion**: make current focus and upcoming reminders controllable from the system tray and two global shortcuts.
3. **Pause & Hydrate interruption policy**: add working hours, quiet hours, natural-break recognition, and staged DND-aware deferral.
4. **Data & Privacy Center**: make full local export, restore, module reset, and collection controls understandable from one place.
5. **Local Activity Assist, later and opt-in**: collect the minimum possible foreground-app signal, turn it into unconfirmed suggestions, and require explicit acceptance before it affects CoreHour.

These are not five new tools. Plan vs Actual deepens CoreHour; interruption policy deepens Pause & Hydrate; tray, privacy, and data management are shared platform capabilities. A separate Day Plan tool should be created only if users need task planning without time tracking. General task management, AI auto-scheduling, employee monitoring, screenshots, and team billing should be rejected.

## Current product baseline

The repository already contains a coherent foundation:

- **CoreHour** supports manual-first sessions, pause/resume, periodic check-ins, manual correction, a daily timeline, tags, goals, weekly comparison, and Insights.
- **Pause & Hydrate** supports separate break and hydration intervals, complete/postpone/mute actions, CoreHour deferral, native notifications, and timestamped events.
- **Shared desktop shell** provides bilingual UI, local profiles, SQLite persistence, and three curated palettes (`Ember`, `Grove`, and `Tide`) with independent System/Light/Dark modes.
- **Backup code** can snapshot the whole SQLite database to WebDAV, but WebDAV is explicitly outside the current product surface. CoreHour also has a module-specific CSV export.

The product gaps are therefore not “add another timer” or “add more charts.” They are:

- no representation of intention before a session starts;
- no week surface where planned capacity and actual focus can be compared;
- no quick desktop control while the main window is closed or obscured;
- reminder timing understands CoreHour but not working hours, natural idle, or system DND;
- export, backup, preferences, and destructive reset are fragmented or absent;
- no privacy contract for any future automatic activity signal;
- color distinguishes themes and generic statuses, but not yet the roles of focus, recovery, hydration, plans, confirmed records, and suggestions.

## Evidence by opportunity

### 1. Plan vs Actual and week timeboxing

#### What mature products demonstrate

- Sunsama keeps **planned time** and **actual time** separate. Planned time contributes to daily workload; actual time comes from a timer or manual entry. It exposes an actual-versus-planned total and warns when planned work approaches or exceeds a configured workload threshold. [Sunsama: Planned and Actual Times](https://help.sunsama.com/docs/usage-guides/tasks/planned-and-actual-times/)
- Sunsama's daily planning ritual reviews yesterday, builds today's list, checks predicted workload, and then optionally timeboxes work. Its weekly review examines objective progress, time allocation, and a short reflection. The useful product shape is the bounded ritual, not the attached team sharing. [Sunsama: Daily Planning](https://help.sunsama.com/docs/usage-guides/daily-planning/) [Sunsama: Weekly Review](https://help.sunsama.com/docs/usage-guides/weekly-objectives/weekly-review/)
- Clockify's calendar shows schedule gaps, allows time blocks to be moved or resized, and converts external calendar events into tracked entries. It explicitly separates an external planned event from the copied time entry. [Clockify Calendar](https://clockify.me/help/track-time-and-expenses/calendar-view)
- Akiflow treats daily planning as a short ritual and uses calendar Time Slots to reserve work. The lesson is to make committing capacity deliberate rather than silently auto-filling a schedule. [Akiflow: Time Blocking 101](https://product.akiflow.com/help/articles/3677363-time-blocking-101)

#### Fit and boundary

**Classification: deepen CoreHour.**

Add a `planned block` as a separate record from a `session`:

- states: `planned`, `started`, `completed`, `skipped`, `rescheduled`;
- starting a plan creates or links an actual session; it does not mutate the plan into historical truth;
- plans never enter current Insights as focused time;
- week view overlays plan and actual and reports planned minutes, actual minutes, completion rate, and time variance;
- the user can create a block with activity, optional tag, date, start, and duration;
- the first version uses native click/edit controls; drag and resize follow only after the data semantics are stable.

Do not add projects, dependencies, subtasks, inboxes, assignments, or calendar write-back in this slice. Those belong to a task manager, not CoreHour.

#### Product experiment

**Hypothesis:** users will make more realistic commitments when planned focus capacity is visible beside actual focus.

Minimum experiment:

- create/edit/skip/reschedule a plan;
- start CoreHour from a plan;
- day and week overlays;
- one local weekly summary: planned, actual, completed, rescheduled;
- no external calendar and no auto-scheduling.

Success evidence:

- dogfood users create plans on at least three days in a week;
- at least half of planned blocks are explicitly completed, skipped, or rescheduled rather than abandoned;
- the weekly comparison changes the next week's planned capacity in manual review.

Stop or narrow if plans are mostly created retroactively, if users treat them as duplicate sessions, or if demand consistently centers on task lists rather than time commitments. The latter is the signal to consider a separate Day Plan tool.

### 2. Desktop Companion: tray and global commands

#### What mature products demonstrate

- Toggl's Windows app exposes stop, continue-latest, and add-new actions in the taskbar preview; recent/favorite entries in taskbar actions; tray access; and configurable global shortcuts for show/hide and continue/stop. [Toggl Track desktop app for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/)
- Timing exposes a menu-bar utility, a global start/stop shortcut, quick resume of recent timers, idle handling, and the current productive total without requiring the full application window. [Timing Preferences](https://timingapp.com/help/preferences) [Timing Time Entries](https://timingapp.com/help/time-entries)
- Stretchly lives primarily in the tray and uses it to expose reminder state, pause controls, and preferences. The main lesson is that a background utility needs visible state and direct control where it runs. [Stretchly repository](https://github.com/hovancik/stretchly)
- Tauri 2 already provides tray icons and menus in the core API, and its official global-shortcut plugin supports Windows, macOS, and Linux with explicit capability permissions. [Tauri System Tray](https://v2.tauri.app/learn/system-tray/) [Tauri Global Shortcut](https://v2.tauri.app/plugin/global-shortcut/)

#### Fit and boundary

**Classification: shared platform capability.**

The tray is a compact command surface over authoritative module state:

- current CoreHour activity and elapsed time;
- `Start recent`, `Pause/Resume`, `End session`;
- next break and hydration due times;
- `Pause reminders for 30 minutes`, `Until tomorrow`, and `Resume`;
- `Open Today`, `Open Pause & Hydrate`, `Settings`, and `Quit`;
- tray icon or tooltip changes when focus is active or a reminder is pending.

Only two configurable global shortcuts are justified initially:

1. show/hide EfficiencyMemo;
2. start/stop or continue the most recent CoreHour activity.

All commands must call the same Rust/React state transitions used by the main UI. The tray must not own a second timer or reminder scheduler.

#### Product experiment

**Hypothesis:** reducing window switching increases accurate starts/stops and makes the desktop app feel persistent rather than page-based.

Success evidence can remain local: count tray-issued versus window-issued commands for the user's own Insights, with no telemetry. Continue if tray commands become a regular path and reduce forgotten running sessions. Stop expanding if almost all users only use show/hide; a command palette, floating timer, and desktop widgets are not justified until then.

### 3. Local Activity Assist and privacy controls

#### What mature products demonstrate

- ActivityWatch uses local watchers for foreground windows and AFK state, stores data on-device, and exposes watcher pause from the tray. Its own documentation notes that window titles and browser URLs are sensitive and that filtering is difficult to perfect. [ActivityWatch Introduction](https://docs.activitywatch.net/en/latest/introduction.html) [ActivityWatch Watchers](https://docs.activitywatch.net/en/latest/watchers.html) [ActivityWatch Pausing Logging](https://docs.activitywatch.net/en/latest/features/pausing-logging.html) [ActivityWatch Filtering Data](https://docs.activitywatch.net/en/latest/features/filtering-data.html)
- ActivityWatch explicitly states that developers cannot access local usage data and that it does not use third-party behavioral analytics. This is a useful minimum promise for EfficiencyMemo, not proof that all local collection is harmless. [ActivityWatch Privacy Policy](https://docs.activitywatch.net/en/latest/privacy.html)
- Timing lets users exclude specific apps, keywords, devices, private browsing, or all automatic tracking. Its rules assign new activity without overwriting deliberate past assignments. [Timing Exclusions](https://timingapp.com/help/exclusions) [Timing Rules](https://timingapp.com/help/rules)
- Timing treats automatic activity and explicit time entries differently; when they overlap, the explicit entry is authoritative. [Timing FAQ](https://timingapp.com/help/faq)

#### Fit and boundary

**Classification: shared local collector plus a CoreHour review surface. Experimental, not a new top-level tool.**

The first collector should deliberately gather less than ActivityWatch or Timing:

- default off and explained before permission or collection;
- foreground **application name only**;
- no window title, URL, file path, keystroke, screenshot, clipboard, or content;
- local raw retention measured in days, with a short default such as seven days;
- local aggregation into coarse candidate blocks;
- always-visible pause state in the tray;
- application exclusion list and a `Delete all activity data` action;
- raw preview so the user can see exactly what was captured.

Candidate blocks appear in CoreHour Timeline as **unconfirmed suggestions**. Accepting one opens the existing session editor. Suggestions do not start a timer, become sessions, enter goals, or affect Insights until the user confirms them.

The collector must never be uploaded to WebDAV or a future sync service by default. Any future opt-in export must separate raw activity from confirmed CoreHour records and state the scope before writing the file.

#### Product experiment

**Hypothesis:** application-only suggestions recover forgotten focus time without creating a surveillance product.

Run a Windows-first technical and privacy spike before product implementation:

- sample foreground application transitions and idle state;
- measure CPU, memory, database growth, suspend/resume correctness, and permission behavior;
- validate that process/application names alone produce useful suggestions;
- expose collection state and deletion before adding categorization.

Proceed only if a majority of candidate blocks can be understood and accepted with little editing. Stop if usefulness requires window titles, URLs, screenshots, or cloud inference. Those signals cross the product's privacy boundary.

### 4. Healthy interruptions and DND-aware timing

#### What mature products demonstrate

- Stretchly pauses breaks during natural idle and system DND, gives advance notice, supports postpone/skip, and exposes current status in the tray. [Stretchly repository](https://github.com/hovancik/stretchly)
- Workrave distinguishes microbreaks, longer rest breaks, and a daily limit. It counts active versus idle time and can recognize a completed break when idle time reaches the configured duration. [Workrave Breaks](https://workrave.org/docs/breaks/) [Workrave Timer Settings](https://workrave.org/docs/settings/timers/)
- LookAway avoids interruptions during meetings, video, screen sharing, fullscreen games, or selected deep-focus apps. Its planned breaks become ready after the blocking activity ends and use a grace period instead of firing instantly. [LookAway Introduction](https://lookaway.com/docs/introduction/) [LookAway Planned Breaks](https://lookaway.com/docs/planned-breaks/)
- LookAway also demonstrates a gentler escalation: pre-break notice, office hours, configurable skip behavior, and optional automation. [LookAway Setup](https://lookaway.com/docs/setting-up/)

#### Fit and boundary

**Classification: deepen Pause & Hydrate, supported by shared presence signals.**

Delivery should be staged:

1. **Reliable schedule policy:** active weekdays, active time window, quiet hours, and visible notification-permission state.
2. **Natural rest:** when the device is idle or locked long enough, satisfy a movement break and schedule the next one. Never infer hydration from idle time.
3. **DND-aware deferral:** defer a pending reminder while system DND is active, then apply a short grace period when DND ends.
4. **Context exclusions, only if demanded:** meeting/fullscreen/application detection is platform-specific and should not precede reliable quiet hours and idle handling.

Use a two-stage interaction:

- quiet pre-notice that a reminder is approaching;
- actionable due reminder with `Done`, `10 min later`, and `Mute today`.

Do not add punitive streak loss, repeated blocking overlays, medical claims, or a “health score.” Completion is a user-confirmed event; absence of interaction is not failure.

#### Product experiment

**Hypothesis:** respectful timing will reduce mutes and postponed reminders more than decorative rewards will.

Success evidence:

- fewer reminders immediately muted for the day;
- natural rest closes eligible break reminders without duplicate prompts;
- no reminder fires within the configured quiet window or while CoreHour is active;
- resume from sleep or DND does not release a burst of stale reminders.

### 5. Unified local export, restore, and reset

#### What mature products demonstrate

- ActivityWatch exposes export of one bucket or all buckets as JSON and recommends local aggregation/redaction before sharing raw data with third parties. [ActivityWatch Exporting Data](https://docs.activitywatch.net/en/latest/features/exporting-data.html)
- Standard Notes offers automated local backups, full manual backups, human-readable decrypted exports, and an offline recovery path. The product promise is that a user's data survives the service. [Standard Notes Data Longevity](https://standardnotes.com/help/4/what-happens-to-my-data-if-standard-notes-disappears)
- Lunatask identifies the limitation of trying to make one export simultaneously machine-restorable and human-readable; its planned redesign separates a complete machine dump from a human-oriented folder. [Lunatask Import / Export](https://lunatask.app/docs/features/import-export)
- Super Productivity groups sync, backup, import, and export in one data area and separates restorable application state from device-local support data and separately stored credentials. [Super Productivity data management](https://github.com/super-productivity/super-productivity/blob/master/docs/wiki/4.23-Managing-Your-Data.md)

#### Current gap

EfficiencyMemo's SQLite snapshot covers database-backed records, but product state also exists outside the database: locale, appearance, local profile/session metadata, WebDAV non-secret fields, and transient CoreHour progress use browser storage. The current CoreHour CSV is human-readable but not a complete restore format. The retained WebDAV path is remote-only and not a replacement for a local Data & Privacy page.

#### Fit and boundary

**Classification: shared platform capability. Immediate trust requirement.**

Create one Data & Privacy destination with four separate jobs:

1. **Portable backup:** a versioned, machine-restorable local package containing stable SQLite data and restorable non-secret preferences. Do not include keychain secrets. Do not export an in-progress session without an explicit pause/finalize decision.
2. **Human export:** per-module CSV/JSON for confirmed CoreHour sessions/check-ins and Pause & Hydrate events. Raw future activity suggestions are a separate, explicitly selected scope.
3. **Restore:** show created date, app/schema version, included modules, and record counts before applying. Restore must preserve the current dataset if validation or replacement fails and should clearly require restart when needed.
4. **Reset:** clear CoreHour, clear Pause & Hydrate, clear future activity data, or reset the whole application. Require typed confirmation for whole-app reset and offer a backup first.

Data export, restore, and deletion must remain free, work without an account, and never require WebDAV.

#### Product experiment

This is a reliability gate rather than an engagement feature. It succeeds when a clean installation can export, reset, restore, and reproduce representative records and preferences through a documented manual scenario without touching secrets or leaving a half-restored database.

## Classification map

| Opportunity | Classification | Priority | Why it belongs there | Explicit boundary |
|---|---|---:|---|---|
| Planned focus blocks | Deepen CoreHour | P0 | Intention is directly compared with confirmed focus | No general tasks or auto-scheduling |
| Week Plan vs Actual | Deepen CoreHour | P0 | Existing sessions, goals, and Insights already own the data | Plans never count as actual time |
| Short weekly review | Deepen CoreHour | P1 | Makes week variance actionable | No journaling system or team post |
| Tray command surface | Shared platform | P0 | Controls CoreHour and Pause & Hydrate together | No duplicate timer state |
| Global show/hide and start/stop | Shared platform | P0 | Native desktop ergonomics across modules | Two actions first, not a shortcut editor platform |
| Working/quiet hours | Deepen Pause & Hydrate | P0 | Reminder eligibility is module policy | Do not alter CoreHour session data |
| Idle/DND presence | Shared platform signal | P1 | Both reminder deferral and future idle review can consume it | Signal only; modules own decisions |
| Natural movement break | Deepen Pause & Hydrate | P1 | Idle can satisfy physical-away intent | Never infer hydration completion |
| Foreground-app collector | Shared platform, experimental | P2 | Native collection should not be coupled to Timeline rendering | Off by default, app name only |
| Activity suggestion review | Deepen CoreHour | P2 | It proposes missing sessions for existing review flow | Confirmation required; no automatic Insights |
| Full local backup/restore/reset | Shared platform | P0 | Every module and preference is affected | Secrets excluded; no account required |
| Read-only calendar bridge | Shared platform candidate | P3 | Plans may benefit from external commitments | Start only after local plans prove useful |
| Day Plan | Independent tool candidate | Gate | Task lifecycle is different from time records | Create only with demand independent of CoreHour |
| General task/project manager | Reject | — | Duplicates a crowded category and breaks module focus | No subtasks, assignments, dependencies, inbox |
| AI auto-scheduling | Reject for current horizon | — | Requires broad task/calendar access and continuous inference | Revisit only after manual planning succeeds |
| Screenshots, keystrokes, content capture | Reject | — | Surveillance risk exceeds personal utility | Not an EfficiencyMemo capability |
| Team time, approvals, manager dashboards | Reject | — | Conflicts with individual/local-first positioning | No seat-based surveillance business |

## UI and interaction implications

More color should clarify domain and state, not create unrelated skins inside one application. Keep `Ember`, `Grove`, and `Tide` as product palettes, then add semantic roles that each palette maps consistently.

### Proposed visual roles

| Role | Meaning | Where to use | Non-color cue |
|---|---|---|---|
| `focus` | CoreHour identity and active work | tool icon, active nav marker, active timer, selected week cell | play/pause icon and solid border |
| `planned` | committed but not yet actual | plan blocks, planned totals | dashed border |
| `actual` | confirmed historical time | session blocks, actual totals | solid filled edge |
| `suggested` | local activity awaiting review | candidate blocks and review count | dotted border and pending icon |
| `recovery` | movement/rest | Pause card, rest timeline markers | stretch/rest icon |
| `hydration` | water reminder | Hydration card and event markers | droplet icon |
| `privacy` | collection and data control | collector status, export scope, local-only notices | shield/database icon |

Status colors remain global and do not change meaning by tool:

- `info`: neutral information and planned/suggested context;
- `success`: explicitly completed or restored;
- `warning`: due, overdue, or needs review;
- `danger`: destructive action, conflict, or failure;
- `muted`: paused, skipped, archived, or outside active hours.

### Rules for consistent differentiation

- Module color is limited to icons, navigation indicators, key metrics, chart series, and compact contextual controls. Do not tint whole pages or every card.
- Primary commands still use the selected palette's accessible accent and `on-accent` pair. A hydration button does not become blue merely because it mentions water.
- Plan, actual, and suggestion must differ by border style or icon as well as hue, so meaning survives color-vision differences.
- Destructive reset always uses the danger role, regardless of selected palette or module.
- Tag colors remain user data. They must not be reused as module or status colors.
- Add role tokens per palette rather than hardcoded component hex values. Every light/dark pair needs text, control-boundary, hover, focus, and disabled-state contrast checks before shipping.
- Do not add arbitrary theme colors or a theme marketplace. Curated palettes keep contrast and product identity reviewable.

## Sustainable individual-user business models

### Primary-source benchmarks

- ActivityWatch keeps every feature open and asks individuals for `$5/month` or `$50/year` purely to fund development; it also offers larger one-time believer contributions. [ActivityWatch Support](https://activitywatch.net/subscribe/)
- LookAway sells a perpetual single-device license for `$19`, includes one year of updates, and makes later update renewal optional. This fits a native utility with no required cloud cost. [LookAway Pricing](https://lookaway.com/pricing/)
- Obsidian keeps the local application free and funds development through optional support and paid services such as Sync and Publish; payment is not required to own local files. [Obsidian Pricing](https://obsidian.md/pricing)
- Sunsama charges `$22/month` or `$204/year` and explicitly ties subscription pricing to a guided daily workflow and ongoing product maintenance. It proves that a focused individual workflow can support premium pricing, but its cloud integrations and operating model are much heavier than EfficiencyMemo's. [Sunsama Pricing Manifesto](https://help.sunsama.com/docs/billing/pricing-manifesto/)
- Akiflow's current individual Pro pricing is `$34` monthly or `$19/month` billed yearly and bundles calendar/task integrations and AI. It is a ceiling benchmark, not an appropriate launch price for a local utility. [Akiflow Pricing](https://akiflow.com/pricing)

### Recommended model for EfficiencyMemo

The repository is MIT-licensed and the current value proposition is local/no-account operation. Monetization should reinforce that trust:

1. **Local core stays complete and free:** timers, reminders, history, planning, Insights, privacy controls, export, restore, and reset.
2. **Supporter funding first:** optional `$5/month`, `$50/year`, or a one-time supporter contribution, with no locked productivity or privacy feature. Benefits can be recognition, roadmap participation, and early stable previews rather than data lock-in.
3. **Perpetual convenience license as an experiment:** a signed, supported desktop distribution with one year of updates can be tested in the `$19–29` range while source builds remain available. The value is convenience and support, not artificial feature removal.
4. **Optional service subscription only when the service exists:** hosted end-to-end encrypted sync, automatic off-device backup, and version history could justify roughly `$3–5/month`. Do not build billing before reliable local export/restore and meaningful retention exist.

Never charge for export, deletion, local history, privacy exclusions, or the ability to use the app without an account. Never sell activity data, place ads, create manager views, or make raw collection the commercial asset.

## Prioritized experiments

### E0 — Data & Privacy Center

**Horizon:** next release

**Scope:** local full backup, previewed restore, per-module reset, whole-app reset, and human exports.

**Why first:** activity assistance and paid sync would be irresponsible before users can inspect, move, and delete their data.

**Exit gate:** a complete manual export-reset-restore scenario passes with representative CoreHour, Pause & Hydrate, locale, and appearance data; keychain secrets stay excluded.

### E1 — Desktop Companion

**Horizon:** next 1–2 releases

**Scope:** tray status/actions, show/hide shortcut, start/stop shortcut, current focus, and next reminders.

**Why now:** it is a small native slice with high daily frequency and creates the shared command path needed by later presence features.

**Exit gate:** no duplicate state, suspend/resume remains correct, and every tray action produces the same result as the main window action.

### E2 — CoreHour Plan vs Actual

**Horizon:** following 2–3 releases

**Scope:** separate plan records, day overlay, week view, plan-to-session start, skip/reschedule, and a compact weekly review.

**Why now:** it is the clearest product-value expansion and reuses the existing timeline, goals, activities, tags, and Insights.

**Exit gate:** users can distinguish plan from actual without explanation, plans never inflate focus totals, and week variance remains correct across edits and rescheduling.

### E3 — Pause & Hydrate interruption policy

**Horizon:** alongside or immediately after E2

**Scope:** active days/hours, quiet hours, notification state, natural movement breaks, and staged DND support.

**Why:** it improves trust in an existing module instead of adding more reminder types.

**Exit gate:** no stale reminder burst after sleep/DND, no prompt outside eligible hours, and idle can complete only movement breaks.

### E4 — Local Activity Assist privacy spike

**Horizon:** 6–12 months

**Scope:** Windows-first application-name/idle collector, pause/exclude/delete controls, seven-day raw retention, and unconfirmed Timeline suggestions.

**Why later:** its privacy and platform costs are much higher than its apparent UI size.

**Exit gate:** useful suggestions do not require titles, URLs, content, screenshots, cloud processing, or silent collection.

### E5 — Business-model validation

**Horizon:** after repeat use is demonstrated

**Scope:** supporter funding page first; optional perpetual supported-build offer second; hosted encrypted sync only after a separate service and threat model exist.

**Why later:** billing cannot repair weak retention, and an account would currently make the offline product worse.

**Exit gate:** users voluntarily support the local product or request off-device service strongly enough to cover signing, support, storage, and operations.

## Long-horizon roadmap

| Horizon | Product outcome | Main deliverables | Deliberately deferred |
|---|---|---|---|
| 0–3 months | Trustworthy daily desktop utility | Data & Privacy Center; tray MVP; quiet hours; semantic module/state colors | drag/resize, calendar accounts, automatic activity |
| 3–6 months | Intent and reality in one focus workflow | planned blocks; day overlay; week view; plan-to-session; compact weekly review | general tasks, AI scheduling, team sharing |
| 6–12 months | Respectful assistance | idle/DND maturity; app-name-only Activity Assist experiment; review queue; retention/exclusions | titles, URLs, screenshots, cloud inference |
| 12–24 months | Sustainable personal product | supporter program; supported builds; optional encrypted sync/backup feasibility | seat billing, manager analytics, ad/data business |

An independent **Day Plan** tool is not on the committed roadmap. Its entry gate is repeated evidence that people want tasks, rollover, and priorities even when they do not create CoreHour plans or sessions. If that gate is met, Day Plan owns task lifecycle while CoreHour only links a plan/session to an optional task reference.

## Risk register

| Risk | Consequence | Control | Stop condition |
|---|---|---|---|
| Plan records become a task manager | CoreHour loses a clear boundary | time, activity, tag, state only | demand requires dependencies/assignments/subtasks |
| Tray creates parallel state | timers or reminders diverge | one authoritative command/state path | any action cannot be made identical across UI and tray |
| DND/idle differs by OS | missed or burst reminders | stage by platform; quiet hours first | cross-platform behavior cannot be explained and tested |
| Activity metadata is too sensitive | trust loss and breach impact | default off, app name only, short retention, exclusions, delete | useful output requires content-level collection |
| Automatic suggestions pollute history | Insights become untrustworthy | explicit confirmation; separate tables/status | suggestions enter totals before acceptance |
| Restore is destructive | irreversible data loss | preview, validation, side-by-side replacement, pre-reset backup | current dataset can be replaced before validation completes |
| Module colors conflict with statuses | confusing or inaccessible UI | semantic tokens, non-color cues, contrast review | a role cannot be distinguished in monochrome/high contrast |
| Monetization weakens local-first promise | churn and community forks | local core and data rights stay free | revenue requires locking export/history or selling data |

## Product principles to preserve

1. **Confirmed data outranks inferred data.** A manual session is truth; a plan is intention; an activity suggestion is only a proposal.
2. **Shared signals, module-owned decisions.** Idle/DND/foreground-app state may be shared, but CoreHour and Pause & Hydrate decide what each signal means.
3. **Local by default is a behavior, not a slogan.** Collection is visible, pausable, inspectable, exportable, and deletable.
4. **The desktop shell should remove interaction, not add dashboards.** Tray and shortcuts are for frequent commands; the main window is for editing and review.
5. **Color carries a stable vocabulary.** Palette changes style; semantic roles keep meaning.
6. **Business value comes from reliability and continued service.** Data captivity, surveillance, and team controls are not acceptable substitutes.

## Source policy

This report uses first-party product manuals, official repositories, official framework documentation, and official pricing pages accessed on 2026-08-28. Prices and platform support can change; confirm them again before a commercial launch or architecture decision.
