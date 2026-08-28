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
- Windows system-interruption deferral with persisted blocked state, recovery grace, staggered reminders, and suspend-gap protection.
- Operational Now home with current focus, next plan, reminder status, device attention, and compact full-tool navigation.
- Dedicated control-border and keyboard-focus roles across every palette and mode, consumed by shared primitives and native desktop controls.

## Next releases

### 1. Product-wide view states

- Standardize first-use, no-results, completed, loading, unavailable, not-found, and recoverable-error states.
- Keep safe stale data visible during refresh and offer section-level retry without losing local context.

### 2. Respectful reminder policy

- Add a reliable Linux idle adapter across Wayland/X11 desktop environments before enabling Natural Rest there.

### 3. Local Activity Assist experiment

- Windows-first, off by default, foreground application name only.
- Short raw retention, pause/exclusion/delete controls, and local-only processing.
- Show unconfirmed suggestions in CoreHour; only explicit acceptance creates actual time.

Stop the experiment if useful suggestions require window titles, URLs, screenshots, content, keystrokes, or cloud inference.

## Product boundaries

- No team surveillance, manager dashboards, seat billing, screenshots, or keystroke capture.
- No general task manager, AI auto-scheduling, or calendar write-back until manual planning proves a separate demand.
- A future Day Plan tool requires evidence that users want task lifecycle independent of CoreHour plans and sessions.
- Local timers, reminders, history, export, restore, deletion, and privacy controls remain complete without an account.

## Visual vocabulary

Every palette keeps the same meanings: `planned` uses informational color plus a dashed border; `actual` uses tag/success color plus a solid edge; `suggested` uses a dotted pending treatment; `recovery`, `hydration`, and `privacy` use distinct icons as well as color. Tag colors remain user data and never become status colors.

## Evidence

The priorities and boundaries are supported by [local-first productivity UI and product strategy](research/local-first-productivity-ui-product-research.md), [UI themes and commercial gap analysis](research/ui-themes-commercial-gap-analysis.md), [CoreHour competitive analysis](research/corehour-competitive-analysis.md), and [adjacent product opportunities](research/adjacent-product-opportunities-2026.md).
