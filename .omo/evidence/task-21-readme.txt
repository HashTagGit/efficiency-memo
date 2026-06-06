Task 21: Fix README.md - add pnpm start to Scripts table and document landing page.

EVIDENCE
========
1) grep for "pnpm start" in README.md:
   D:\documents\code\git\release\efficiency-memo\README.md
   70: | `pnpm start` | Start production server |

2) Scripts table now contains 7 rows in order:
   - pnpm dev          -> Start dev server
   - pnpm build        -> Build all packages
   - pnpm start        -> Start production server   (NEW)
   - pnpm lint         -> Run ESLint
   - pnpm typecheck    -> TypeScript check
   - pnpm test         -> Run Vitest
   - pnpm test:e2e     -> Run Playwright

3) Landing page one-liner added (after the "After pnpm dev..." paragraph, before Scripts):
   "The public landing page is served at `/` (rendered by `apps/web/src/app/page.tsx`)
    and introduces the available tools."

CHANGES MADE
============
File: D:\documents\code\git\release\efficiency-memo\README.md
- Inserted one row in the Scripts table:
    | `pnpm start` | Start production server |
  (placed between `pnpm build` and `pnpm lint`, line 70)
- Inserted a one-liner noting the public landing page at `/`, rendered by
  apps/web/src/app/page.tsx (placed after the Quick Start "After pnpm dev..." paragraph,
  immediately before the "## Scripts" heading)

NOT TOUCHED
===========
- apps/web/src/app/page.tsx  (landing page component itself, per MUST NOT DO)
- Any package.json files
- Any application code

FLAG / FOLLOW-UP (pre-existing, not in scope of this task)
==========================================================
The root package.json (D:\documents\code\git\release\efficiency-memo\package.json)
does NOT currently define a `start` script. `pnpm start` invoked at the repo root
will therefore fail with "missing script: start". Only `apps/web/package.json`
defines `"start": "next start"`.

If the documented `pnpm start` is expected to work at the repo root (matching the
convention of the other root scripts which all use `pnpm -r ...`), the root
package.json needs an entry such as:
    "start": "pnpm -r start"

This was NOT applied here because the task scope was strictly README.md. Owner
should decide whether to add the root script.

VERIFICATION
============
- grep "pnpm start" README.md -> 1 match (line 70, the new row)
- No other files modified.
- Landing page note verified in place between Quick Start and Scripts sections.
