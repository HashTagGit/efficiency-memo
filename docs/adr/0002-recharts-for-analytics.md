# ADR 0002: Recharts for CoreHour Analytics

## Status

Accepted

## Context

CoreHour records check-ins with durations and tags, but the History page only showed a flat per-day list. Reading a week of focus trends meant clicking through seven dates. M2 adds a daily trend line and a tag-distribution breakdown, which needs a charting layer.

The desktop app is the only surface, bundled by Vite, and the project rule is to justify every new third-party dependency.

## Decision

Add `recharts` (^3.10.1) to `apps/desktop` and render analytics as a second tab on the History page.

## Rationale

Considered alternatives:

- **Hand-rolled SVG.** No dependency, but a line chart with axes, ticks, zero-fill gaps, and hover tooltips is a few hundred lines of layout math we would own and debug ourselves. The tooltip and responsive-resize behaviour is where hand-rolled charts usually rot.
- **Chart.js.** Canvas-based, so chart text is invisible to screen readers and not selectable. Needs a React wrapper to fit the component model.
- **Recharts.** React-native component API, renders real SVG (accessible, themeable with our CSS variables directly via `stroke="var(--accent)"`), and composes with the existing dark-theme tokens without a separate theme config.

Recharts wins on fit: it speaks React and SVG, which is what the rest of the app already is.

## Trade-offs

- **Lost**: ~90 KB gzipped added to the bundle. Acceptable for a desktop app with no cold-start network cost.
- **Lost**: Recharts owns the rendering, so unusual chart shapes later may need escaping to raw SVG anyway.
- **Gained**: Zero chart-layout code to maintain. Aggregation logic stays in `features/core-hour/analytics.ts` as pure functions, fully unit-tested and independent of the charting library, so swapping Recharts out later touches only the page component.

## Consequences

`analytics.ts` holds all data shaping (zero-filled daily series, tag percentages) and is tested without rendering. The page component is a thin binding of those results to Recharts elements. If Recharts is ever replaced, the tests keep passing.
