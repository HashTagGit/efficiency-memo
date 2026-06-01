# packages/ui

## Purpose
`@memo/ui` is the shared React component library used by `apps/web`. It exports the building blocks for the authenticated shell and the per-tool UI surfaces, so every tool uses the same buttons, cards, modals, sidebars, and outer layout without duplicating markup.

## Context
The package is consumed by `apps/web` through the `@memo/ui` path alias and re-exports its source directly (no build step). Tests live next to the components and run with Vitest + jsdom + Testing Library.

**Public surface** (re-exported from `src/index.ts`):
- `Button` (`src/button.tsx`) with `variant: 'primary' | 'secondary' | 'ghost' | 'danger'` and `size: 'sm' | 'md' | 'lg'`, plus an `isLoading` flag that swaps in a spinner
- `Card` (`src/card.tsx`) renders a clickable card that becomes an `<a>` when `href` is provided, otherwise a button with full keyboard support
- `Modal` (`src/modal.tsx`) is a controlled dialog with Escape-to-close, body scroll lock, overlay click, and `role="dialog" aria-modal="true"`
- `Sidebar` (`src/sidebar.tsx`) is a collapsible tool nav driven by `ToolManifest[]`; collapses to 64px and expands to 240px
- `Shell` (`src/shell.tsx`) composes `Sidebar` plus a header and renders a responsive layout: desktop sidebar on `md+`, slide-in drawer on mobile

## Patterns
- Every component file starts with `'use client'`; treat this package as a client-only library
- All components forward extra props through `...rest` and accept `className` for tailwind overrides
- Always include a `data-testid` on top-level interactive elements (already done: `sidebar`, `sidebar-toggle`, `sidebar-tool-item-${id}`, `modal-overlay`, `shell-header`, `sign-out-button`, `mobile-menu-button`, `desktop-sidebar`, `mobile-drawer-overlay`)
- Keyboard accessibility is wired in (`Enter`/`Space` on Card, `Escape` on Modal, `aria-label` on icon buttons)
- Tailwind classes are written as full utility strings rather than `clsx`; match the existing palette tokens (`bg-blue-600`, `bg-neutral-900`, `text-gray-900`)
- Component props are exported as `interface XxxProps` next to the component
- Tests under `src/__tests__/` import from the source file directly

## Constraints
- Do not import from `apps/web` or `@memo/shared` types in a way that creates a cycle; `@memo/shared` types are fine because `@memo/ui` is downstream of it
- Do not add a build step (no `tsc` emit, no bundler), the consumer reads `.tsx` straight from `src/`
- Do not pull in a state library, router, or form library; keep this package pure and presentational
- Do not remove the `'use client'` directive; these components rely on browser-only behavior (e.g. `document.addEventListener`)
- Do not add icons via a third-party icon set; use inline SVGs in the same style as the existing ones
- Do not exceed Tailwind v4 utility classes; do not introduce a CSS-in-JS dependency

## Dependencies
- **Peer**: `react ^19.0.0`, `react-dom ^19.0.0`, `tailwindcss ^4.0.0`
- **Dev**: `@testing-library/jest-dom ^6.9.1`, `@testing-library/react ^16.0.0`, `@types/react ^19`, `@types/react-dom ^19`, `jsdom ^29.1.1`, `vitest ^3.0.0`
- **Type-only**: imports `ToolManifest` from `@memo/shared` (used by `Sidebar` and `Shell`)
- **No runtime data fetching**, the package is pure UI
