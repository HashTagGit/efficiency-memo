# Local-first productivity UI and product strategy

Research date: 2026-08-28
Scope: EfficiencyMemo desktop UI color/theme strategy and forward-looking product-experience gaps.

## Executive decision

EfficiencyMemo already has the right product boundary: a local-first personal work-rhythm suite, not a smaller team time tracker. The next UI work should deepen that boundary rather than add more top-level tools.

Priorities:

1. **Finish the state system, not another visual refresh.** Loading, empty, unavailable, error, and retry behavior should be consistent across CoreHour, Pause & Hydrate, settings, and data controls.
2. **Keep one semantic design system across four curated palettes.** Palette choice may change accent and neutral temperature; it must not change what success, warning, danger, planned, actual, recovery, or hydration mean.
3. **Make launch actionable.** Replace the extra tool-gallery decision with either the last-used workspace or a small `Now` surface containing current focus, the next planned block, and upcoming reminders.
4. **Complete platform parity before adding more automation.** Linux Natural Rest needs an honest supported/degraded/unavailable state.
5. **Keep Local Activity Assist opt-in and proposal-only.** App-name-only collection, visible pause/exclusions/retention/delete controls, and an explicit review queue must precede any automatic suggestion.

Do not add a theme marketplace, arbitrary application accent colors, a general task manager, employee monitoring, screenshots, website blocking, or a command-palette framework at the current product scale.

## Method and evidence boundary

This report uses first-party product manuals, official design-system documentation, standards, and official open-source repositories. Product observations below are source facts. EfficiencyMemo recommendations are inferences from those facts and the repository inspected on 2026-08-28.

The current product baseline is materially ahead of earlier research:

- `apps/desktop/src/lib/appearance.tsx` separates System/Light/Dark from four shipped curated palettes: Ember, Grove, Tide, and the enhanced-contrast Clarity option.
- `apps/desktop/src/index.css` has shared surface, status, and domain roles for focus, planned, actual, recovery, hydration, privacy, and suggestions.
- CoreHour already has live/manual capture, recent/favorite activities, check-ins, day/week plan-versus-actual, direct plan editing, uncertain-time review, goals, and Insights.
- Pause & Hydrate already has schedules, work/quiet hours, native notifications, focus deferral, natural-rest handling on Windows/macOS, and Windows interruption deferral.
- The app already has tray status/actions, two global shortcuts, a Data & Privacy Center, portable backup/restore, exports, and scoped reset.

Accordingly, mature-product features are evidence for interaction quality and boundaries here, not a checklist to clone.

## What mature products demonstrate

| Source observation | Transferable pattern | Boundary for EfficiencyMemo |
|---|---|---|
| Material assigns primary, secondary, surface, error, container, and corresponding `on-*` colors by role rather than raw value. [Material Web color](https://github.com/material-components/material-web/blob/main/docs/theming/color.md) | Components consume semantic role pairs with known contrast. | Do not let a component choose a palette hex or assume white text on an accent. |
| Fluent separates neutral, shared, brand, and semantic colors; it uses neutrals for hierarchy, shared colors sparingly, and semantic colors only for meaning. [Fluent color](https://fluent2.microsoft.design/color) | Quiet surfaces establish hierarchy; saturated color marks action, category, or state. | Do not tint whole modules or every card to differentiate tools. |
| Atlassian defines a theme as a collection of token values and says tokens should be selected by meaning, not because a value happens to look right. [Atlassian tokens](https://atlassian.design/foundations/tokens/design-tokens/) | A palette is a token mapping, not a parallel component theme. | No per-palette component variants or scattered palette conditionals. |
| Toggl makes starting, continuing, stopping, and manually correcting time direct; its desktop app also exposes idle choices and global shortcuts. [Creating a time entry](https://support.toggl.com/en-us/article/creating-a-time-entry-wg8nug/) [Toggl desktop for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/) | Repeated commands stay one action away and uncertain time is resolved explicitly. | EfficiencyMemo has these foundations; improve discoverability and failure states before adding more commands. |
| RescueTime's tray/menu-bar Assistant shows current mode, daily goal, time-sensitive alerts, and Focus Session controls; its post-session summary asks about the outcome. [RescueTime Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant) [Focus Sessions](https://help.rescuetime.com/article/297-how-to-start-a-focus-session) | A compact operational surface answers "what is happening now?" and offers the next relevant action. | Do not import activity scoring, blocking, or cloud-account assumptions. |
| ActivityWatch separates local watchers, storage, overview/timeline/category views, pause controls, and export. It also documents that titles/URLs are sensitive and filtering cannot be perfect. [Introduction](https://docs.activitywatch.net/en/latest/introduction.html) [Watchers](https://docs.activitywatch.net/en/latest/watchers.html) [Pausing](https://docs.activitywatch.net/en/latest/features/pausing-logging.html) [Filtering](https://docs.activitywatch.net/en/latest/features/filtering-data.html) | Collection must be visible, pausable, inspectable, bounded, exportable, and deletable. | App name only; no titles, URLs, content, screenshots, or silent collection. |
| Super Productivity combines local/no-account work, timeboxing, tracking, focus/break workflows, keyboard navigation, export, and optional sync. [Official repository](https://github.com/super-productivity/super-productivity) | A keyboard path can complement visible controls across a daily work surface. | Its task/project/integration breadth is evidence of complexity to avoid, not scope to copy. |
| Stretchly is tray-first and distinguishes mini/long breaks through timing, labels, controls, and color; it pauses for idle and DND and documents Linux/Wayland constraints. [Stretchly README](https://github.com/hovancik/stretchly/blob/trunk/README.md) | Background utilities need visible status, respectful deferral, and explicit platform limitations. | Do not claim feature parity where an OS adapter is unavailable. |

## Semantic color strategy

### Recommended token contract

Keep the existing CSS-variable approach. No theme package or runtime color generator is needed.

```text
Reference values
  palette-neutral-*  palette-accent-*  palette-domain-*
          |
System roles
  canvas  surface  surface-strong  text  text-muted
  border  control-border  focus-ring
  accent  on-accent  accent-subtle
          |
Meaning roles
  info/success/warning/danger: text + container + border
  focus/planned/actual/suggested/recovery/hydration/privacy
  chart-1 ... chart-5; user tag colors remain user-owned
          |
Components
  button  tab  alert  input  timeline  chart
```

Material's paired container/content roles and Fluent's global-to-alias token layers support this separation. [Material Web color](https://github.com/material-components/material-web/blob/main/docs/theming/color.md) [Fluent design tokens](https://fluent2.microsoft.design/design-tokens)

Add a role only when a current component consumes it. The immediate justified additions are `control-border`, `focus-ring`, semantic container/border pairs, and chart series roles. Current controls often reuse the general border and accent; those values cannot guarantee visible boundaries and focus across every palette. WCAG requires color-independent cues, adequate text contrast, and sufficient contrast for meaningful component boundaries and focus indicators. [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) [Focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

### Multiple palettes without fragmentation

1. Keep mode and palette independent: `data-theme="light|dark"` and `data-palette="ember|grove|tide|clarity"`.
2. A palette supplies a complete, reviewed role bundle; components never branch on palette name.
3. Status meanings remain global. Values may shift for contrast in dark/light modes, but danger never becomes decorative and warning never means a module.
4. Domain meanings remain stable. `planned` is intention, `actual` is confirmed time, and `suggested` is unconfirmed automation in every palette.
5. Keep settings preview swatches on the same scoped token bundle used by the app; do not reintroduce a second hex map in component code.
6. Treat Clarity as enhanced contrast, not a fourth decorative skin. Complete the remaining component, chart, focus, disabled, and forced-colors audit before calling it an accessibility mode.
7. Keep arbitrary colors only for user-authored tags. Validate contrast and always pair tag color with text or another cue.

### Module differentiation

Use domain color as a small locator, not a page theme:

| Domain | Color use | Required non-color cue |
|---|---|---|
| CoreHour focus | active indicator, timer emphasis, primary chart series | clock/play icon and explicit running/paused text |
| Planned time | timeline blocks and plan metrics | dashed edge and `Planned` label |
| Actual time | confirmed sessions and actual metrics | solid edge and `Actual` label |
| Suggested activity | review queue and unconfirmed timeline overlay | dotted edge, pending icon, explicit accept/dismiss actions |
| Recovery | movement reminder and history marker | movement/rest icon |
| Hydration | hydration reminder and history marker | droplet icon |
| Privacy/data | collection state, backup/export, local-only notice | shield/database icon |

Primary commands still use the selected accessible accent. A hydration action does not become blue merely because it concerns water. Fluent similarly warns that product/brand color should anchor an experience without taking over large surfaces. [Fluent color](https://fluent2.microsoft.design/color)

## Information hierarchy and command model

The existing two-level structure is sound:

- Sidebar: modules and application settings.
- Module navigation: a small set of sibling views such as Today, Timeline, Insights, Tags, and Settings.
- Persistent operational state: active CoreHour session and due/deferred reminders.
- Tray: frequent commands and status while the window is hidden.

Fluent's navigation guidance reserves navigation for high-level destinations and tabs for a small set of related views. [Fluent Nav](https://fluent2.microsoft.design/components/web/react/core/nav/usage) [Fluent Tablist](https://fluent2.microsoft.design/components/web/react/core/tablist/usage)

Recommended changes:

1. Open the last-used module by default, or turn `/dashboard` into a compact `Now` surface. The current tool-card gallery adds a click without answering what needs attention.
2. Keep the `Now` surface operational: current focus, next plan, next movement/hydration reminder, and one relevant action. Do not add another analytics dashboard.
3. Keep active session state visible across CoreHour views and in the tray. Preserve the current single authoritative command path.
4. Keep the two documented global shortcuts. Add a command palette only when the number of cross-module commands makes visible navigation measurably slower.
5. Keep shortcuts discoverable beside the corresponding settings or commands; shortcuts augment, not replace, buttons and native controls.
6. Preserve view and date/range selection in URLs or local preference where returning to the same review context is valuable. RescueTime similarly persists report context across its report views. [RescueTime navigation](https://help.rescuetime.com/article/455-navigating-the-rescuetime-website)

## View-state contract

The shared `EmptyState` is currently used only by the tool gallery; several product views use plain muted text for loading/empty data, and some asynchronous review surfaces have no visible error/retry state. Standardize behavior before adding more feature UI.

Atlassian distinguishes an empty first-use/blank-slate condition from cleared or completed states, and recommends explaining both the reason and next action. Its error guidance calls for what happened, the consequence, and the way forward. [Empty-state guidance](https://atlassian.design/foundations/content/designing-messages/empty-state) [Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)

| State | Required behavior | Example |
|---|---|---|
| Initial loading under about 1 second | Keep layout stable; no indicator needed. | Local settings read. |
| Longer indeterminate loading | Labeled spinner in the affected section; `aria-live="polite"`. Do not block unrelated sections. | Loading Timeline data. |
| Known final structure | Minimal skeleton matching stable rows/chart frame; respect reduced motion. | Insights while range changes. |
| First-use blank slate | Short title, one-sentence reason, one primary next action. | `Create first planned block`. |
| No results for filter/range | Preserve filters; offer clear/reset, not creation copy. | No sessions in selected week. |
| Completed/cleared | Confirm the successful state; action optional. | No uncertain intervals to review. |
| Recoverable section error | Keep stale data when safe; inline error at the affected section with `Retry`. | Insights refresh failed. |
| Blocking operation error | State what failed, whether data changed, and the safe next action. | Restore validation failed; current data unchanged. |
| Capability unavailable | Explain platform/support state and keep unrelated controls usable. | Linux Natural Rest adapter unavailable. |
| Save in progress | Disable only conflicting actions; keep entered values; show progress on the command. | Saving a reminder schedule. |

Fluent recommends no indicator for very short waits, a spinner for short indeterminate waits, determinate progress when measurable, and skeletons only when the final structure is known. [Fluent Wait UX](https://fluent2.microsoft.design/wait-ux) [Spinner](https://fluent2.microsoft.design/components/web/react/core/spinner/usage) [Skeleton](https://fluent2.microsoft.design/components/web/react/core/skeleton/usage)

## Prioritized product-experience gaps

| Priority | Gap | Minimum useful slice | Evidence and rationale |
|---|---|---|---|
| P0 | Inconsistent loading/empty/error/retry states | One shared state contract applied first to CoreHour Today/Timeline/Insights and Pause & Hydrate; section-level retry; preserve safe stale data | Current UI has the primitives but inconsistent consumption. Atlassian/Fluent guidance above makes this a contained, high-frequency quality improvement. |
| P0 | Palette verification and missing interaction roles | Add only consumed boundary/focus/container/chart roles; automated contrast matrix plus keyboard/forced-colors visual QA | Palette previews now consume runtime theme roles; Material, Fluent, Atlassian, and WCAG support completing the remaining semantic mapping. |
| P0 | Actionable launch context | Last-used workspace or compact `Now` view with current focus, next plan, next reminders, and one action | Toggl's timer entry point and RescueTime's Assistant prioritize the active workflow instead of a product gallery. [Toggl time entry](https://support.toggl.com/en-us/article/creating-a-time-entry-wg8nug/) [RescueTime Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant) |
| P1 | Linux Natural Rest parity | Reliable adapter where supported; explicit degraded/unavailable state by environment; never fake completion from missing signals | Stretchly documents Wayland-specific idle requirements, while ActivityWatch documents X11/Wayland watcher differences. [Stretchly](https://github.com/hovancik/stretchly/blob/trunk/README.md) [ActivityWatch watchers](https://docs.activitywatch.net/en/latest/watchers.html) |
| P1 | Local Activity Assist review loop | Off by default; app name and idle only; visible on/off state; pause, exclusions, short retention, inspect, delete; suggestions remain dotted/pending until accepted | ActivityWatch demonstrates local watcher separation and warns that sensitive filtering is imperfect. Confirmed session data must remain authoritative. [ActivityWatch privacy](https://docs.activitywatch.net/en/latest/privacy.html) [Filtering](https://docs.activitywatch.net/en/latest/features/filtering-data.html) |
| P2 | Session closeout signal | Optional plan-linked outcome (`completed` / `not completed`) and short note in the existing completion alert; feed weekly review, not a new journal | RescueTime uses a post-session outcome summary. Test whether this changes planning behavior before expanding the schema or UI. [Focus Sessions](https://help.rescuetime.com/article/297-how-to-start-a-focus-session) |

### Local Activity Assist acceptance boundary

Automatic collection is the riskiest proposed capability. Its first version should satisfy all of these conditions:

- disabled by default and explained before activation;
- foreground application name and idle/active timing only;
- no window titles, URLs, document names, content, screenshots, or keystrokes;
- persistent visible collection status plus one-click pause;
- app exclusions and delete-all-raw-data controls;
- short, documented raw retention;
- suggestions stored separately from plans and actual sessions;
- accepting a suggestion creates/updates confirmed time through the same validation path as manual editing;
- rejected or expired suggestions never enter goals, Insights, or exports as actual focus;
- no network access is required for collection, classification, or review.

Stop the experiment if useful suggestions require content-level collection or if the review queue costs more time than manual correction saves.

## Deliberate non-goals

- **No arbitrary application themes.** Four curated palettes already cover preference and contrast exploration.
- **No full command palette yet.** Sidebar, module tabs, tray actions, and two global shortcuts cover the current command set.
- **No second focus timer or Pomodoro mode.** CoreHour's session/check-in model already owns focus timing; add a new mode only after repeated user evidence.
- **No website/app blocking.** RescueTime proves the pattern exists, not that it fits a local manual-first tracker.
- **No general tasks, projects, team reports, approvals, clients, billing, or manager views.** Super Productivity and Toggl show how quickly those concepts expand the model.
- **No silent cross-device sync expansion.** Backup, restore, and future sync must remain separate concepts with explicit conflict and recovery semantics.

## Delivery sequence

1. State contract and shared consumption in the most-used views.
2. Focus/control/status roles and four-palette accessibility audit.
3. Launch-to-Now/last-workspace experiment using existing data only.
4. Linux capability-state work and adapter parity.
5. Local Activity Assist privacy spike and review queue.
6. Optional session-outcome experiment only if weekly review needs it.

## Source ledger

All sources were accessed 2026-08-28.

### Design systems and standards

- [Material Web color theming](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)
- [Fluent 2 color](https://fluent2.microsoft.design/color)
- [Fluent 2 design tokens](https://fluent2.microsoft.design/design-tokens)
- [Fluent 2 Wait UX](https://fluent2.microsoft.design/wait-ux)
- [Fluent 2 Nav](https://fluent2.microsoft.design/components/web/react/core/nav/usage)
- [Fluent 2 Tablist](https://fluent2.microsoft.design/components/web/react/core/tablist/usage)
- [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/)
- [Atlassian color roles](https://atlassian.design/foundations/color-new/)
- [Atlassian empty-state content](https://atlassian.design/foundations/content/designing-messages/empty-state)
- [Atlassian error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- [WCAG 2.2: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
- [WCAG 2.2: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [WCAG 2.2: Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

### Products and open-source projects

- [Toggl: Creating a Time Entry](https://support.toggl.com/en-us/article/creating-a-time-entry-wg8nug/)
- [Toggl Track desktop app for Windows](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/)
- [RescueTime Assistant](https://help.rescuetime.com/article/413-the-rescuetime-assistant)
- [RescueTime Focus Sessions](https://help.rescuetime.com/article/297-how-to-start-a-focus-session)
- [ActivityWatch introduction](https://docs.activitywatch.net/en/latest/introduction.html)
- [ActivityWatch privacy](https://docs.activitywatch.net/en/latest/privacy.html)
- [ActivityWatch watchers](https://docs.activitywatch.net/en/latest/watchers.html)
- [ActivityWatch pausing](https://docs.activitywatch.net/en/latest/features/pausing-logging.html)
- [ActivityWatch filtering](https://docs.activitywatch.net/en/latest/features/filtering-data.html)
- [ActivityWatch UI](https://docs.activitywatch.net/en/latest/features/user-interface.html)
- [ActivityWatch export](https://docs.activitywatch.net/en/latest/features/exporting-data.html)
- [Super Productivity official repository](https://github.com/super-productivity/super-productivity)
- [Stretchly official repository](https://github.com/hovancik/stretchly/blob/trunk/README.md)
