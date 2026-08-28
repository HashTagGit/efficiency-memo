# EfficiencyMemo product and UI landscape, 2026

Research date: 2026-08-28

## Method and evidence labels

This review uses first-party product documentation, official repositories, official release notes, and the current EfficiencyMemo source tree. It does not treat marketing comparisons, community posts, or repository popularity as proof of product quality.

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

The repository already implements most of the foundation that earlier competitor reviews recommended: four curated palettes with independent light/dark/system modes; semantic focus, plan, actual, suggestion, recovery, hydration, privacy, and status colors; a Now surface; CoreHour plan-versus-actual and Insights; explicit Activity Assist review; mature Pause & Hydrate deferral; tray commands; local backup/restore/reset; and Chinese/English UI. The next release should deepen feedback and review instead of adding another timer or another top-level dashboard.

Immediate priorities:

1. Complete interaction-state and semantic-container tokens before adding another decorative palette.
2. Teach Activity Assist reusable local app-to-activity/tag rules from explicit corrections.
3. Add a guided end-of-day and weekly review that turns existing data into the next concrete decision.
4. Make the Now surface a cross-module attention feed, including actionable Charger Reminder due states.
5. Treat external calendar import and an optional companion presentation as later experiments with explicit stop conditions.

## Current EfficiencyMemo baseline

The following is **Current**, based on the repository at `c54ae6f`:

| Area | Current capability | Evidence |
|---|---|---|
| Appearance | Ember, Grove, Tide, and enhanced-contrast Clarity; independent System/Light/Dark; persistent preview controls | [`appearance.tsx`](../../apps/desktop/src/lib/appearance.tsx), [`index.css`](../../apps/desktop/src/index.css), [`settings/page.tsx`](../../apps/desktop/src/pages/settings/page.tsx) |
| Color semantics | Focus, planned, actual, suggested, recovery, hydration, privacy, success, warning, danger, info, control-border, and focus-ring roles | [`index.css`](../../apps/desktop/src/index.css) |
| CoreHour | Today timer, check-ins, manual correction, favorites, plans, day/week Timeline, plan-versus-actual, uncertain-time review, goals, Insights, tags, and Activity Assist | [`core-hour`](../../apps/desktop/src/features/core-hour), [`ROADMAP.md`](../ROADMAP.md) |
| Activity Assist | Off by default; foreground executable only; pause, exclusions, short retention, raw inspection/deletion; stable suggestions; edit, dismiss, and atomic explicit acceptance into Actual Sessions | [`activity_assist.rs`](../../apps/desktop/src-tauri/src/activity_assist.rs), [`activity-assist-page.tsx`](../../apps/desktop/src/features/activity-assist/activity-assist-page.tsx) |
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
| **RescueTime**: [Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant), [goals and alerts](https://help.rescuetime.com/article/42-using-goals-and-alerts-to-keep-track-of-your-behavior), [Focus Sessions](https://help.rescuetime.com/article/297-how-to-start-a-focus-session), [Focus Zones](https://help.rescuetime.com/article/364-focus-zones) | **Verified:** the tray/menu-bar Assistant combines current mode, one featured daily goal, a chronological actionable alert feed, Focus Sessions, offline activity, focus opportunities, and end-of-day/weekly summaries. Goals and alerts are separate: one tracks progress, the other fires at a threshold. | A compact operational surface should answer “what is happening, what needs attention, and what is the next action?” A bounded review can turn trends into one adjustment. | No website/app blocking, cloud classification, opaque productivity score, or behavior-changing alert without user control. |
| **Rize**: [current documentation](https://docs.rize.io/), [tracking overview](https://docs.rize.io/automatic-tracking/tracking-overview), [first-time setup](https://docs.rize.io/getting-started/first-time-setup), [sidebar/navigation](https://docs.rize.io/getting-started/sidebar-navigation), [reports](https://docs.rize.io/ai/reports) | **Verified:** 2026 Rize creates live calendar activity, turns context changes into reviewable suggestions, proposes descriptions/tags, learns through rules and corrections, exposes configurable privacy/retention, and organizes navigation by daily workflow. It also now serves teams, clients, profitability, invoices, reports, and agent/MCP workflows. | Corrections should become durable local rules; pending work should be visible in its timeline context; navigation should follow the user's work sequence. | Rize captures window titles and URLs and has moved toward agency operations. EfficiencyMemo should not widen collection or import its client/team/account model. |
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
| RescueTime's free Lite tier plus individual/team subscriptions ([pricing](https://www.rescuetime.com/pricing)) | Longer history, focus intervention, detailed reporting, and automated timesheets | Shows that an individual focus product can support recurring revenue, but its cloud tracking and feature gates conflict with the local-first core. |
| Rize's individual/team subscriptions with AI-credit tiers ([pricing](https://rize.io/pricing)) | Hosted automatic classification, reports, agents, integrations, and team operations | A service-cost model for cloud AI and agency workflows; not a reason to send EfficiencyMemo activity data to a hosted model. |
| ActivityWatch's all-features-open supporter subscription ([support](https://activitywatch.net/subscribe/)) | Ongoing maintenance of a local, no-account, no-cloud open-source product; subscribing unlocks nothing | The closest trust fit: ask committed users to fund maintenance without weakening the free local product. |
| Stretchly's sponsorship/contributor benefits ([sponsor](https://hovancik.net/stretchly/sponsor/)) | Maintenance plus contributor preferences, preference sync, and community access | Demonstrates optional convenience/community benefits, but privacy controls and data portability should never become rewards. |

**Recommendation:** validate repeat use before adding billing. The lowest-risk sequence is (1) voluntary supporter funding, (2) an optional paid signed/supported distribution if release maintenance creates real value, and only then (3) an optional hosted encrypted backup/sync service with a published threat model. Local timers, plans, reviews, reminders, history, export, restore, deletion, and privacy controls remain complete without payment or an account. Do not build a checkout, entitlement system, or cloud account in anticipation of demand.

## What the landscape actually says

### 1. The winning shape is a review loop, not more passive charts

Toggl, Rize, and ActivityWatch approach capture differently, but all expose the evidence for later inspection. RescueTime and Rize then turn accumulated evidence into a daily or weekly decision surface. **Recommendation:** EfficiencyMemo should use its already-confirmed plans, sessions, suggestions, reminder events, and device states to guide one next decision, not add another analytics dashboard.

### 2. Automation earns trust through correction and boundaries

Rize makes suggestion review and correction part of setup; ActivityWatch exposes raw events and privacy filters; Toggl keeps Timeline activity separate from time entries. EfficiencyMemo already has the correct trust boundary: suggestions are unconfirmed and acceptance uses the validated manual-session transaction. **Recommendation:** the next automation step is a local app-to-activity/tag rule learned only from explicit acceptance, with clear rule inspection and deletion.

### 3. Desktop products win outside the main window

Toggl, RescueTime, Stretchly, and PawPal all use the tray, menu bar, notifications, overlays, or shortcuts as primary operating surfaces. EfficiencyMemo has tray actions and native notifications, so the missing value is coordination: one attention feed that prioritizes the next relevant action across focus, plans, recovery, hydration, Activity Assist, and charging.

### 4. Color works when it encodes role and state

Rize uses a narrow edge to identify team ownership; Stretchly differentiates short and long recovery modes; Super Productivity uses project/tag color; mature design systems map raw values to semantic roles. Material pairs colors with corresponding content/container roles, Fluent separates neutral, brand/shared, and semantic roles, and WCAG requires non-color cues and contrast for text and meaningful UI boundaries. [Material Web color](https://github.com/material-components/material-web/blob/main/docs/theming/color.md), [Fluent color](https://fluent2.microsoft.design/color), [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color), [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

## Gap analysis versus current EfficiencyMemo

Every row below is explicitly an **Inference**, not proof of user demand.

| Rank | Inferred gap | Current evidence | Why the gap matters | Minimum proof before expansion |
|---|---|---|---|---|
| 1 | **Activity Assist has no reusable categorization rule or correction memory.** | Suggestions contain app ID and editable activity/tag, but exclusions are the only durable app-level rule. | Re-entering the same label makes assisted capture less valuable than manual capture. Rize demonstrates correction-to-rule learning, while ActivityWatch demonstrates user-owned categories. | Add explicit “remember for this app” on acceptance, a rule list, override/edit/delete, and deterministic local application. Measure repeat edit reduction. |
| 2 | **There is no guided daily or weekly review.** | CoreHour has goals and Insights, but no bounded closeout flow that asks the user to resolve suggestions, compare plan/actual, note one outcome, and adjust capacity. | Charts answer what happened; a review closes the behavioral loop. RescueTime and Rize both surface scheduled summaries. | One five-step local review using existing data; completion is optional; store only decisions that feed the next plan. |
| 3 | **Now is not yet a cross-module attention feed.** | Now shows current focus, next plan, reminder status, device attention, and tool navigation, but there is no ordered feed of pending suggestions, overdue recovery, charging due, or unresolved time with one action each. | Users should not inspect each module to find work requiring attention. RescueTime's Assistant demonstrates the compact action-oriented form. | Derive at most five local items, ordered by urgency; each item deep-links to the owning workflow; no permanent notification inbox. |
| 4 | **Charger Reminder computes attention but does not complete the native notification/action loop.** | Device state and estimated due information are visible; other reminder modules own native actionable notification flows. | A due calculation that requires opening the app is not a reminder. | One native due notification per state transition, with snooze and “charged” actions routed through the existing device command path. |
| 5 | **Interaction semantics are thinner than the palette catalog.** | Four palettes and domain foreground roles exist, but shared `Alert` still hardcodes emerald/amber utilities; Button hover reuses a single stronger accent; pressed/selected/disabled/container/border roles are mostly opacity or component-local behavior. | More palette choices would multiply inconsistency. Users need predictable action hierarchy and reaction states before another skin. | Add only consumed semantic triplets and interaction roles; replace hardcoded colors; verify all eight mode/palette combinations with keyboard and forced-colors checks. |
| 6 | **There is no external calendar context.** | Plans and actual sessions are local; no Google/Outlook/ICS read surface exists. | Calendar gaps are useful context for focus planning, as Toggl, RescueTime, and Rize demonstrate. | Start with read-only local `.ics` import and explicit refresh. Do not add OAuth, write-back, or automatic conversion until demand is proven. |
| 7 | **There is no in-app command palette.** | Sidebar, module tabs, tray actions, and two global shortcuts cover current frequent commands. | A palette becomes useful only when cross-module commands materially outgrow visible navigation. | Instrument or dogfood navigation friction first. Add only if users repeatedly search for commands or shortcut discoverability becomes a real problem. |
| 8 | **There is no optional expressive companion layer.** | Current feedback uses standard desktop UI, notifications, and domain colors. | PawPal and Stretchly show that motion/personality can improve recognition, but this is taste-dependent and easy to overbuild. | Prototype with repo-owned static/motion-safe shapes, an off switch, and reduced-motion behavior. Ship only if reminders are noticed more without higher mute rates. |

## Ranked opportunity portfolio

| Priority | Opportunity | Product location | Expected value | Scope guard |
|---|---|---|---|---|
| **P0** | Semantic interaction-state completion | Shared UI and tokens | Makes every existing workflow clearer; unblocks consistent color expansion | No arbitrary new component variants; roles are added only when consumed |
| **P0** | Activity Assist “remember this app” rules | CoreHour Assist | Reduces repetitive review while preserving explicit confirmation | Exact app identifier only; no title/URL/content; no auto-confirm |
| **P0** | Guided Day Closeout and Weekly Reset | CoreHour/Now | Converts existing data into plan adjustment and unresolved-item cleanup | Not a journal, habit tracker, or AI narrative |
| **P1** | Cross-module Attention Feed | Now | One place for pending suggestions, uncertain time, reminders, and device due actions | Maximum five items; source modules remain authoritative |
| **P1** | Actionable Charger Reminder notifications | Charger Reminder/desktop companion | Completes the promised reminder loop | One transition-triggered notification; no polling UI duplicate |
| **P1** | Work Rhythm summary | Insights | Shows focus/recovery balance and interruption patterns without a score | Descriptive facts only; no moral “productivity” grade |
| **P2** | Read-only calendar bridge | CoreHour planning | Adds meeting/gap context without becoming a calendar service | Local ICS first; no write-back or cloud account |
| **P2** | Optional Companion presentation | Desktop companion | Differentiated, memorable reminder form | Optional, accessible, reduced-motion, no licensed pet dependency |
| **Hold** | Command palette/local API/plugin system | Platform | Useful only after command/integration breadth grows | Do not scaffold in advance |

## Semantic color and interaction guidance

### Keep palette, meaning, and interaction independent

```text
Palette values (Ember / Grove / Tide / Clarity)
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

Keep Ember, Grove, Tide, and Clarity as the shipping set. They already cover warm, expressive, cool, and enhanced-contrast preferences. More usable color should first come from semantic containers, module markers, charts, and interaction reactions.

Only after that audit should a fifth palette be tested. The clearest missing visual character is a **coral + evergreen** candidate: warmer and more social than Tide/Clarity, less amber than Ember, and not another purple variant beside Grove. It must supply the complete semantic bundle for both modes and pass the same contrast and state audit before becoming selectable. Do not add arbitrary color pickers or a theme marketplace.

## Phased roadmap

### Phase 0: semantic UI completion

Deliver:

- replace hardcoded shared Alert colors with semantic status triplets;
- add consumed hover/pressed/selected/disabled roles;
- add `device` and chart-series roles where current Charger/Insights surfaces need them;
- standardize button, tab, input, alert, timeline, and Now-item states;
- audit light/dark for Ember, Grove, Tide, and Clarity with keyboard focus, reduced motion, and forced colors.

Exit evidence:

- no shared primitive hardcodes a product/status hue;
- selected, focused, disabled, loading, success, and error remain distinguishable without color alone;
- every palette preview renders the same semantic structure.

### Phase 1: assisted capture that gets cheaper to review

Deliver:

- optional “remember this activity and tag for this app” during suggestion acceptance;
- deterministic local rule application and a small inspect/edit/delete rule list;
- suggestion grouping details sufficient to explain why a suggestion exists;
- review-queue count on Now.

Exit/stop evidence:

- repeated apps require fewer edits after rules are created;
- rules never create Actual Sessions without acceptance;
- stop if useful categorization requires window titles, URLs, content, screenshots, or cloud inference.

### Phase 2: guided review and adjustment

Deliver:

- end-of-day closeout: resolve pending suggestions/uncertain time, compare plan and actual, review recovery/hydration facts, record one outcome, choose one next adjustment;
- weekly reset: planned versus actual capacity, longest focus blocks, interruptions, recovery coverage, device attention, and next-week target adjustment;
- optional reminder to review, respecting quiet hours and DND.

Exit/stop evidence:

- users complete or intentionally dismiss the flow on multiple weeks;
- a recorded adjustment changes a later plan/goal;
- stop if it becomes a passive report that users open but never act on.

### Phase 3: cross-module attention and reminder completion

Deliver:

- Now attention feed with no more than five actionable items;
- deep links to the owning correction/action surface;
- native Charger due notification with snooze and charged actions;
- stale-data-safe error and retry behavior per section.

Exit evidence:

- every attention item has one owner, one state, and one next action;
- no duplicate command path mutates the same record;
- dismiss/snooze behavior is preserved across restart.

### Phase 4: optional new product forms

Run separately measurable experiments:

1. **Local calendar bridge:** read-only `.ics` import, meeting overlays, and explicit event-to-plan copying.
2. **Companion presentation:** optional repo-owned motion/character layer for recovery and hydration prompts, disabled by default and reduced-motion safe.
3. **Coral/evergreen palette candidate:** only after Phase 0's complete role/state matrix is reusable.

Do not combine these experiments into one release. Each must be removable without migrating confirmed session, plan, reminder, or device data.

### Phase 5: sustainability validation

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
- Evelyn TimeTracker's root `README.md` contains only a newline; the useful first-party description is `Windows/Readme.txt`. Its repository also contains build output and the author warns source behavior may vary by computer.
- PawPal explicitly states that distraction detection is unavailable on Windows; no cross-platform parity is inferred.
- Stretchly explicitly documents Wayland idle-detection limits; no Linux parity is inferred.
- Commercial plan availability and pricing can change. This report uses product behaviors, not entitlement or price, as design evidence.
- This was a source/code review, not a usability study. Every gap and priority remains a product hypothesis until dogfood or user evidence confirms it.
