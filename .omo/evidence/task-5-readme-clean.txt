Task 5 Evidence: README.md Clean Verification
Date: 2026-06-10

=== Verification Commands ===

1. Grep README.md for 'docker' (case-insensitive):
   Select-String -Path "README.md" -Pattern '(?i)docker'
   Result: 0 matches

2. Grep README.md for 'supabase' (case-insensitive):
   Select-String -Path "README.md" -Pattern '(?i)supabase'
   Result: 0 matches

3. Grep README.md for 'Next.js':
   Select-String -Path "README.md" -Pattern 'Next\.js'
   Result: 0 matches

4. Grep README.md for 'Web App':
   Select-String -Path "README.md" -Pattern 'Web App'
   Result: 0 matches

5. Grep README.md for 'release/README.md':
   Select-String -Path "README.md" -Pattern 'release/README\.md'
   Result: 0 matches

=== Changes Made ===

- Line 3: Removed "The original Next.js + Supabase web app remains available as a Docker-based fallback."
- Lines 12-19 (original): Deleted "two deployable surfaces" table and web reference paragraph
- Lines 84-106 (original): Deleted entire "Quick Start — Web App (Docker / Supabase fallback)" section
- Removed release/README.md reference
- Added link to docs/Installation.md after Sync section
- Scripts table: Removed web-only commands (pnpm dev, pnpm build, pnpm lint, pnpm --filter web test:e2e)
- Architecture: Removed Web subsection, fixed "Both desktop and web" references
- Tech Stack: Removed Next.js, Postgres + Supabase, Playwright rows
- Rephrased "No Docker" to "No container runtime" in desktop quick start
- Rephrased "Next.js-style SSR" to "server-side rendering" in architecture

=== Final Line Count ===
README.md: 145 lines (down from 185)

PASS: Zero Docker/Supabase/Next.js mentions in README.md
