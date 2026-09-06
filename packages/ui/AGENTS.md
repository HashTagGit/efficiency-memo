# `@memo/ui`

Shared React 19 + Tailwind v4 components for the desktop app. The package is presentational and exports source directly from `src/index.ts`.

## Rules

- Keep components client-side (`'use client'`), presentational, and dependency-light. Do not add a router, state/form library, CSS-in-JS, build step, or third-party icon set.
- Reuse existing components before adding one. Props are exported beside the component; accept `className` and pass through supported HTML props. Preserve the existing `data-testid` hooks and accessibility contracts (labels, keyboard actions, `aria-*`, dialog semantics).
- Use semantic token classes defined in `apps/desktop/src/index.css`; never use hardcoded palette utilities such as `bg-white`, `text-gray-*`, `bg-blue-*`, or `border-gray-*`.
- Avoid `any`, `@ts-ignore`, and `@ts-expect-error`. Keep files under 250 LOC unless a focused refactor removes more complexity than it adds.
- Do not import from `apps/desktop`; importing type-only contracts from `@memo/shared` is allowed and must not create a cycle.

## Verification

For component behavior changes, run:

```text
pnpm --filter @memo/ui test
pnpm --filter @memo/ui lint
```

Run repository-wide checks when a change crosses package boundaries. Tests belong in `src/__tests__/` and should exercise user-visible behavior rather than mirror implementation details.
