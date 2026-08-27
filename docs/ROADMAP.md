# EfficiencyMemo Roadmap

EfficiencyMemo is a local-first personal work-rhythm desktop suite. The roadmap deepens existing tools and shared desktop capabilities before adding another top-level module.

## Shipped foundation

- Local profile, SQLite persistence, bilingual shell, and System/Light/Dark appearance.
- Ember, Grove, and Tide palettes using shared semantic tokens.
- CoreHour sessions, check-ins, tags, daily goals, Today, Timeline, and Insights.
- CoreHour planned blocks with separate day/week plan-versus-actual timelines and explicit conversion.
- CoreHour direct plan move/resize plus selected-week and current-week plan-versus-actual review.
- CoreHour uncertain-time resolution for scheduler/suspend gaps and Windows native system idle.
- Pause & Hydrate with independent schedules, focus deferral, actions, notifications, and local history.
- Data & Privacy Center with portable backup/restore preview, readable module exports, and scoped reset.
- Domain color roles for focus, planned, actual, recovery, hydration, privacy, and suggestions across every palette and mode.
- Desktop Companion with bilingual system-tray focus/reminder state, authoritative CoreHour commands, and global show/hide plus latest-activity start/stop shortcuts.
- Pause & Hydrate reliable schedules with active weekdays, work/quiet hours, and visible notification-permission state.

## Next releases

### 1. Respectful reminder policy

- Natural movement-break completion from sufficient idle time; hydration always remains explicit.
- DND-aware deferral with a grace period and no stale-reminder burst after resume.
- Add reliable native idle adapters beyond Windows before enabling natural-break completion there.

### 2. Local Activity Assist experiment

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

The priorities and boundaries are supported by [UI themes and commercial gap analysis](research/ui-themes-commercial-gap-analysis.md), [CoreHour competitive analysis](research/corehour-competitive-analysis.md), and [adjacent product opportunities](research/adjacent-product-opportunities-2026.md).
