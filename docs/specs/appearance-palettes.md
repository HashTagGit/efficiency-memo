# Appearance palettes

## Objective

Make appearance a first-class application preference with curated, accessible color choices that apply consistently across every tool.

## Scope

- Separate color mode (`System`, `Light`, `Dark`) from palette (`Ember`, `Grove`, `Tide`).
- Persist both preferences locally and preview changes immediately.
- Preserve the former `efficiency-memo-theme` preference when the new mode key is absent.
- Keep the sidebar light/dark command as a fast override of the resolved mode.
- Add a global application settings page for appearance and language.
- Keep `/settings/sync` available by URL, but route the primary Settings command to `/settings`.
- Apply palettes through the existing semantic CSS tokens without per-page color overrides.
- Add an `on-accent` role because primary controls consume it directly.

## Acceptance Criteria

- `System` follows operating-system changes while the app is running.
- The sidebar theme command switches from System to an explicit opposite mode.
- Ember remains the default palette and preserves the existing visual identity.
- All three palettes have light and dark values for base, surface, content, accent, status, sidebar, and shadow tokens.
- Normal foreground/background and primary accent-button pairs meet WCAG AA text contrast.
- Palette, mode, and language controls are keyboard accessible and expose selected state.
- English and Simplified Chinese layouts remain usable without overlapping controls.

## Non-Goals

- Arbitrary custom colors, imported themes, or a theme marketplace.
- High-contrast or color-vision-specific modes before a full component and chart audit.
- Density, typography, animation, or layout customization.
- Additional unconsumed semantic roles until a component needs them.
- Business workflow features in the same delivery slice.
