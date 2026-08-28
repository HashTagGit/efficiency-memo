# EfficiencyMemo product and UI landscape, 2026

Research date: 2026-08-28

## Method and evidence labels

This review uses first-party product documentation, official repositories, official release notes, and the current EfficiencyMemo source tree. It does not treat marketing comparisons, community posts, or repository popularity as proof of product quality.

The evidence ledger contains 56 unique external first-party links across official product/help/pricing pages, repositories/releases, and primary design/accessibility standards. Repeated links are intentional where one source supports multiple comparisons.

- **Verified**: directly stated or visible in a cited first-party source.
- **Current**: directly present in the current EfficiencyMemo repository.
- **Inference**: a product gap inferred by comparing verified external behavior with current source. It is not user-demand evidence.
- **Recommendation**: a proposed direction. It is not presented as an existing capability or a competitor fact.

## Executive decision

EfficiencyMemo should continue as a **local-first personal work-rhythm desktop suite**. It should not expand into employee monitoring, team billing, or a general task manager.

The strongest next loop is:

```text
Plan -> Focus -> Recover -> Review -> Adjust the next plan
             \-> Activity suggestion -> Explicit confirmation -/
```

The repository now implements the three foundations that earlier competitor reviews recommended: semantic module and interaction colors, explicit local Activity Assist rules, and guided daily/weekly reviews with optional DND-aware reminders. It also has five curated palettes with independent light/dark/system modes; a Now surface; CoreHour plan-versus-actual and Insights; mature Pause & Hydrate deferral; tray commands; local backup/restore/reset; and Chinese/English UI. The next release should coordinate those modules and make planning capacity visible instead of adding another timer or a general task manager.

Immediate priorities:

1. Make the Now surface a bounded cross-module attention feed, including review, suggestion, recovery, and device actions.
2. Complete Charger Reminder's native due-notification loop with snooze and charged actions.
3. Add a local daily capacity guard that compares planned focus time with the user's target and available work window.
4. Add a descriptive Work Rhythm summary that connects focus, context changes, and recovery without a productivity score.
5. Treat read-only calendar context and an optional companion presentation as separate later experiments; do not add a sixth palette without usage evidence.

## Current EfficiencyMemo baseline

The following is **Current**, based on the repository at `417cdb3`:

| Area | Current capability | Evidence |
|---|---|---|
| Appearance | Ember, Grove, Tide, enhanced-contrast Clarity, and evergreen/coral Canopy; independent System/Light/Dark; persistent preview controls | [`appearance.tsx`](../../apps/desktop/src/lib/appearance.tsx), [`index.css`](../../apps/desktop/src/index.css), [`settings/page.tsx`](../../apps/desktop/src/pages/settings/page.tsx) |
| Color semantics | Focus, planned, actual, suggested, recovery, hydration, privacy, success, warning, danger, and info roles; semantic alert containers; module locator colors; explicit hover, pressed, disabled, control-border, and focus-ring reactions | [`index.css`](../../apps/desktop/src/index.css), [`alert.tsx`](../../packages/ui/src/alert.tsx), [`button.tsx`](../../packages/ui/src/button.tsx) |
| CoreHour | Today timer, check-ins, manual correction, favorites, plans, day/week Timeline, plan-versus-actual, uncertain-time review, goals, Insights, tags, guided daily/weekly reviews, and optional review reminders | [`core-hour`](../../apps/desktop/src/features/core-hour), [`review-reminder.rs`](../../apps/desktop/src-tauri/src/review_reminder.rs), [`ROADMAP.md`](../ROADMAP.md) |
| Activity Assist | Off by default; foreground executable only; pause, exclusions, short retention, raw inspection/deletion; stable suggestions; edit, dismiss, atomic explicit acceptance into Actual Sessions, and explicit app-to-activity/tag rules | [`activity_assist.rs`](../../apps/desktop/src-tauri/src/activity_assist.rs), [`activity-assist-page.tsx`](../../apps/desktop/src/features/activity-assist/activity-assist-page.tsx) |
| Pause & Hydrate | Separate recovery/hydration cadence; work and quiet hours; native notifications; focus deferral; DND/system-interruption handling; natural idle rest where supported; local event history | [`pause-hydrate`](../../apps/desktop/src/features/pause-hydrate), [`ROADMAP.md`](../ROADMAP.md) |
| Desktop operations | Operational Now dashboard, tray state/actions, global show/hide and focus commands | [`dashboard`](../../apps/desktop/src/pages/dashboard), [`ROADMAP.md`](../ROADMAP.md) |
| Charger Reminder | Devices, charge history, threshold preference, estimated charge state, create/edit/detail flows | [`charger-reminder`](../../apps/desktop/src/features/charger-reminder) |
| Trust and portability | Local profile without sign-in; SQLite; privacy controls; portable backup preview/restore; scoped export/reset; WebDAV configuration | [`CONTEXT.md`](../CONTEXT.md), [`data-privacy-page.tsx`](../../apps/desktop/src/pages/settings/data-privacy-page.tsx) |
| Localization | English and Simplified Chinese across the shell and current tools | [`i18n.tsx`](../../apps/desktop/src/lib/i18n.tsx) |

This baseline matters: features listed below are evidence for improving interaction quality and product boundaries, not a mandate to clone a competitor.

## Primary-source landscape matrix

| Product and primary sources | Verified product shape | Transferable idea | Boundary for EfficiencyMemo |
|---|---|---|---|
| **Toggl Track**: [features](https://toggl.com/track/features/), [desktop Timeline](https://support.toggl.com/the-timeline-feature), [Windows desktop app](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/), [Pomodoro](https://support.toggl.com/en-us/article/how-to-enable-the-pomodoro-timer-1ra91f7/) | **Verified:** manual, timer, offline, and calendar-oriented time capture; optional private desktop activity Timeline; calendar-to-entry actions; favorites, idle handling, shortcuts, and Pomodoro are available on supported clients. | Keep frequent capture/correction actions direct; show automatic evidence beside confirmed time rather than silently replacing it. | Do not copy clients, approvals, utilization, billing, or team administration. Activity capture remains opt-in and app-name-only. |
| **Clockify**: [help center](https://clockify.me/help/), [automatic tracker](https://clockify.me/automatic-time-tracker), [calendar/mobile interaction](https://clockify.me/help/apps/android-app), [2026 changelog](https://clockify.me/help/whats-new), [pricing](https://clockify.me/pricing) | **Verified:** timer, timesheet, kiosk, auto tracker, calendar, reporting, scheduling, and workforce administration form one suite. Auto-tracked activities remain local/private until the user creates a time entry. Current desktop interaction includes project colors, full-day Timeline, search suggestions, undo, and schedule recurrence. | Preserve the evidence-to-confirmed-record boundary; add undo and repeatable plan templates only where they reduce recurring personal work. | No screenshots, URLs, titles, GPS, kiosk, approvals, attendance, or team-capacity administration. Clockify's breadth is a business-suite signal, not the EfficiencyMemo product boundary. |
| **RescueTime**: [Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant), [goals and alerts](https://help.rescuetime.com/article/42-using-goals-and-alerts-to-keep-track-of-your-behavior), [Focus Sessions](https://help.rescuetime.com/article/297-how-to-start-a-focus-session), [Focus Zones](https://help.rescuetime.com/article/364-focus-zones) | **Verified:** the tray/menu-bar Assistant combines current mode, one featured daily goal, a chronological actionable alert feed, Focus Sessions, offline activity, focus opportunities, and end-of-day/weekly summaries. Goals and alerts are separate: one tracks progress, the other fires at a threshold. | A compact operational surface should answer “what is happening, what needs attention, and what is the next action?” A bounded review can turn trends into one adjustment. | No website/app blocking, cloud classification, opaque productivity score, or behavior-changing alert without user control. |
| **Rize**: [current documentation](https://docs.rize.io/), [tracking overview](https://docs.rize.io/automatic-tracking/tracking-overview), [first-time setup](https://docs.rize.io/getting-started/first-time-setup), [sidebar/navigation](https://docs.rize.io/getting-started/sidebar-navigation), [reports](https://docs.rize.io/ai/reports) | **Verified:** 2026 Rize creates live calendar activity, turns context changes into reviewable suggestions, proposes descriptions/tags, learns through rules and corrections, exposes configurable privacy/retention, and organizes navigation by daily workflow. It also now serves teams, clients, profitability, invoices, reports, and agent/MCP workflows. | Corrections should become durable local rules; pending work should be visible in its timeline context; navigation should follow the user's work sequence. | Rize captures window titles and URLs and has moved toward agency operations. EfficiencyMemo should not widen collection or import its client/team/account model. |
| **Sunsama**: [daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/), [weekly planning](https://help.sunsama.com/docs/usage-guides/weekly-objectives/weekly-planning/), [workspace navigation](https://help.sunsama.com/docs/usage-guides/workspace-navigation/), [calendar integration](https://help.sunsama.com/docs/integrations/calendar/), [pricing manifesto](https://help.sunsama.com/docs/billing/pricing-manifesto/) | **Verified:** guided planning resolves yesterday, imports commitments, compares estimated workload with a threshold and shutdown time, then orders/timeboxes a feasible day. Weekly planning carries objectives forward. The main workspace uses a collapsible navigation rail, central board/calendar, contextual right panel, and a single-task focus mode. | Put capacity feedback inside planning, not only in retrospective Insights; let reviews hand one adjustment into the next plan. Use progressive focus from overview to one active item. | Do not build a cloud task manager, collaboration feed, or two-way calendar service. EfficiencyMemo can borrow the capacity constraint without copying the task corpus. |
| **Akiflow**: [Inbox](https://product.akiflow.com/help/articles/5284502-your-inbox), [rituals](https://product.akiflow.com/articles/0805246-rituals), [Time Slots](https://product.akiflow.com/help/articles/3089241-time-slots), [calendar customization](https://product.akiflow.com/help/articles/0807758-customize-your-calendar), [Daily Dashboard](https://product.akiflow.com/en/help/articles/7855441-daily-dashboard), [pricing](https://akiflow.com/pricing) | **Verified:** imported and captured work lands in an Inbox, planned work moves to Today/calendar, Time Slots group related work and show completion, and daily/weekly planning and shutdown close the loop. Project color appears on calendar slots rather than every task surface. Its mobile Daily Dashboard separates current/next Live Activity from an AI feed. | Reusable local focus-block templates and a current/next attention surface are valuable without importing a full task system. Limit module color to locators and timeline structures rather than washing whole pages. | No universal task inbox, messaging integrations, AI feed, meeting transcripts, WhatsApp capture, MCP write access, or mobile build until the desktop loop proves demand. |
| **Timely**: [automatic tracking](https://www.timely.com/feature/automatic-time-tracking/), [privacy](https://www.timely.com/privacy/), [privacy roles](https://www.timely.com/privacy-at-timely/), [pricing](https://www.timely.com/pricing/) | **Verified:** the Memory tracker builds a private activity timeline; AI drafts timesheets, while users review what becomes shared. It combines automatic capture with projects, planning, budgets, team reporting, and per-seat subscriptions. Official privacy material says no screenshots or remote control, but collection includes active app/page titles and timestamps and is stored in hosted systems. | Keep raw evidence private, make confirmation the publication boundary, and show the user exactly what a derived record came from. | EfficiencyMemo should retain app-name-only local collection and must not adopt title/page capture, hosted AI classification, billing, utilization, or manager reporting. |
| **ActivityWatch**: [official repository](https://github.com/ActivityWatch/activitywatch), [introduction](https://docs.activitywatch.net/en/latest/introduction.html), [latest releases](https://github.com/ActivityWatch/activitywatch/releases), [AI/privacy guidance](https://github.com/ActivityWatch/docs/blob/master/src/examples/agents-and-ai.rst) | **Verified:** local ownership; modular app/window, browser, and AFK watchers; timeline, categories, raw-data inspection, queries, JSON export, and REST/query APIs. Recent releases add work-time reports, category sets, privacy filters, query presets, timeline filtering, and multiple locales. Official AI guidance recommends local aggregation and redaction before model access. | Keep collectors separable, visible, pausable, inspectable, bounded, and deletable. Derive summaries locally from minimal inputs. | No title, URL, content, screenshot, or keystroke collection. A plugin/watchers ecosystem is premature until a real integration need exists. |
| **Super Productivity**: [official repository](https://github.com/super-productivity/super-productivity), [official site](https://super-productivity.com/), [2026 releases](https://github.com/super-productivity/super-productivity/releases) | **Verified:** tasks/subtasks/projects/tags, timeboxing and tracking, work summaries, focus mode, break reminder, Pomodoro, personal metrics, notes/attachments, issue-provider integrations, optional encrypted sync, themes, and plugins form a broad task-to-execution workspace. Recent releases continue refining focus, schedule, history, break, mobile, and sync flows. | A daily workflow is stronger when intention, execution, recovery, and review connect without repeated data entry. Keyboard paths should complement visible commands. | Its breadth is a warning as much as inspiration. Do not add a task manager, issue providers, notes workspace, collaboration, or plugins as speculative scope. |
| **Stretchly**: [official README](https://github.com/hovancik/stretchly/blob/trunk/README.md) | **Verified:** tray-first short and long breaks; advance notice, postpone, skip, and strict modes; idle and DND awareness; multi-screen/fullscreen presentation; system/light/dark themes; localization; independent colors/sounds for break types; optional Break Health Mode intensifies a screen-edge cue after repeated skips. | Recovery and hydration need distinct identity, respectful deferral, visible status, and escalation that stays under user control. | Do not use coercive full-screen behavior by default. Unsupported OS capabilities must remain explicitly unavailable. |
| **Evelyn TimeTracker**: [repository](https://github.com/Evelyn-rgb-debug/TimeTracker), [Windows Readme](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/main/Windows/Readme.txt) | **Verified:** a Windows/PySide6 personal utility combining timer, calendar, task logging, plans, completed logs, month/week/day review, editable records, category summaries, tray, SQLite, saved window state, and auto-start in a glass-panel UI. | A lightweight local product can place plans and actual records in one calendar without becoming a team suite. | The root README is effectively empty and the author warns source builds may be unstable. It is inspiration, not an engineering or accessibility baseline. |
| **PawPal**: [official repository](https://github.com/zebangeth/PawPal), [official releases](https://github.com/zebangeth/PawPal/releases) | **Verified:** a transparent always-on-top desktop pet uses motion and speech bubbles for break, hydration, and distraction nudges; it offers multiple appearances, Chinese/English UI, local settings/statistics, tray operation, and user-imported GIF appearance. Distraction detection remains macOS-only. | An optional character/presence can make background reminders recognizable and emotionally warmer than generic notifications. | The companion must be optional, quiet, reduced-motion aware, and never substitute for status text or accessible controls. Do not depend on third-party animation assets. |

## Business and packaging signals

These are **Verified** business shapes, not pricing recommendations. Prices were checked on the research date and can change.

| Shape and primary source | What it funds | Relevance to EfficiencyMemo |
|---|---|---|
| Toggl's free tier plus paid per-license team plans ([pricing](https://toggl.com/track/pricing/)) | Team reporting, billing, profitability, approvals, integrations, and enterprise service | Evidence for a team operations business, but it requires the clients, seats, and administration that EfficiencyMemo explicitly rejects. |
| Clockify's free capture tier plus progressively broader per-seat operations plans ([pricing](https://clockify.me/pricing)) | Kiosk, approvals, invoicing, scheduling, workforce controls, data regions, and a wider productivity-suite bundle | Reinforces that “free time tracker” can be an acquisition surface for workforce software. That is not a local personal-product roadmap. |
| RescueTime's free Lite tier plus individual/team subscriptions ([pricing](https://www.rescuetime.com/pricing)) | Longer history, focus intervention, detailed reporting, and automated timesheets | Shows that an individual focus product can support recurring revenue, but its cloud tracking and feature gates conflict with the local-first core. |
| Rize's individual/team subscriptions with AI-credit tiers ([pricing](https://rize.io/pricing)) | Hosted automatic classification, reports, agents, integrations, and team operations | A service-cost model for cloud AI and agency workflows; not a reason to send EfficiencyMemo activity data to a hosted model. |
| Sunsama's single premium daily-planner subscription ([pricing manifesto](https://help.sunsama.com/docs/billing/pricing-manifesto/)) and Akiflow's premium individual plan with AI included ([pricing](https://akiflow.com/pricing)) | A high-frequency planning ritual, calendar/integration maintenance, cross-device clients, and support | Demonstrates willingness to pay for a calm individual workflow. EfficiencyMemo should first prove repeat weekly use; it should not add cloud accounts merely to imitate the packaging. |
| Timely's per-seat subscriptions and optional task-management add-on ([pricing](https://www.timely.com/pricing/)) | Hosted Memory processing, AI-drafted timesheets, project controls, accounting integrations, capacity planning, and team service | Another evidence-to-timesheet business aimed at billable teams. The transferable asset is private review, not the manager or revenue layer. |
| ActivityWatch's all-features-open supporter subscription ([support](https://activitywatch.net/subscribe/)) | Ongoing maintenance of a local, no-account, no-cloud open-source product; subscribing unlocks nothing | The closest trust fit: ask committed users to fund maintenance without weakening the free local product. |
| Super Productivity's free/open-source, no-registration distribution ([official repository](https://github.com/super-productivity/super-productivity)) | Community development and broad platform distribution; its optional encrypted SuperSync can also be self-hosted | Confirms that a complete local product and optional service can coexist. Do not infer that EfficiencyMemo needs Super Productivity's breadth. |
| Stretchly's sponsorship/contributor benefits ([sponsor](https://hovancik.net/stretchly/sponsor/)) | Maintenance plus contributor preferences, preference sync, and community access | Demonstrates optional convenience/community benefits, but privacy controls and data portability should never become rewards. |

**Recommendation:** validate repeat use before adding billing. The lowest-risk sequence is (1) voluntary supporter funding, (2) an optional paid signed/supported distribution if release maintenance creates real value, and only then (3) an optional hosted encrypted backup/sync service with a published threat model. Local timers, plans, reviews, reminders, history, export, restore, deletion, and privacy controls remain complete without payment or an account. Do not build a checkout, entitlement system, or cloud account in anticipation of demand.

## What the landscape actually says

### 1. The durable shape is a constraint-and-review loop

Toggl, Clockify, Timely, Rize, and ActivityWatch approach capture differently, but all separate evidence from a record the user can inspect or confirm. Sunsama and Akiflow add the missing forward step: constrain the next plan by capacity, then return to review. **Recommendation:** the delivered EfficiencyMemo reviews should feed a visible capacity guard and one next decision; another passive chart would not complete the loop. [Clockify automatic tracker](https://clockify.me/automatic-time-tracker), [Sunsama daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/), [Akiflow rituals](https://product.akiflow.com/articles/0805246-rituals), [Timely privacy](https://www.timely.com/privacy/)

### 2. Automation earns trust through correction, provenance, and undo

Rize makes suggestion review and correction part of setup; ActivityWatch exposes raw events and privacy filters; Toggl, Clockify, and Timely keep private activity evidence separate from confirmed/shared time. EfficiencyMemo now has explicit local app rules and the correct confirmation boundary. **Recommendation:** deepen the same surface with clear provenance, deterministic overrides, and bounded batch/undo operations; do not widen collection. [Rize tracking overview](https://docs.rize.io/automatic-tracking/tracking-overview), [ActivityWatch releases](https://github.com/ActivityWatch/activitywatch/releases), [Toggl Timeline](https://support.toggl.com/the-timeline-feature), [Clockify auto tracker](https://clockify.me/help/track-time-and-expenses/auto-tracker), [Timely privacy roles](https://www.timely.com/privacy-at-timely/)

### 3. Desktop products win through an operational edge surface

Toggl, RescueTime, Stretchly, and PawPal use the tray, menu bar, notifications, overlays, or shortcuts as primary operating surfaces. Akiflow's mobile Daily Dashboard separately shows current/next Live Activity and a feed. EfficiencyMemo has tray actions and native notifications, so the missing value is coordination: one attention feed that prioritizes the next relevant action across focus, plans, reviews, recovery, hydration, Activity Assist, and charging. [RescueTime Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant), [Akiflow Daily Dashboard](https://product.akiflow.com/en/help/articles/7855441-daily-dashboard), [PawPal repository](https://github.com/zebangeth/PawPal)

### 4. Color works when it encodes role, ownership, and state

Akiflow confines project colors to calendar slots, Sunsama pairs imported items with source icons and moves between board/calendar/focus views, Stretchly differentiates short and long recovery modes, and Super Productivity uses project/tag color. These are locators, not full-page washes. Mature design systems map raw values to semantic roles: Material pairs content and container roles, Fluent separates neutral, brand/shared, and semantic roles, and WCAG requires non-color cues and contrast for text and meaningful UI boundaries. [Akiflow calendar customization](https://product.akiflow.com/help/articles/0807758-customize-your-calendar), [Sunsama workspace navigation](https://help.sunsama.com/docs/usage-guides/workspace-navigation/), [Material Web color](https://github.com/material-components/material-web/blob/main/docs/theming/color.md), [Fluent color](https://fluent2.microsoft.design/color), [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color), [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

### 5. Business expansion usually changes the product's subject

Clockify, Toggl, Timely, RescueTime, and Rize fund growth through seats, clients, approvals, billing, utilization, hosted capture, or AI services. Sunsama and Akiflow instead sell a high-frequency individual planning workflow. ActivityWatch and Super Productivity preserve a complete local/open product and fund maintenance or optional services separately. **Inference:** the first viable EfficiencyMemo business experiment is supported distribution or voluntary support, not team surveillance or an account-dependent feature gate. [Clockify pricing](https://clockify.me/pricing), [Sunsama pricing manifesto](https://help.sunsama.com/docs/billing/pricing-manifesto/), [ActivityWatch support](https://activitywatch.net/subscribe/), [Super Productivity repository](https://github.com/super-productivity/super-productivity)

## Verified UI and interaction patterns

This table records only structures or color roles described in first-party documentation/source. It does not infer exact color values from screenshots.

| Product | Verified partitioning and interaction form | Verified color/identity role |
|---|---|---|
| Toggl Track | Desktop Timer and Calendar/Timeline surfaces support timer entry, activity review, calendar conversion, favorites, shortcuts, idle handling, and Pomodoro. [Desktop Timeline](https://support.toggl.com/the-timeline-feature), [Windows app](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/) | The cited docs do not specify a reusable color-token model; no exact palette claim is made. |
| Clockify | Timer, Timesheet, Calendar, Auto Tracker, Kiosk, and Reports are distinct entry modes; Calendar events expose direct start/copy/edit actions and deletion undo. [Help structure](https://clockify.me/help/), [calendar/mobile interaction](https://clockify.me/help/apps/android-app) | Project custom colors identify work in desktop/calendar contexts; current releases added a project color picker. [2026 changelog](https://clockify.me/help/whats-new) |
| RescueTime | The tray/menu-bar Assistant separates current mode, featured goal, chronological alert feed, Focus Sessions, offline work, and summary access. [Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant) | Goals, alerts, focus state, and feed entries are distinct semantic objects; official text does not define exact reusable hues. |
| Rize | The customizable sidebar is grouped by the workday sequence: Home, Track, Insights, Work, Admin; inaccessible and empty groups are hidden, and collapse preserves screen-reader labels. [Sidebar/navigation](https://docs.rize.io/getting-started/sidebar-navigation) | Workspace/team identity is kept subordinate to workflow grouping; the official source does not provide exact palette tokens. |
| Sunsama | A collapsible left navigation rail controls a central board/calendar; the right panel holds calendar, integrations, backlog, objectives, and search. Today and Focus progressively narrow the surface. [Workspace navigation](https://help.sunsama.com/docs/usage-guides/workspace-navigation/) | Imported tasks retain source-tool icons, and weekly objectives use an explicit bullseye identity. Source/meaning is not communicated by color alone. [Task sources](https://help.sunsama.com/docs/getting-started/basics/importing-and-creating-tasks/) |
| Akiflow | Inbox holds unplanned inputs; Today/calendar holds commitments; Time Slots group related work; rituals wrap planning/shutdown; mobile Daily Dashboard separates Live Activity from the Aki Feed. [Inbox](https://product.akiflow.com/help/articles/5284502-your-inbox), [Time Slots](https://product.akiflow.com/help/articles/3089241-time-slots), [Daily Dashboard](https://product.akiflow.com/en/help/articles/7855441-daily-dashboard) | Calendar accounts use colored-circle visibility controls, and project colors can be limited to calendar tasks/slots. [Calendar customization](https://product.akiflow.com/help/articles/0807758-customize-your-calendar) |
| Timely | A private Memory timeline supplies evidence for user-reviewed timesheets; team/project/budget surfaces operate on the confirmed result. [Automatic tracking](https://www.timely.com/feature/automatic-time-tracking/), [privacy roles](https://www.timely.com/privacy-at-timely/) | Privacy state is structural: private evidence and shared timesheet are different surfaces. No exact color system is claimed. |
| ActivityWatch | Modular watchers feed Timeline, categories, reports, Raw Data, and Query Explorer. New category sets, work-time report, timeline filters, saved queries, and privacy-filter editor keep capture, interpretation, and control separable. [Repository](https://github.com/ActivityWatch/activitywatch), [releases](https://github.com/ActivityWatch/activitywatch/releases) | Category sets and timeline groupings provide data-series identity; privacy controls remain explicit controls, not a decorative theme. |
| Super Productivity | Tasks/subtasks/projects/tags, planning/timeboxing, Focus, break/Pomodoro, summaries, integrations, and sync form separate but linked work stages. [Repository](https://github.com/super-productivity/super-productivity) | Projects and tags can be color-coded; themes are user-selectable, while break/focus tools retain their own icons and labels. |
| Evelyn TimeTracker | Timer, calendar, task log, planned/completed records, day/week/month review, category statistics, and tray are combined in one Windows utility. [Windows Readme](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/main/Windows/Readme.txt) | The author describes a glass-panel interface but publishes no design-token or accessibility contract; it is not evidence for exact colors. |
| PawPal | A transparent always-on-top character and speech/motion presentation sits apart from a settings window and tray; break, hydration, and focus nudges share the companion surface. [Repository](https://github.com/zebangeth/PawPal), [releases](https://github.com/zebangeth/PawPal/releases) | Multiple character appearances create identity through silhouette and motion, not only hue; source and animation assets have separate licensing. |

## Gap analysis versus current EfficiencyMemo

Every row below is explicitly an **Inference**, not proof of user demand.

| Rank | Inferred gap | Current evidence | Why the gap matters | Minimum proof before expansion |
|---|---|---|---|---|
| 1 | **Now is not yet a cross-module attention feed.** | Now exposes current focus, next plan, reminder/device status, and pending counts, but not one ordered list of actionable review, suggestion, recovery, or charging states. | Users should not inspect each module to discover pending work. RescueTime's [Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant) and Akiflow's [Daily Dashboard](https://product.akiflow.com/en/help/articles/7855441-daily-dashboard) demonstrate compact current/next/action forms. | Derive at most five local items, ordered by urgency; each item deep-links to its owning workflow; no permanent notification inbox. |
| 2 | **Charger Reminder computes attention but does not complete the native notification/action loop.** | Device state and estimated due information are visible; Pause & Hydrate and review reminders already own native notification bridges. | A due calculation that requires opening the app is not a reminder. | One native due notification per state transition, with snooze and “charged” actions routed through the existing device command path. |
| 3 | **Planning has no capacity guard.** | CoreHour stores plans, a daily target, and review adjustments, but does not warn when planned focus exceeds the target or available work window. | Sunsama's [daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/) makes overload visible before work begins; this is more actionable than discovering it in Insights. | Show planned minutes versus target and a configurable work window; suggest defer/skip, never auto-delete or auto-schedule. |
| 4 | **There is no cross-module Work Rhythm summary.** | Focus sessions, app suggestions, recovery/hydration events, plans, and review outcomes are stored locally but reported in separate modules. | A descriptive summary could expose focus/recovery balance and context-change patterns without the opaque scoring used by commercial trackers. ActivityWatch's [work-time report and category sets](https://github.com/ActivityWatch/activitywatch/releases) support local aggregation as a viable form. | Start with three descriptive facts and one comparison period; no moral score, diagnosis, or hosted model. |
| 5 | **Repeated plan structures must be recreated.** | CoreHour has favorite activities but no recurring plan or focus-block template. | Akiflow [Time Slots](https://product.akiflow.com/help/articles/3089241-time-slots) and Clockify's [timesheet templates](https://clockify.me/help/apps/android-app) show that repeatable containers reduce setup without requiring a full task manager. | Add a small local plan template copied on explicit action; recurrence comes only after repeated manual use is proven. |
| 6 | **Activity evidence review has no bounded batch/undo workflow.** | Explicit rules reduce repeated edits, but each accepted suggestion immediately becomes a confirmed session. | Clockify's [2026 desktop update](https://clockify.me/help/whats-new) emphasizes undo, while Timely keeps AI drafts private until review. A reversible review is the next trust improvement, not broader capture. | One recent-action undo or same-label batch acceptance with a preview; keep atomic validation and never auto-confirm. |
| 7 | **There is no external calendar context.** | Plans and actual sessions are local; no Google/Outlook/ICS read surface exists. | Calendar gaps are useful planning context across Toggl, Sunsama, Akiflow, RescueTime, and Rize. | Start with read-only local `.ics` import and explicit refresh. Do not add OAuth, write-back, or automatic conversion until demand is proven. |
| 8 | **There is no optional expressive companion layer.** | Current feedback uses standard desktop UI, notifications, and domain colors. | PawPal's [transparent always-on-top companion](https://github.com/zebangeth/PawPal) and Stretchly's [break presentation](https://github.com/hovancik/stretchly/blob/trunk/README.md) show a recognizable alternative, but it is taste-dependent and easy to overbuild. | Prototype with repo-owned static/motion-safe shapes, an off switch, and reduced-motion behavior. Ship only if reminders are noticed more without higher mute rates. |
| 9 | **There is no in-app command palette, local API, or AI agent.** | Visible navigation, tray actions, and global shortcuts cover the current command set. | Rize and Akiflow now expose agent/MCP surfaces, but those products already have much broader task/client domains. | Hold until command breadth or integration demand is measured; do not scaffold an API or agent in advance. |

## Ranked opportunity portfolio

| Priority | Opportunity | Product location | Value | Complexity | Privacy risk | Scope guard |
|---|---|---|---|---|---|---|
| **P0** | Cross-module Attention Feed | Now | High | Medium | Low: derived local states only | Maximum five items; source modules remain authoritative |
| **P0** | Actionable Charger Reminder notifications | Charger Reminder/desktop companion | High | Medium | Low: local device metadata | One transition-triggered notification; reuse existing notification and device command paths |
| **P1** | Daily capacity guard | CoreHour planning | High | Medium | Low: existing plan/goal data | Warning and explicit defer only; no auto-scheduler |
| **P1** | Work Rhythm summary | Insights/Review | High | Medium | Low to medium: locally aggregated app/session/reminder data | Three descriptive facts first; no score or diagnosis |
| **P1** | Explicit focus-block templates | CoreHour planning | Medium | Low to medium | Low | Copy on command before adding recurrence |
| **P2** | Activity evidence batch/undo | Activity Assist | Medium | Medium | Medium: touches retained app evidence | Preview, atomic validation, short undo window; never auto-confirm |
| **P2** | Read-only calendar bridge | CoreHour planning | High | High | Medium: calendar titles and times can be sensitive | Local ICS first; no write-back, OAuth, or cloud account |
| **P2** | Optional Companion presentation | Desktop companion | Medium | Medium | Low | Optional, accessible, reduced-motion, no licensed pet dependency |
| **P3** | Supporter/supported-distribution validation | Distribution | Medium | Medium | Low until hosted service exists | No core feature gate or account requirement |
| **Hold** | Command palette, local API, plugin system, AI/MCP | Platform | Unproven | High | High once external processes receive data | Do not scaffold before measured command/integration demand |

## Semantic color and interaction guidance

### Keep palette, meaning, and interaction independent

```text
Palette values (Ember / Grove / Tide / Clarity / Canopy)
    -> neutral + accent reference values
    -> action/state/domain semantic roles
    -> shared components
```

A palette changes visual character. It must not change what warning, success, planned, suggested, recovery, or hydration means. A component consumes a role and never branches on `data-palette`.

### Roles justified by current components

| Layer | Required roles | Use |
|---|---|---|
| Neutral | `canvas`, `surface`, `surface-strong`, `text`, `text-muted`, `border`, `control-border`, `disabled` | Hierarchy and readable structure; most of the interface remains neutral |
| Global action | `accent`, `on-accent`, `accent-hover`, `accent-pressed`, `accent-subtle`, `accent-subtle-border`, `focus-ring` | Primary commands and selected navigation, consistent across modules |
| Status triplets | `info/success/warning/danger` each with `text`, `container`, and `border` | Alerts and validation; replaces hardcoded Tailwind emerald/amber values |
| Domain triplets | `focus/planned/actual/suggested/recovery/hydration/privacy/device` each with `text`, `container`, and `border` where consumed | Small markers, timeline edges, icons, chart keys, and bounded callouts |
| Data | `chart-1` through `chart-6`, plus user-owned tag colors | Stable multi-series charts without borrowing action or status colors |

Do not create all possible token combinations upfront. Add the triplets needed by current alerts, timelines, Now items, charts, and Charger states; add another only when a real component consumes it.

### Interaction state contract

| State | Visual response | Non-color response |
|---|---|---|
| Rest | Stable role color and border | Label/icon communicates command |
| Hover | Small background or border shift, never layout movement | Native pointer cursor and tooltip for unfamiliar icon-only commands |
| Pressed | Darker/stronger fill and subtle scale only when motion is allowed | Immediate command feedback |
| Selected | Subtle container plus strong edge/icon/text | `aria-current`, checked state, or visible marker |
| Focused | Dedicated high-contrast ring independent of accent fill | Keyboard order and visible label |
| Disabled | Neutral disabled text/container, not opacity alone | Native `disabled` and reason where non-obvious |
| Loading | Preserve command label and stable dimensions | Spinner plus `aria-busy`; disable only conflicting actions |
| Success/error | Semantic container, border, icon, and text | Explicit result and recovery action |

### Module differentiation

Use color as a locator, not a page wash:

| Module/meaning | Color placement | Persistent non-color cue |
|---|---|---|
| CoreHour focus | timer accent, active edge, leading chart series | clock/play icon and Running/Paused text |
| Planned / actual / suggested | timeline edge and legend | dashed / solid / dotted edge plus explicit label |
| Recovery / hydration | reminder marker and history icon | movement / droplet icon and text |
| Charger Reminder | battery/device marker and due state | battery icon, due label, and state-specific action |
| Privacy/data | collection/backup marker | shield/database icon and scope text |

Primary buttons remain the global palette accent. A hydration button should not automatically become blue, and a destructive action should never borrow a module color.

### Palette roadmap

Keep Ember, Grove, Tide, Clarity, and Canopy as the shipping set. They cover warm, expressive, cool, enhanced-contrast, and evergreen preferences while preserving the same semantic meanings. Canopy uses coral only for recovery, so it does not create a second primary-action color. The next UI work is to consume module markers, status containers, data series, and interaction reactions consistently rather than tinting whole pages.

All ten palette/mode combinations still require ongoing keyboard, forced-colors, reduced-motion, and chart validation. A sixth palette, arbitrary color picker, and theme marketplace remain unjustified until users demonstrate that the five curated choices do not cover the need.

## Phased roadmap

### Delivered foundation and remaining Phase 0 validation

At the `417cdb3` baseline, the repository has delivered five curated palettes, core semantic module/status/interaction roles, reusable explicit Activity Assist app rules, guided daily and weekly reviews, and optional review reminders that respect quiet hours, active focus, and supported system interruption state. The Phase 1 and Phase 2 workflows are shipped; Phase 0 remains an audit-and-completion phase rather than a new theme phase.

Remaining validation:

- dogfood whether rules reduce repeated edits and whether reviews change later targets;
- visually audit every current palette in both modes, including keyboard focus, reduced motion, and forced colors;
- fix defects in the shipped flows before broadening their models.

### Phase 3: cross-module attention and reminder completion

Deliver:

- Now attention feed with no more than five actionable items;
- deep links to daily/weekly review, Activity Assist, Pause & Hydrate, and Charger owning surfaces;
- native Charger due notification with snooze and charged actions;
- stale-data-safe error and retry behavior per section.

Exit evidence:

- every attention item has one owner, one state, and one next action;
- no duplicate command path mutates the same record;
- dismiss/snooze behavior is preserved across restart.

### Phase 4: feasible planning and Work Rhythm

Deliver:

- planned-focus capacity bar against daily target and configurable work window;
- explicit defer/skip actions when overloaded;
- local focus-block templates copied on demand;
- Work Rhythm summary with focus/recovery coverage, plan accuracy, and bounded context-change facts;
- the adjustment saved in review remains visible when planning the next period.

Exit/stop evidence:

- overload feedback changes at least one plan before a session starts;
- templates are reused enough to justify optional recurrence;
- summary facts produce a planning adjustment; stop if they become passive analytics;
- no productivity score, diagnosis, or content-level activity collection appears.

### Phase 5: optional new product forms

Run separately measurable experiments:

1. **Activity evidence undo/batch:** one bounded undo or previewed same-label batch action that preserves explicit confirmation.
2. **Local calendar bridge:** read-only `.ics` import, meeting overlays, and explicit event-to-plan copying.
3. **Companion presentation:** optional repo-owned motion/character layer for recovery and hydration prompts, disabled by default and reduced-motion safe.

Do not combine these experiments into one release. Each must be removable without migrating confirmed session, plan, reminder, or device data.

### Phase 6: sustainability validation

Only after repeat weekly use and support demand are demonstrated:

- publish a supporter option that unlocks no core feature;
- test whether users value a signed, automatically updated, supported distribution;
- investigate hosted encrypted backup/sync only as a separately threat-modeled service;
- keep WebDAV, local backup/restore, export, deletion, and offline use independent of payment.

Exit/stop evidence:

- recurring support or paid-distribution demand covers its operational cost without feature captivity;
- stop before account infrastructure if users do not request a maintained service strongly enough to justify it;
- reject any model that depends on ads, activity-data resale, manager surveillance, or locking users out of their own history.

## Deliberate non-goals

- Employee monitoring, screenshots, keystrokes, document contents, window titles, or URLs.
- Clients, invoices, profitability, seat billing, approvals, or manager dashboards.
- A general task manager, notes workspace, issue-provider hub, or AI auto-scheduler.
- Website/app blocking or coercive breaks as a default behavior.
- Automatic Activity Suggestion confirmation.
- Cloud AI summaries of raw activity.
- A theme marketplace, arbitrary theme editor, or palette-specific component forks.

## Access and evidence limitations

- Rize's 2026 marketing language can imply “zero review,” while its current documentation explicitly describes pending suggestions and approval/correction. This review treats the documented workflow as authoritative and does not repeat the stronger marketing claim.
- Commercial UI documentation often includes screenshots but does not publish design tokens. This review records stated structures and color roles only; it does not sample or infer exact color values.
- Clockify, Sunsama, and Akiflow capabilities vary by client, plan, and integration. A documented interaction is not treated as cross-platform parity unless the source says so.
- Timely's official privacy pages describe page/app titles and timestamps but distinguish them from file contents and from the user-approved timesheet. EfficiencyMemo should not treat that hosted boundary as equivalent to local app-name-only capture.
- Evelyn TimeTracker's root `README.md` contains only a newline; the useful first-party description is `Windows/Readme.txt`. Its repository also contains build output and the author warns source behavior may vary by computer.
- PawPal explicitly states that distraction detection is unavailable on Windows; no cross-platform parity is inferred.
- Stretchly explicitly documents Wayland idle-detection limits; no Linux parity is inferred.
- Commercial plan availability and pricing can change. This report uses product behaviors, not entitlement or price, as design evidence.
- This was a source/code review, not a usability study. Every gap and priority remains a product hypothesis until dogfood or user evidence confirms it.
