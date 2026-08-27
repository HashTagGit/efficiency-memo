# EfficiencyMemo UI themes and commercial gap analysis

Research date: 2026-08-27

## Executive recommendation

Ship appearance as two independent preferences:

1. Color mode: `System / Light / Dark`, with `System` as the default.
2. Palette: `Ember / Tide / Grove`, with the current amber direction refined into Ember rather than discarded.

Keep a fourth `Clarity` palette as an enhanced-contrast candidate until every component and chart has been visually audited. More color should express selection, category, status, and data series; it should not turn every card or page band into a colored surface.

After the appearance slice, the highest-value product work is **CoreHour Plan vs Actual with a week calendar**. Next are idle/suspend resolution, tray/global shortcuts, and Pause & Hydrate quiet-hours/DND handling. These improve repeated desktop workflows without introducing team management, billing, or a general task manager.

## Current baseline

The committed UI already has semantic CSS variables, light/dark values, reduced-motion handling, neutral surfaces, and distinct success/danger/info/warning colors. Its main limitation is that one amber `--accent` carries primary action, selected navigation, focus, and chart emphasis, while the shell only exposes a binary light/dark toggle. The token set also lacks explicit `on-accent`, subtle semantic containers, control-border, focus-ring, and chart-series roles.

The product baseline is stronger than a prototype:

- CoreHour has Today capture, recent/favorite activities, manual correction, a day timeline, tags, daily goals, weekly comparison, trends, and CSV export.
- Pause & Hydrate has independent break/hydration intervals, native notifications, focus deferral, complete/postpone/mute actions, and timestamped daily history.
- App data is local SQLite with manual WebDAV backup/restore.

The recommendations below therefore focus on missing desktop ergonomics and review workflows, not duplicating features that already exist.

## Design-system evidence

- Material 3 maps primary, secondary, tertiary, error, neutral surfaces, outlines, and corresponding `on-*` content colors to semantic roles. The key transferable rule is to define container/content pairs rather than assuming white text works on every accent. [Material Web color theming](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)
- Fluent 2 separates neutral, shared, and brand palettes. It recommends sparse shared-color use, reserves semantic colors for important states rather than decoration, adjusts saturation/brightness in dark mode, and encourages user personalization. [Fluent 2 color](https://fluent2.microsoft.design/color)
- Primer separates base, functional, and component tokens; functional tokens adapt across modes. It also provides auto, high-contrast, color-blind, dimmed, and tritanopia variants, demonstrating that mode and palette are separate concerns. [Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/), [Primer theming](https://primer.style/product/primitives/)
- Atlassian treats a theme as a collection of token values and explicitly notes that theming can cover light/dark/high contrast as well as density, reduced motion, and typography. Its color guidance targets WCAG AA. [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/), [Atlassian color](https://atlassian.design/foundations/color-new/)
- WCAG 2.2 requires at least 4.5:1 contrast for normal text and 3:1 for meaningful UI boundaries, focus/state indicators, and graphics. Color must not be the only state cue. [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

### Token model

Retain the existing token names for compatibility, then add only the missing roles:

```text
Canvas:      background, background-soft, surface, surface-strong, surface-raised
Content:     foreground, muted, border, control-border, disabled
Accent:      accent, on-accent, accent-subtle, secondary, focus-ring
Status:      info, success, warning, danger + matching subtle/on-emphasis roles
Data:        chart-1 ... chart-6; user tag colors remain user-owned
```

Use `data-theme="light|dark"` and `data-palette="ember|tide|grove|clarity"`. Static CSS variables are sufficient; no theme package or runtime color generator is needed.

## Recommended palettes

These are project-owned working names and original role mappings, not renamed copies of community themes. The candidate foreground, muted, accent, secondary, and status colors were checked against their adjacent surface using the WCAG formula: normal text pairs are at least 4.5:1, `on-accent` pairs are at least 4.5:1, and proposed control borders are above 3:1.

| Palette | Mode | Background / surface | Text / muted | Accent / on-accent | Secondary | Control border |
|---|---|---|---|---|---|---|
| **Ember** | Light | `#F4F6F8` / `#FFFFFF` | `#1A2530` / `#617080` | `#8B5A00` / `#FFFFFF` | `#176B87` | `#73808E` |
|  | Dark | `#0F1217` / `#171C24` | `#EDF1F5` / `#AAB4BF` | `#E0AD55` / `#241A06` | `#7EC8E3` | `#748292` |
| **Tide** | Light | `#F4F7F7` / `#FFFFFF` | `#162427` / `#5C6B6E` | `#006C65` / `#FFFFFF` | `#6E4C9B` | `#708184` |
|  | Dark | `#0C1516` / `#142022` | `#EAF1F0` / `#A5B3B1` | `#69D3C8` / `#062C29` | `#C5A7E8` | `#6B7E80` |
| **Grove** | Light | `#F7F5F8` / `#FFFFFF` | `#281F2B` / `#6D6172` | `#6F4885` / `#FFFFFF` | `#33705A` | `#807184` |
|  | Dark | `#141116` / `#1D1920` | `#F2EDF3` / `#B7ABBA` | `#D6ACE8` / `#2B1536` | `#8BD0AC` | `#7C6C84` |
| **Clarity** | Light | `#F7F9FC` / `#FFFFFF` | `#101820` / `#3D4B58` | `#0B4897` / `#FFFFFF` | `#005862` | `#596775` |
|  | Dark | `#0A0F15` / `#121923` | `#F6F8FB` / `#CBD4DE` | `#B9D3FF` / `#061B3C` | `#91E3EB` | `#8B99A7` |

Keep semantic status hues stable across Ember, Tide, and Grove so palette changes do not change meaning:

| Role | Light foreground | Dark foreground | Meaning |
|---|---|---|---|
| Info | `#245F99` | `#8FBCE7` | neutral information, planned/suggested time |
| Success | `#1E704B` | `#84D3A7` | completed/confirmed |
| Warning | `#7D5700` | `#F0C56C` | due, idle, needs review |
| Danger | `#B23545` | `#F6A0AC` | conflict, destructive action, error |

Palette intent:

- **Ember** is the safest default. It preserves recognition and uses cyan/green/coral to prevent an amber-only interface.
- **Tide** is a cooler workday option. Teal is primary; violet is secondary, so the UI does not collapse into a blue-only theme.
- **Grove** is the most expressive option. Plum and green form a balanced pair while neutral surfaces keep operational screens quiet.
- **Clarity** increases luminance separation and stronger boundaries. Treat it as an accessibility mode, not a decorative fourth skin, and ship only after full visual QA.

### Community palette lessons

| Source | Useful idea | Decision for EfficiencyMemo |
|---|---|---|
| [Catppuccin style guide](https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md) | Explicit background, surface, overlay, text, and semantic roles across a light flavor and several dark flavors | Best structural reference; do not copy its names or pastel values wholesale because application controls need stronger verified contrast |
| [Tokyo Night](https://github.com/folke/tokyonight.nvim) | Paired day/dark variants and multiple clearly differentiated accents | Inspiration for Tide only; the source is an editor theme and its blue/purple dominance should not become the whole product identity |
| [Gruvbox](https://github.com/morhetz/gruvbox) | Light/dark variants, distinguishable accents, and contrast settings | Do not ship as a preset: its beige/brown base is too stylistically dominant for this quiet productivity app, though its contrast controls are worth emulating |

## Appearance and settings gaps

| Priority | Gap | Minimum useful implementation | Evidence |
|---|---|---|---|
| A0 | Appearance is not a first-class settings destination | Add an Appearance section with System/Light/Dark segmented control and three live palette swatches; persist locally and preview immediately | Toggl supports light, dark, or Windows settings; Obsidian defaults to OS mode and exposes appearance themes. [Toggl desktop preferences](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/), [Obsidian appearance](https://obsidian.md/help/appearance) |
| A0 | Token roles are incomplete | Add `on-accent`, subtle semantic containers, control border, focus ring, and chart-series tokens before recoloring pages | Material, Fluent, Primer, and Atlassian all map values through semantic/alias roles rather than component hex values. Sources above. |
| A1 | Dense desktop views have no density choice | Add `Comfortable / Compact` only after the default layout is stable; apply it to lists, timeline rows, and settings, not typography scale | Toggl exposes compact and detailed time-entry display. [Toggl desktop preferences](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/) |
| A1 | No enhanced-contrast presentation | Audit Clarity across controls, charts, tag colors, and focus indicators; never communicate state by hue alone | Primer ships dedicated high-contrast and color-vision variants; WCAG thresholds are cited above. |

## Workflow gaps versus mature products

| Priority | Gap | Minimum useful implementation | Why it matters |
|---|---|---|---|
| P0 | Plan vs actual and week calendar | Store planned blocks separately from confirmed sessions; show both in a week view; drag/resize actual blocks; explicitly convert a plan into a session | Clockify's calendar compares planned and tracked time and supports move/resize; Rize exposes planned focus sessions. [Clockify Calendar](https://clockify.me/help/track-time-and-expenses/calendar-view), [Rize productivity](https://www.rize.io/features/productivity) |
| P0 | Idle/suspend resolution | On return, offer keep idle, trim-and-stop, trim-and-resume, or record break; preserve the original interval until the user decides | Toggl presents these explicit outcomes, while Timing asks users to classify idle time on return. [Toggl idle notification](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/), [Timing time entries](https://timingapp.com/help/time-entries) |
| P0 | Tray and global shortcuts | Add show/hide, continue latest, pause/resume, and stop; all commands must route through the existing authoritative session state | Toggl offers configurable out-of-focus shortcuts and taskbar controls for recent/favorite sessions. [Toggl shortcuts](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/) |
| P0 | Pause & Hydrate interruption policy | Add active days/time window, quiet hours, DND-aware deferral, natural-idle reset, and visible notification permission state | Stretchly pauses for idle and DND, exposes tray status, follows system theme, and supports postpone/pause controls. [Stretchly repository](https://github.com/hovancik/stretchly) |
| P1 | Product-wide data control is fragmented | Add one Data & Privacy page for full export, import/restore, delete/reset, backup status, and scope explanations across every tool | ActivityWatch treats export/delete/backup as part of local data control; Toggl supports desktop import/export. [ActivityWatch](https://activitywatch.net/), [Toggl import/export](https://support.toggl.com/en-us/article/toggl-track-desktop-app-for-windows-5w1y5/) |
| P2 | Assisted review remains fully manual | Only after P0: opt-in local app activity, visible pause, exclusions, and unconfirmed suggested blocks that users accept or edit | Timing separates suggested activity blocks from explicit entries; Rize lets users override a period or create persistent rules. [Timing suggestions](https://timingapp.com/help/time-entries), [Rize tracking rules](https://www.rize.io/guides/categories-and-rules) |

## Recommended delivery order

1. **Appearance foundation:** System/Light/Dark, Ember/Tide/Grove, missing semantic tokens, palette previews, bilingual labels, and visual QA across the shell, CoreHour, Pause & Hydrate, charts, dialogs, and disabled/focus states.
2. **CoreHour Plan vs Actual:** separate plan data, week view, direct manipulation, explicit plan-to-session conversion, and no automatic inclusion of plans in Insights.
3. **Desktop reliability:** idle/suspend resolution plus tray/global shortcuts.
4. **Healthy interruption policy:** Pause & Hydrate schedule, quiet hours, DND/natural-idle handling, and notification permission feedback.
5. **Trust and assistance:** unified data controls first; local suggested activity only after privacy and review semantics are explicit.

Do not add billing, clients, approvals, employee monitoring, screenshot capture, a general task manager, arbitrary user-entered theme colors, or a theme marketplace. Curated palettes cover the present customization need while keeping contrast and product identity controllable.
