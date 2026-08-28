# EfficiencyMemo Roadmap

EfficiencyMemo is a local-first personal work-rhythm desktop suite. The roadmap deepens existing tools and shared desktop capabilities before adding another top-level module.

## Shipped foundation

- Local profile, SQLite persistence, bilingual shell, and System/Light/Dark appearance.
- Ember, Grove, Tide, and enhanced-contrast Clarity palettes using shared semantic tokens.
- Bilingual Charger Reminder list, create/edit form, device detail, localized estimate states, and direct card navigation.
- CoreHour sessions, check-ins, tags, daily goals, Today, Timeline, and Insights.
- CoreHour planned blocks with separate day/week plan-versus-actual timelines and explicit conversion.
- CoreHour direct plan move/resize plus selected-week and current-week plan-versus-actual review.
- CoreHour uncertain-time resolution for scheduler/suspend gaps and Windows native system idle.
- Pause & Hydrate with independent schedules, focus deferral, actions, notifications, and local history.
- Data & Privacy Center with portable backup/restore preview, readable module exports, and scoped reset.
- Domain color roles for focus, planned, actual, recovery, hydration, privacy, and suggestions across every palette and mode.
- Desktop Companion with bilingual system-tray focus/reminder state, authoritative CoreHour commands, and global show/hide plus latest-activity start/stop shortcuts.
- Pause & Hydrate reliable schedules with active weekdays, work/quiet hours, and visible notification-permission state.
- Opt-in Natural Rest on Windows, using native system idle to complete one movement break without inferring hydration.
- Native macOS Natural Rest idle detection through the current login session's CoreGraphics event state.
- Capability-gated Linux Natural Rest through Mutter on GNOME Wayland and XScreenSaver on native X11; unsupported Wayland sessions remain disabled.
- Windows system-interruption deferral with persisted blocked state, recovery grace, staggered reminders, and suspend-gap protection.
- Operational Now home with current focus, next plan, reminder status, device attention, and compact full-tool navigation.
- Dedicated control-border and keyboard-focus roles across every palette and mode, consumed by shared primitives and native desktop controls.
- Windows-first Activity Assist collection foundation with opt-in foreground executable sampling, collection pause, exclusions, short retention, inspection, and deletion.
- Activity Assist stable suggestions with edit, dismiss, and atomic explicit acceptance into confirmed CoreHour sessions.
- Explicit application mapping rules that prefill later suggestions, remain editable/deletable, appear in portable/readable exports, and surface pending review on Now.
- Guided Daily Review with plan-versus-actual and recovery facts, open-item guards, one bounded outcome, and an atomically applied next focus target.
- Module locator colors for CoreHour, Pause & Hydrate, Charger Reminder, and Settings, while primary actions remain governed by the selected palette.
- Semantic Alert containers plus explicit button pressed and disabled reactions without component-level product hues.

## Delivery roadmap

### Phase 0 — semantic UI completion (current)

- Replace remaining component-local status hues with semantic tokens.
- Add only consumed device, chart-series, selected, disabled, and forced-colors roles.
- Audit the same state vocabulary across all four palettes and both modes: rest, hover, pressed, selected, focused, disabled, loading, success, and error.
- Finish product-wide first-use, no-results, completed, loading, unavailable, not-found, and stale-data-safe recoverable-error states.

**Exit gate:** shared primitives contain no hardcoded product/status hue; keyboard focus and interaction state remain distinguishable without color alone.

### Phase 1 — assisted capture that learns from confirmation (shipped)

- Add an optional “remember this app” choice when accepting an Activity Assist suggestion.
- Apply exact executable-to-activity/tag rules locally and deterministically.
- Provide inspect, edit, and delete controls; rules never create confirmed sessions by themselves.
- Surface the pending suggestion count on Now.

**Exit gate:** repeat applications require fewer edits, while every Actual Session still requires explicit acceptance. Stop if useful categorization requires titles, URLs, content, screenshots, keystrokes, or cloud inference.

### Phase 2 — guided review and adjustment (in progress)

- Shipped: optional end-of-day closeout for pending suggestions/uncertain time, plan-versus-actual, recovery/hydration facts, one outcome, and one next adjustment.
- Add a weekly reset for capacity, longest focus blocks, interruptions, recovery coverage, device attention, and goal adjustment.
- Review reminders must respect quiet hours and system interruption state.

**Exit gate:** a saved adjustment changes a later plan or goal. Stop if the workflow becomes a passive report that users open without acting on it.

### Phase 3 — cross-module attention and reminder completion

- Evolve Now into a maximum-five-item attention feed with one owner and one next action per item.
- Include pending suggestions, uncertain time, due recovery/hydration, and device attention with deep links to the owning workflow.
- Add transition-triggered native Charger Reminder notifications with snooze and charged actions through one authoritative command path.

**Exit gate:** actions do not duplicate state paths, and dismiss/snooze survives restart.

### Phase 4 — optional product-form experiments

- Read-only local `.ics` import before any OAuth or write-back.
- Optional motion-safe companion presentation for recovery/hydration, disabled by default.
- A coral/evergreen fifth palette only after the Phase 0 state matrix is complete and contrast-audited.
- Validate Linux `.deb` and AppImage behavior on GNOME Wayland, Plasma Wayland, and X11; unsupported sessions remain explicit.

Each experiment must be removable without migrating confirmed sessions, plans, reminders, or device data.

### Phase 5 — sustainability validation

- Test supporter funding that unlocks no core feature.
- Consider a paid signed/supported distribution only when release maintenance provides demonstrated value.
- Investigate hosted encrypted backup/sync only as a separately threat-modeled service.

**Exit gate:** support demand covers its operating cost without feature captivity. Do not build account infrastructure in anticipation of demand.

## Product boundaries

- No team surveillance, manager dashboards, seat billing, screenshots, or keystroke capture.
- No general task manager, AI auto-scheduling, or calendar write-back until manual planning proves a separate demand.
- A future Day Plan tool requires evidence that users want task lifecycle independent of CoreHour plans and sessions.
- Local timers, reminders, history, export, restore, deletion, and privacy controls remain complete without an account.

## Visual vocabulary

Every palette keeps the same meanings: `planned` uses informational color plus a dashed border; `actual` uses tag/success color plus a solid edge; `suggested` uses a dotted pending treatment; `recovery`, `hydration`, and `privacy` use distinct icons as well as color. Tag colors remain user data and never become status colors.

## Evidence

The priorities and boundaries are supported by [the 2026 product and UI landscape](research/product-ui-landscape-2026.md), [local-first productivity UI and product strategy](research/local-first-productivity-ui-product-research.md), [UI themes and commercial gap analysis](research/ui-themes-commercial-gap-analysis.md), [CoreHour competitive analysis](research/corehour-competitive-analysis.md), and [adjacent product opportunities](research/adjacent-product-opportunities-2026.md).
