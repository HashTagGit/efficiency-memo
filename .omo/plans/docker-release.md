# Docker Distribution & GitHub Release Pipeline

## TL;DR

> **Quick Summary**: Ship a self-contained, Docker-only distribution of EfficiencyMemo — one-click setup script, docker-compose orchestration with bundled Supabase (Postgres + Auth + Studio + Inbucket), and automated GitHub Release artifacts (pre-built Docker image + downloadable zip).
>
> **Deliverables**:
> - `Dockerfile` — multi-stage production build for Next.js app
> - `docker-compose.yml` — full stack: Next.js + Supabase (Postgres, GoTrue, Studio, Inbucket) + migration runner
> - `setup.sh` / `setup.ps1` — one-click Docker-only setup scripts
> - `.github/workflows/release.yml` — CI: build → test → push to ghcr.io → create GitHub Release
> - `.env.docker` — pre-configured env vars for the Docker distribution
> - `release/README.md` — end-user docs shipped with the release
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves, 7 concurrent max
> **Critical Path**: Task 1 → Task 8 → Task 9 → Task 12 → F1-F4

---

## Context

### Original Request
User wants to make the project easier to start: a one-click setup script (Option A), a self-contained Docker Compose (Option B), and a GitHub Release pipeline producing pre-built Docker image + downloadable zip (Option D). No remote platform deployment (Option C explicitly excluded).

### Interview Summary
**Key Discussions**:
- **Docker-only**: Setup script checks for Docker, prints message if missing. No bare-metal Node/Supabase CLI path.
- **Supabase bundled**: Runs inside docker-compose, not external. Zero external dependencies beyond Docker.
- **Release format**: BOTH Docker image (ghcr.io) AND downloadable zip (compose + config).
- **CI verification**: Full pipeline — build image → run Vitest (341) + Playwright (53) → create release only if all green.

**Research Findings**:
- `next.config.ts` is empty — must add `output: "standalone"` for minimal Docker image
- Supabase in Docker is multi-service (Postgres + GoTrue + PostgREST + Studio + Inbucket), not a single container
- `NEXT_PUBLIC_*` env vars are inlined at build time — must be known during `docker build`
- E2E tests use `pg-mem` + mock auth — they don't need a real Supabase to run
- `supabase/config.toml` defines ports: API (54321), DB (54322), Studio (54323), Inbucket (54324)
- `env.ts` throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing

### Metis Review
**Identified Gaps** (addressed):
- **Supabase orchestration complexity**: Plan now uses individual service images (Postgres 17, GoTrue, PostgREST, Studio, Inbucket) with explicit startup ordering and health checks — not a naive single-container assumption.
- **NEXT_PUBLIC_* build-time problem**: Resolved by pre-generating a fixed anon key from a deterministic JWT secret, baked into both Supabase config and Next.js build args. The Supabase URL is always `http://localhost:54321` from the browser's perspective.
- **output: standalone missing**: Added as Wave 1 Task 1 — documented that this must be verified.
- **No RLS policies**: Documented as OUT OF SCOPE (not modifying migrations per AGENTS.md constraints).
- **Mock auth leaking to production**: Explicit guardrail — MUST NOT include mock-auth env vars in production Dockerfile.

---

## Work Objectives

### Core Objective
Ship a self-contained, Docker-only distribution of EfficiencyMemo — including one-click setup, docker-compose orchestration with bundled Supabase, and pre-built GitHub Release artifacts — without any remote platform dependency.

### Concrete Deliverables
- `apps/web/next.config.ts` updated with `output: "standalone"`
- `Dockerfile` (repo root) — multi-stage: install → build → runtime
- `docker-compose.yml` (repo root) — 6 services: nextjs, db, auth, rest, studio, inbucket
- `scripts/init-supabase.sh` — wait-for-db + apply-migrations runner
- `scripts/docker-entrypoint.sh` — Next.js startup
- `scripts/setup.sh` — Unix/macOS one-click launcher
- `scripts/setup.ps1` — Windows one-click launcher
- `.dockerignore` (repo root)
- `.env.docker` — pre-configured env vars with deterministic anon key
- `.github/workflows/release.yml` — CI/CD pipeline
- `release/README.md` — end-user documentation

### Definition of Done
- [ ] `docker build -t efficiency-memo:latest .` succeeds
- [ ] `docker compose up -d` starts all 6 services
- [ ] `curl -f http://localhost:3000` returns HTTP 200 within 60s
- [ ] `curl http://localhost:3000/sign-in` returns the sign-in form
- [ ] `pnpm test` passes all 341 Vitest cases (unchanged)
- [ ] `pnpm test:e2e` passes all 53 Playwright specs (unchanged)
- [ ] GitHub Actions workflow triggers on tag push, builds, tests, pushes to ghcr.io, creates release
- [ ] `docker compose down -v && docker compose up -d` works (clean restart)

### Must Have
- Production-grade `docker-compose.yml` bundling Next.js + Supabase services
- Docker-only `setup.sh` and `setup.ps1` scripts
- Pre-built Docker image published to ghcr.io
- Downloadable zip attached to GitHub Release (compose + env + README)
- GitHub Actions CI: build → test → release
- `output: "standalone"` in next.config.ts (minimal image size)
- Named volumes for Postgres data persistence
- Inter-container health checks and startup ordering

### Must NOT Have (Guardrails)
- **NO** Vercel deployment enhancements or changes
- **NO** mock-auth env vars in production Docker image (`NEXT_PUBLIC_ENABLE_AUTH_MOCK`, `AUTH_E2E_MOCK`, `E2E_MOCK_DB`)
- **NO** modification of mock auth cookie name or options (`efficiency-memo-mock-auth`)
- **NO** new or modified Supabase migrations
- **NO** non-Docker setup paths (bare-metal Node/Supabase CLI)
- **NO** RLS policy additions (even though Metis identified them as missing — separate concern)
- **NO** web-based setup wizard or onboarding UI
- **NO** Podman/Kubernetes/compose-v2 alternative paths
- **NO** monitoring/metrics stack beyond basic Docker healthchecks
- **NO** automated backup solution
- **NO** source code tarball in the release (compose + config only)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright in apps/web)
- **Automated tests**: Tests-after — existing 341 Vitest + 53 Playwright as verification gate. No new test files needed — Docker/infra verified by building, running, and hitting live endpoints.
- **Framework**: Vitest (unit) + Playwright (E2E)
- **Approach**: Build image → run existing suites → smoke-test the running stack

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **Docker build**: Bash — `docker build` → verify exit code + image size
- **Compose startup**: Bash — `docker compose up -d` → `curl` health checks
- **CI workflow**: Bash — inspect `.github/workflows/` + verify YAML validity
- **Scripts**: Bash — execute scripts and verify outputs

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.

```
Wave 1 (Start Immediately — foundation, all independent, MAX PARALLEL):
├── Task 1: Add output: "standalone" to next.config.ts [quick]
├── Task 2: Generate deterministic JWT secret + anon key for Supabase [quick]
├── Task 3: Create .env.docker template [quick]
├── Task 4: Create .dockerignore [quick]
├── Task 5: Create Supabase init/migration runner script [quick]
├── Task 6: Create Docker entrypoint script [quick]
└── Task 7: Verify existing tests pass after config changes [quick]

Wave 2 (After Wave 1 — Docker infrastructure):
├── Task 8: Create multi-stage Dockerfile (depends: 1, 3, 4, 6) [deep]
├── Task 9: Create docker-compose.yml with Supabase services (depends: 2, 5) [deep]
├── Task 10: Create setup.sh (depends: 9) [quick]
└── Task 11: Create setup.ps1 (depends: 9) [quick]

Wave 3 (After Wave 2 — CI/CD + Docs):
├── Task 12: Create GitHub Actions release workflow (depends: 8, 9) [deep]
├── Task 13: Create release README (depends: 8, 9, 10) [writing]
└── Task 14: End-to-end smoke verification (depends: 8, 9) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then explicit user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results → Get explicit user okay

Critical Path: Task 1 → Task 8 → Task 9 → Task 12 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Agent Dispatch Summary

- **Wave 1**: **7** — T1-T7 → `quick`
- **Wave 2**: **4** — T8 → `deep`, T9 → `deep`, T10-T11 → `quick`
- **Wave 3**: **3** — T12 → `deep`, T13 → `writing`, T14 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> Task labels: bare numbers `1.`, `2.` ... Final Wave: `F1.`, `F2.` ...

- [x] 1. Add `output: "standalone"` to `apps/web/next.config.ts`

  **What to do**:
  - Read current `apps/web/next.config.ts` (currently empty/default export)
  - Add `output: "standalone"` to the Next.js config object
  - Add `outputFileTracingRoot` set to the repo root so workspace packages (`@memo/shared`, `@memo/ui`) are traced correctly
  - Verify `pnpm build` still produces a working `.next/` with `.next/standalone/server.js`

  **Must NOT do**:
  - Add any other config changes beyond `output` and `outputFileTracingRoot`
  - Remove or modify existing `vercel.json` (may be relevant for future use)
  - Change the build command or build output structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, well-defined config change with known pattern
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None needed — straightforward Next.js config

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Task 8 (Dockerfile needs `standalone` output)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `apps/web/next.config.ts` — Current empty config to modify
  - `package.json` (root) — Workspace names (`@memo/shared`, `@memo/ui`) for `outputFileTracingRoot`
  - Next.js docs: `https://nextjs.org/docs/app/api-reference/config/next-config-js/output` — Standalone output mode

  **Acceptance Criteria**:
  - [ ] `pnpm build` in `apps/web` succeeds (exit code 0)
  - [ ] `.next/standalone/server.js` exists after build
  - [ ] `.next/standalone/package.json` includes workspace deps
  - [ ] `pnpm typecheck` passes (no TS errors introduced)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Standalone build produces server entrypoint
    Tool: Bash
    Steps:
      1. Run: pnpm build (from apps/web)
      2. Check: Test-Path -LiteralPath "apps/web/.next/standalone/server.js"
      3. Check: Test-Path -LiteralPath "apps/web/.next/standalone/package.json"
    Expected Result: Both files exist after build, exit code 0
    Evidence: .omo/evidence/task-1-standalone-build.txt

  Scenario: Existing tests still pass after config change
    Tool: Bash
    Steps:
      1. Run: pnpm test (from repo root)
      2. Check output for "341 passed" or equivalent all-pass count
    Expected Result: All tests pass, exit code 0
    Evidence: .omo/evidence/task-1-tests-pass.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-standalone-build.txt — build output confirming server.js exists
  - [ ] task-1-tests-pass.txt — test run output

  **Commit**: YES
  - Message: `feat(docker): add output: "standalone" to next.config.ts`
  - Files: `apps/web/next.config.ts`

- [x] 2. Generate deterministic JWT secret + anon key for Supabase

  **What to do**:
  - Generate a cryptographically random 64-char hex string as `JWT_SECRET`
  - Derive the Supabase `ANON_KEY` (signed JWT with role `anon`) using the JWT secret
  - Derive the `SERVICE_ROLE_KEY` (signed JWT with role `service_role`) using the JWT secret
  - Store all three in `scripts/generate-keys.sh` as a keygen script that also prints the env vars
  - Document that these are for local/Docker use only — production users should generate their own

  **Must NOT do**:
  - Hardcode these keys directly in the compose file (reference via env vars)
  - Use a weak/guessable secret (must be crypto-random)
  - Commit the generated secret to the plan or any non-script file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Script creation + key generation, well-bounded
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: Task 9 (docker-compose needs the key vars)
  - **Blocked By**: None

  **References**:
  - `supabase/config.toml:155-168` — Auth section where `site_url` and JWT settings are configured
  - Supabase docs: Self-hosted JWT signing key configuration

  **Acceptance Criteria**:
  - [ ] `scripts/generate-keys.sh` exists and is executable
  - [ ] Script outputs `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` when run
  - [ ] `ANON_KEY` is a valid JWT signed with the `JWT_SECRET`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Key generation script produces output
    Tool: Bash (Git Bash or WSL on Windows)
    Steps:
      1. Run: bash scripts/generate-keys.sh
      2. Assert output contains "JWT_SECRET="
      3. Assert output contains "ANON_KEY="
      4. Assert output contains "SERVICE_ROLE_KEY="
    Expected Result: Script outputs all three env vars, exit code 0
    Evidence: .omo/evidence/task-2-keygen-output.txt

  Scenario: Repeated runs produce same output (deterministic seed file)
    Tool: Bash
    Steps:
      1. Run: bash scripts/generate-keys.sh > out1.txt
      2. Run: bash scripts/generate-keys.sh > out2.txt
      3. Compare: diff out1.txt out2.txt
    Expected Result: Outputs are identical (deterministic from seed)
    Evidence: .omo/evidence/task-2-deterministic.txt
  ```

  **Evidence to Capture**:
  - [ ] task-2-keygen-output.txt — script output
  - [ ] task-2-deterministic.txt — diff result

  **Commit**: YES (groups with 3-7)
  - Message: `feat(docker): add foundation scripts and configs`
  - Files: `scripts/generate-keys.sh`

- [x] 3. Create `.env.docker` template

  **What to do**:
  - Create `.env.docker` at repo root with all required env vars for the Docker distribution
  - Include `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` (browser connects via host)
  - Include `NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated-anon-key>` (from Task 2 output)
  - Include internal Docker vars: `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`
  - Add `SUPABASE_AUTH_SITE_URL=http://localhost:3000` (magic-link redirect base)
  - Add `SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS=http://localhost:3000`
  - Add comments explaining each variable and noting that production users should regenerate keys

  **Must NOT do**:
  - Include `NEXT_PUBLIC_ENABLE_AUTH_MOCK`, `AUTH_E2E_MOCK`, or `E2E_MOCK_DB`
  - Use placeholder values like `your-key-here` — use actual generated values
  - Overwrite or modify `apps/web/.env.example`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single template file with known env var requirements

  **Parallelization**:
  - **Can Run In Parallel**: YES (but needs Task 2's key output — can use placeholder initially and update)
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-7)
  - **Blocks**: Task 8 (Dockerfile needs env vars)
  - **Blocked By**: None (can use Task 2 output)

  **References**:
  - `apps/web/.env.example` — Existing env template to mirror/supersede
  - `apps/web/src/lib/env.ts:1-2` — Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `supabase/config.toml:155-168` — Auth `site_url` and `additional_redirect_urls`

  **Acceptance Criteria**:
  - [ ] `.env.docker` exists at repo root
  - [ ] Contains `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
  - [ ] Contains `NEXT_PUBLIC_SUPABASE_ANON_KEY=<valid-key>`
  - [ ] Does NOT contain any mock-auth env vars (verify with grep)
  - [ ] Each variable has a comment explaining its purpose

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Env file has all required vars and no forbidden vars
    Tool: Bash
    Steps:
      1. Run: Select-String -Path ".env.docker" -Pattern "NEXT_PUBLIC_SUPABASE_URL"
      2. Run: Select-String -Path ".env.docker" -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      3. Run: Select-String -Path ".env.docker" -Pattern "POSTGRES_PASSWORD"
      4. Run: Select-String -Path ".env.docker" -Pattern "NEXT_PUBLIC_ENABLE_AUTH_MOCK" (expect NO MATCH)
    Expected Result: Required vars found, mock-auth vars absent
    Evidence: .omo/evidence/task-3-env-verify.txt
  ```

  **Evidence to Capture**:
  - [ ] task-3-env-verify.txt — grep results

  **Commit**: YES (groups with 2, 4-7)
  - Message: `feat(docker): add foundation scripts and configs`
  - Files: `.env.docker`

- [x] 4. Create `.dockerignore`

  **What to do**:
  - Create `.dockerignore` at repo root
  - Exclude: `node_modules/`, `.next/`, `dist/`, `coverage/`, `.git/`, `.env*` (keep `.env.docker`)
  - Exclude: `playwright-report/`, `test-results/`, `.omo/`, `.planning/`
  - Exclude: `*.md` (except README.md if needed), `*.log`, `supabase/.branches/`
  - Include: `!.env.docker` (whitelist override for the Docker env file)

  **Must NOT do**:
  - Exclude `supabase/migrations/` (needed by init container)
  - Exclude `packages/` source (needed for workspace dependency resolution at build time)
  - Exclude `pnpm-lock.yaml` (needed for `pnpm install --frozen-lockfile`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, well-known Docker convention

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)
  - **Blocks**: Task 8 (Dockerfile references .dockerignore)
  - **Blocked By**: None

  **References**:
  - `.gitignore` — Existing ignore patterns to mirror in .dockerignore
  - `pnpm-lock.yaml` — Must NOT be excluded

  **Acceptance Criteria**:
  - [ ] `.dockerignore` exists at repo root
  - [ ] `node_modules/` is excluded
  - [ ] `.git/` is excluded
  - [ ] `supabase/migrations/` is NOT excluded
  - [ ] `pnpm-lock.yaml` is NOT excluded

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Docker build context is minimal
    Tool: Bash
    Steps:
      1. Run: docker build --no-cache --dry-run . 2>&1 (or approximate with ls filtered by .dockerignore)
      2. Alternative: Create a temp dockerfile with "COPY . /tmp" and check image size
    Expected Result: build context excludes node_modules, .git, .next
    Evidence: .omo/evidence/task-4-dockerignore-verify.txt
  ```

  **Evidence to Capture**:
  - [ ] task-4-dockerignore-verify.txt

  **Commit**: YES (groups with 2-3, 5-7)
  - Message: `feat(docker): add foundation scripts and configs`
  - Files: `.dockerignore`

- [x] 5. Create Supabase init/migration runner script

  **What to do**:
  - Create `scripts/init-supabase.sh`
  - Script must: (1) wait for Postgres to be healthy (`pg_isready`), (2) apply all `.sql` files from `supabase/migrations/` in order, (3) apply `supabase/seed.sql` if it exists (currenly missing per `config.toml`), (4) exit with 0 on success
  - Use `psql` with connection details from env vars (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`)
  - Add timeout (max 60s waiting for Postgres) with clear error message on failure

  **Must NOT do**:
  - Add, modify, or delete any `.sql` files in `supabase/migrations/`
  - Create `supabase/seed.sql` if it doesn't exist (just skip that step gracefully)
  - Use `npx supabase` CLI commands (the init container won't have the Supabase CLI)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single well-bounded shell script with clear requirements
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)
  - **Blocks**: Task 9 (docker-compose references this script)
  - **Blocked By**: None

  **References**:
  - `supabase/migrations/` — 3 SQL files: `001_cr_device_reminder.sql`, `002_cr_seed_presets.sql`, `003_ch_core_hour.sql`
  - `supabase/config.toml:59-71` — `[db.migrations]` and `[db.seed]` configuration

  **Acceptance Criteria**:
  - [ ] `scripts/init-supabase.sh` exists and is executable
  - [ ] Script waits for Postgres before proceeding
  - [ ] Script applies all migration files in sorted order
  - [ ] Script handles missing `seed.sql` gracefully (no crash)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Script can be run inside a container with Postgres available
    Tool: Bash
    Preconditions: Docker running, Postgres container on localhost:54322 with correct credentials
    Steps:
      1. Set env vars: POSTGRES_HOST=localhost, POSTGRES_PORT=54322, POSTGRES_DB=postgres, POSTGRES_USER=postgres, POSTGRES_PASSWORD=test
      2. Run: bash scripts/init-supabase.sh
      3. Check exit code is 0
    Expected Result: Script applies migrations successfully, exit code 0
    Evidence: .omo/evidence/task-5-init-success.txt

  Scenario: Script fails gracefully when Postgres is unreachable
    Tool: Bash
    Steps:
      1. Set POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=19999 (no Postgres there)
      2. Run: bash scripts/init-supabase.sh with timeout
    Expected Result: Script outputs "Postgres not available" after timeout, exit code 1
    Evidence: .omo/evidence/task-5-timeout.txt
  ```

  **Evidence to Capture**:
  - [ ] task-5-init-success.txt
  - [ ] task-5-timeout.txt

  **Commit**: YES (groups with 2-4, 6-7)
  - Message: `feat(docker): add foundation scripts and configs`
  - Files: `scripts/init-supabase.sh`

- [x] 6. Create Docker entrypoint script for Next.js

  **What to do**:
  - Create `scripts/docker-entrypoint.sh`
  - Script must: (1) verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (fail early if not), (2) wait for Supabase API to be healthy (simple `curl` health check), (3) exec `node server.js` (the standalone output entrypoint)
  - Add a startup banner printing the app URL and Inbucket URL
  - Must NOT enable mock auth under any circumstances

  **Must NOT do**:
  - Set or reference `NEXT_PUBLIC_ENABLE_AUTH_MOCK`, `AUTH_E2E_MOCK`, or `E2E_MOCK_DB`
  - Start the dev server (`next dev`) — this is production mode only
  - Override `NEXT_PUBLIC_*` env vars at runtime (they're baked in at build time)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single well-bounded shell script
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)
  - **Blocks**: Task 8 (Dockerfile uses this as ENTRYPOINT)
  - **Blocked By**: None

  **References**:
  - `apps/web/src/lib/env.ts` — Required env vars that the app checks at startup
  - `apps/web/package.json` — Scripts: `build`, `start`
  - Next.js standalone docs — Entrypoint is `server.js` in `.next/standalone/`

  **Acceptance Criteria**:
  - [ ] `scripts/docker-entrypoint.sh` exists and is executable
  - [ ] Script validates required env vars (fail with clear message if missing)
  - [ ] Script waits for Supabase API before starting Next.js
  - [ ] Script does NOT reference any mock-auth env vars

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Entrypoint fails fast when env vars missing
    Tool: Bash
    Steps:
      1. Unset NEXT_PUBLIC_SUPABASE_URL
      2. Run: bash scripts/docker-entrypoint.sh
    Expected Result: Script exits 1 with "NEXT_PUBLIC_SUPABASE_URL not set" message
    Evidence: .omo/evidence/task-6-missing-env.txt

  Scenario: Entrypoint prints banner with URLs
    Tool: Bash
    Steps:
      1. Set NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
      2. Set NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
      3. Run: bash scripts/docker-entrypoint.sh (let it fail on missing node server.js — just check banner)
    Expected Result: Output contains "http://localhost:3000" and "http://localhost:54324"
    Evidence: .omo/evidence/task-6-banner.txt
  ```

  **Evidence to Capture**:
  - [ ] task-6-missing-env.txt
  - [ ] task-6-banner.txt

  **Commit**: YES (groups with 2-5, 7)
  - Message: `feat(docker): add foundation scripts and configs`
  - Files: `scripts/docker-entrypoint.sh`

- [x] 7. Verify existing tests pass after next.config.ts change

  **What to do**:
  - After Task 1 modifies `next.config.ts`, run the full test suite
  - Run `pnpm test` (Vitest — 341 tests across all workspaces)
  - Run `pnpm test:e2e` (Playwright — 53 specs in apps/web)
  - Run `pnpm typecheck` (TypeScript across all workspaces)
  - If any regression: investigate and fix (likely path alias or build output issues)

  **Must NOT do**:
  - Modify any test files
  - Skip failing tests or lower coverage thresholds
  - Change `pnpm test` or `pnpm test:e2e` scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running existing test commands, verifying output
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (must run AFTER Task 1 completes)
  - **Blocks**: Wave 2 (gate — all Wave 2 tasks depend on tests passing)
  - **Blocked By**: Task 1

  **References**:
  - `apps/web/package.json` — Test scripts
  - Root `package.json` — `pnpm test`, `pnpm test:e2e`, `pnpm typecheck`

  **Acceptance Criteria**:
  - [ ] `pnpm test` → exit 0, 341 tests pass
  - [ ] `pnpm test:e2e` → exit 0, 53 specs pass
  - [ ] `pnpm typecheck` → exit 0, no errors

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full test suite passes after config change
    Tool: Bash
    Steps:
      1. Run: pnpm typecheck (from repo root)
      2. Run: pnpm test (from repo root)
      3. Run: pnpm test:e2e (from apps/web)
    Expected Result: All three exit 0, no failures
    Evidence: .omo/evidence/task-7-test-results.txt
  ```

  **Evidence to Capture**:
  - [ ] task-7-test-results.txt — combined output of all three commands

  **Commit**: NO (verification only — if tests fail, fix Task 1)

---

- [x] 8. Create multi-stage Dockerfile for Next.js production build

  **What to do**:
  - Create `Dockerfile` at repo root with 3 stages:
    - **Stage 1 (deps)**: Use `node:20-alpine`, install pnpm, copy `pnpm-lock.yaml` + workspace `package.json` files, run `pnpm install --frozen-lockfile --prod=false`
    - **Stage 2 (build)**: Copy source, copy `node_modules` from stage 1, copy `.env.docker` as `.env.production`, run `pnpm build` (in `apps/web`), verify `.next/standalone/server.js` exists
    - **Stage 3 (runtime)**: Use `node:20-alpine` minimal image, copy standalone output from stage 2, copy `scripts/docker-entrypoint.sh`, set `ENTRYPOINT`, expose port 3000
  - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as `ARG` (received from --build-arg or .env.docker)
  - Add `HEALTHCHECK` directive

  **Must NOT do**:
  - Include `NEXT_PUBLIC_ENABLE_AUTH_MOCK` or any mock-auth env var
  - Copy `node_modules` wholesale — use standalone output tracing
  - Use `next dev` — build stage runs `next build`, runtime runs `node server.js`
  - Hardcode any secrets in the Dockerfile

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-stage Docker build with pnpm monorepo — requires careful dependency tracing and build arg handling. High risk of subtle errors with workspace packages.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with Tasks 9, 10, 11)
  - **Blocks**: Task 12 (CI workflow), Task 14 (smoke test)
  - **Blocked By**: Tasks 1, 3, 4, 6

  **References**:
  - `apps/web/next.config.ts` (after Task 1) — `output: "standalone"` and `outputFileTracingRoot`
  - `apps/web/package.json` — Build script, dependencies
  - Root `package.json` — Workspace definitions
  - `.env.docker` (after Task 3) — Required build args
  - `pnpm-lock.yaml` — Frozen dependency snapshot
  - `scripts/docker-entrypoint.sh` (after Task 6) — ENTRYPOINT target

  **Acceptance Criteria**:
  - [ ] `docker build -t efficiency-memo:test .` succeeds
  - [ ] Image size under 300MB (verified by `docker images`)
  - [ ] Image does NOT contain `NEXT_PUBLIC_ENABLE_AUTH_MOCK` (verified by `docker inspect`)
  - [ ] `docker run --rm efficiency-memo:test node -e "console.log('ok')"` works

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Docker build succeeds and produces runnable image
    Tool: Bash
    Steps:
      1. Run: docker build -t efficiency-memo:test .  (allow up to 5 minutes)
      2. Check exit code is 0
      3. Run: docker images efficiency-memo:test --format "{{.Size}}"
      4. Assert size < 300MB
    Expected Result: Build succeeds, image under 300MB
    Failure Indicators: Build fails, image exceeds 300MB, or env vars not baked in
    Evidence: .omo/evidence/task-8-build-success.txt

  Scenario: Image does not contain mock-auth env vars
    Tool: Bash
    Steps:
      1. Run: docker run --rm --entrypoint sh efficiency-memo:test -c "env | grep MOCK"
    Expected Result: No output (no MOCK env vars in production image)
    Failure Indicators: Any output containing ENABLE_AUTH_MOCK, E2E_MOCK, or MOCK_DB
    Evidence: .omo/evidence/task-8-no-mock-env.txt

  Scenario: Image fails fast when NEXT_PUBLIC_SUPABASE_URL missing
    Tool: Bash
    Steps:
      1. Run: docker run --rm -e NEXT_PUBLIC_SUPABASE_URL="" efficiency-memo:test
      2. Check exit code is 1 (entrypoint validation)
    Expected Result: Container exits 1 with clear error message
    Evidence: .omo/evidence/task-8-missing-env-error.txt
  ```

  **Evidence to Capture**:
  - [ ] task-8-build-success.txt
  - [ ] task-8-no-mock-env.txt
  - [ ] task-8-missing-env-error.txt

  **Commit**: YES (groups with Task 9)
  - Message: `feat(docker): add Dockerfile and docker-compose.yml`
  - Files: `Dockerfile`

- [x] 9. Create docker-compose.yml with Supabase service orchestration

  **What to do**:
  - Create `docker-compose.yml` at repo root with 6 services:
    - **`db`**: `postgres:17-alpine` — port 54322, named volume `pgdata`, env vars from `.env.docker`
    - **`auth`**: `supabase/gotrue:v2.177.0` — port 54321, connects to `db`, uses `JWT_SECRET` + `ANON_KEY` + `SERVICE_ROLE_KEY` from `.env.docker`
    - **`rest`**: `postgrest/postgrest:v14.0` — internal, connects to `db`, uses `ANON_KEY` for JWT verification
    - **`studio`**: `supabase/studio:2025.06.04` — port 54323, connects to `rest` and `auth`
    - **`inbucket`**: `inbucket/inbucket:3.0.4` — ports 54324 (web UI), 54325 (SMTP); `auth` connects to it for email delivery
    - **`nextjs`**: builds from local `Dockerfile` (or references image from ghcr.io) — port 3000, depends on `auth` and `rest` being healthy
  - All services on a shared Docker network, referencing each other by service name
  - Add `depends_on` with `condition: service_healthy` for startup ordering
  - Add `healthcheck` for each service (at minimum: `db`, `auth`, `rest`, `nextjs`)
  - The `db` service must auto-apply migrations on first start via `scripts/init-supabase.sh` mounted as an init script
  - Use `${VAR}` syntax to pull values from `.env.docker`

  **Must NOT do**:
  - Use `version:` in compose (deprecated in modern Docker)
  - Include Realtime, Storage, Edge Functions, Analytics services (not used by the app)
  - Expose `db` port 54322 to host unless needed for debugging (keep internal by default)
  - Use `restart: always` — use `unless-stopped` for graceful shutdowns
  - Hardcode any secrets in the compose file (all from `.env`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-service orchestration with Supabase self-hosted images. Requires understanding of GoTrue configuration, PostgREST schema exposure, inter-container networking, health check design, and migration execution ordering. High risk of subtle misconfiguration.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8 — different file, independent after foundation)
  - **Parallel Group**: Wave 2 (with Task 8)
  - **Blocks**: Tasks 10, 11, 12, 14
  - **Blocked By**: Tasks 2, 5

  **References**:
  - `supabase/config.toml` — Port mappings, auth settings, service configuration
  - `supabase/migrations/` — 3 SQL migration files to apply
  - `.env.docker` (after Task 3) — All required env vars
  - `scripts/init-supabase.sh` (after Task 5) — Migration runner
  - `scripts/generate-keys.sh` (after Task 2) — Key derivation approach
  - Supabase self-hosted docs: GoTrue configuration, PostgREST schema exposure
  - `Dockerfile` (after Task 8) — Next.js image reference

  **Acceptance Criteria**:
  - [ ] `docker compose config` validates without errors
  - [ ] `docker compose up -d` starts all 6 services
  - [ ] `docker compose ps` shows all services as healthy within 60s
  - [ ] `curl http://localhost:54321/auth/v1/health` returns 200
  - [ ] `curl http://localhost:54324` returns Inbucket UI

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full stack starts and all services become healthy
    Tool: Bash
    Preconditions: .env.docker exists with valid keys, Dockerfile builds successfully
    Steps:
      1. Run: docker compose up -d --wait (wait for health checks, max 120s)
      2. Run: docker compose ps --format json | ConvertFrom-Json | ForEach-Object { if ($_.Health -ne "healthy") { throw "$($_.Service) not healthy" } }
      3. Run: curl -f http://localhost:3000
      4. Run: curl -f http://localhost:54321/auth/v1/health
      5. Run: curl -f http://localhost:54324
    Expected Result: All services healthy, app responds 200, auth and inbucket accessible
    Failure Indicators: Any service not healthy, curl fails, 5xx errors
    Evidence: .omo/evidence/task-9-stack-healthy.txt

  Scenario: Data persists across container restarts
    Tool: Bash
    Preconditions: Stack running, created some data via the app
    Steps:
      1. Run: docker compose down
      2. Run: docker compose up -d --wait
      3. Run: docker compose exec db psql -U postgres -c "SELECT count(*) FROM cr_devices;"
    Expected Result: Table data persists (not empty after restart)
    Evidence: .omo/evidence/task-9-data-persistence.txt

  Scenario: Mock auth bypass endpoint returns 404 in production
    Tool: Bash
    Preconditions: Stack running
    Steps:
      1. Run: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/mock-auth/bypass?email=test@test.com
    Expected Result: HTTP 404 (mock auth not available in production image)
    Evidence: .omo/evidence/task-9-no-mock-bypass.txt
  ```

  **Evidence to Capture**:
  - [ ] task-9-stack-healthy.txt
  - [ ] task-9-data-persistence.txt
  - [ ] task-9-no-mock-bypass.txt

  **Commit**: YES (groups with Task 8)
  - Message: `feat(docker): add Dockerfile and docker-compose.yml`
  - Files: `docker-compose.yml`

- [x] 10. Create setup.sh for Unix/macOS

  **What to do**:
  - Create `scripts/setup.sh` with shebang `#!/usr/bin/env bash`
  - Steps: (1) check Docker installed (`docker --version`), (2) check `docker compose` available, (3) check `.env.docker` exists (if not, prompt to run `./scripts/generate-keys.sh` first), (4) run `docker compose up -d`, (5) print URLs: `http://localhost:3000` (app), `http://localhost:54324` (Inbucket)
  - Use colors (green ✓, red ✗) for status output
  - All output in English
  - Exit with clear error message if Docker is missing

  **Must NOT do**:
  - Install Docker or any system packages
  - Modify `.env.docker` or any config file
  - Run `npm install` or `pnpm install` (Docker handles this)
  - Use `docker-compose` (legacy) — use `docker compose` (plugin)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single well-bounded shell script, straightforward logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 11 — different file)
  - **Parallel Group**: Wave 2 (with Task 11)
  - **Blocks**: None directly
  - **Blocked By**: Task 9 (needs docker-compose.yml to exist)

  **References**:
  - `docker-compose.yml` (after Task 9) — Service names, ports
  - `.env.docker` (after Task 3) — Env file to check existence

  **Acceptance Criteria**:
  - [ ] `scripts/setup.sh` exists, is executable (`chmod +x`), has valid shebang
  - [ ] Script detects missing Docker and exits with clear message
  - [ ] Script detects missing `.env.docker` and prints instructions
  - [ ] Script runs `docker compose up -d` when all checks pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Script detects missing Docker
    Tool: Bash (WSL or Git Bash on Windows)
    Steps:
      1. Temporarily rename docker binary: (skip on systems without bash, test logic only)
      2. Run: bash scripts/setup.sh 2>&1
    Expected Result: Script exits 1 with "Docker not found" message
    Evidence: .omo/evidence/task-10-no-docker.txt

  Scenario: Script runs compose when everything is ready
    Tool: Bash
    Preconditions: Docker running, .env.docker exists
    Steps:
      1. Run: bash scripts/setup.sh
      2. Verify: docker compose ps shows services running
    Expected Result: Script exits 0, all services up
    Evidence: .omo/evidence/task-10-setup-success.txt
  ```

  **Evidence to Capture**:
  - [ ] task-10-no-docker.txt
  - [ ] task-10-setup-success.txt

  **Commit**: YES (groups with Task 11)
  - Message: `feat(docker): add setup scripts`
  - Files: `scripts/setup.sh`

- [x] 11. Create setup.ps1 for Windows PowerShell

  **What to do**:
  - Create `scripts/setup.ps1` with `#Requires -Version 7` (requires PowerShell 7+)
  - Steps: (1) check Docker installed (`docker --version`), (2) check `docker compose` available, (3) check `.env.docker` exists (if not, print instructions to run `bash scripts/generate-keys.sh` via WSL/Git Bash), (4) run `docker compose up -d`, (5) print URLs
  - Use `Write-Host` with colors for status output
  - Handle `$LASTEXITCODE` properly after each command
  - Exit with clear error if Docker is missing

  **Must NOT do**:
  - Require admin privileges
  - Modify system PATH or install anything
  - Use `cmd` or `cmd.exe` style commands — pure PowerShell

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single well-bounded PowerShell script, straightforward logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 10)
  - **Parallel Group**: Wave 2 (with Task 10)
  - **Blocks**: None directly
  - **Blocked By**: Task 9 (needs docker-compose.yml)

  **References**:
  - `scripts/setup.sh` (after Task 10) — Mirror the logic in PowerShell syntax
  - `docker-compose.yml` (after Task 9) — Service names, ports

  **Acceptance Criteria**:
  - [ ] `scripts/setup.ps1` exists, starts with `#Requires -Version 7`
  - [ ] Script detects missing Docker and exits with clear message
  - [ ] Script detects missing `.env.docker` and prints instructions
  - [ ] Script runs `docker compose up -d` when all checks pass

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Script detects missing Docker on Windows
    Tool: Bash (pwsh)
    Steps:
      1. Run: pwsh -Command "& { $env:PATH=''; ./scripts/setup.ps1 }" 2>&1
    Expected Result: Script exits 1 with "Docker not found" message
    Evidence: .omo/evidence/task-11-no-docker.txt

  Scenario: Script output includes URLs
    Tool: Bash (pwsh)
    Preconditions: Docker running, .env.docker exists
    Steps:
      1. Run: pwsh -File scripts/setup.ps1 2>&1 | Out-File output.txt
      2. Check output.txt contains "http://localhost:3000"
    Expected Result: Output contains both app URL and Inbucket URL
    Evidence: .omo/evidence/task-11-urls.txt
  ```

  **Evidence to Capture**:
  - [ ] task-11-no-docker.txt
  - [ ] task-11-urls.txt

  **Commit**: YES (groups with Task 10)
  - Message: `feat(docker): add setup scripts`
  - Files: `scripts/setup.ps1`

- [x] 12. Create GitHub Actions release workflow

  **What to do**:
  - Create `.github/workflows/release.yml`
  - Trigger: on push of tags matching `v*` (e.g., `v1.0.0`, `v2.1.3`)
  - Jobs (sequential):
    1. **test**: Checkout → Setup Node 20 + pnpm 9 → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm test` → `pnpm test:e2e`
    2. **build** (needs test): Checkout → Setup Docker Buildx → `docker build -t ghcr.io/${{ github.repository }}:${{ github.ref_name }} -t ghcr.io/${{ github.repository }}:latest .` → Push to ghcr.io
    3. **release** (needs build): Create GitHub Release with release notes (auto-generated from commits), attach zip containing `docker-compose.yml`, `.env.docker`, `release/README.md`
  - Add permissions: `packages: write`, `contents: write`
  - Use `docker/metadata-action` and `docker/build-push-action` for build
  - Use `softprops/action-gh-release` for creating the release + uploading zip

  **Must NOT do**:
  - Trigger on every push — only on version tags
  - Include mock-auth env vars in the CI environment
  - Upload source code to the release (only compose + config + README)
  - Use Docker Hub (ghcr.io only — free for public repos, included with GitHub)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex CI/CD pipeline with multi-job orchestration, Docker buildx, GitHub Container Registry authentication, and release artifact creation. Requires understanding of GitHub Actions syntax, Docker layer caching, and release packaging.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 13 (release README references the workflow)
  - **Blocked By**: Tasks 8, 9 (needs Dockerfile and compose to exist)

  **References**:
  - `Dockerfile` (after Task 8) — Build target
  - `docker-compose.yml` (after Task 9) — Included in release zip
  - `.env.docker` (after Task 3) — Included in release zip
  - GitHub Actions docs: `docker/build-push-action`, `docker/metadata-action`, `softprops/action-gh-release`
  - `pnpm-lock.yaml` — For `--frozen-lockfile` install

  **Acceptance Criteria**:
  - [ ] `.github/workflows/release.yml` is valid YAML
  - [ ] Workflow triggers on `v*` tag push
  - [ ] `test` job runs TypeScript + Vitest + Playwright
  - [ ] `build` job builds and pushes to `ghcr.io/<repo>:<tag>` and `ghcr.io/<repo>:latest`
  - [ ] `release` job creates GitHub Release with zip artifact
  - [ ] Permissions configured: `packages: write`, `contents: write`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Workflow YAML is valid
    Tool: Bash
    Steps:
      1. Run: python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" (if Python available)
      2. Alternative: Use online YAML validator or `yamllint` if installed
    Expected Result: YAML parses without errors
    Evidence: .omo/evidence/task-12-yaml-valid.txt

  Scenario: Workflow references correct Dockerfile path
    Tool: Bash
    Steps:
      1. Run: Select-String -Path ".github/workflows/release.yml" -Pattern "Dockerfile"
    Expected Result: At least one reference to the repo-root Dockerfile
    Evidence: .omo/evidence/task-12-dockerfile-ref.txt

  Scenario: Workflow includes step to create zip for release
    Tool: Bash
    Steps:
      1. Run: Select-String -Path ".github/workflows/release.yml" -Pattern "zip|Compress-Archive|tar"
    Expected Result: At least one reference to zip or archive creation
    Evidence: .omo/evidence/task-12-zip-step.txt
  ```

  **Evidence to Capture**:
  - [ ] task-12-yaml-valid.txt
  - [ ] task-12-dockerfile-ref.txt
  - [ ] task-12-zip-step.txt

  **Commit**: YES
  - Message: `ci: add GitHub Actions release workflow`
  - Files: `.github/workflows/release.yml`

- [x] 13. Create release README for end users

  **What to do**:
  - Create `release/README.md` — the documentation shipped with the release zip
  - Sections:
    1. **Quick Start**: 3-step guide (install Docker → run setup → open browser)
    2. **What's Included**: List of services, ports, and what each does
    3. **Prerequisites**: Docker (any modern version), 4GB+ RAM
    4. **Setup**: `bash setup.sh` or `pwsh setup.ps1`
    5. **Accessing the App**: `http://localhost:3000`, sign-in flow, Inbucket at `http://localhost:54324`
    6. **Upgrading**: `docker compose pull && docker compose up -d` (or download new zip)
    7. **Troubleshooting**: Port conflicts, Docker not running, data reset
    8. **Security Note**: Keys are for local use only — regenerate for production self-hosting

  **Must NOT do**:
  - Reference Vercel deployment
  - Include development instructions (npm install, dev server, etc.)
  - Use placeholder text — all instructions must be concrete and tested
  - Include links that would break offline

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation writing — clear, concise, end-user-facing instructions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14 — independent)
  - **Parallel Group**: Wave 3 (with Task 14)
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 9, 10 (needs to reference actual file paths and commands)

  **References**:
  - `docker-compose.yml` (after Task 9) — Service names, ports
  - `scripts/setup.sh` (after Task 10) — Setup command to document
  - `.env.docker` (after Task 3) — Config vars to explain

  **Acceptance Criteria**:
  - [ ] `release/README.md` exists
  - [ ] Contains "Quick Start" section with ≤3 steps
  - [ ] Contains troubleshooting section
  - [ ] No references to npm, pnpm, Node.js, or Vercel
  - [ ] All commands are copy-pasteable and verified

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: README contains required sections
    Tool: Bash
    Steps:
      1. Run: Select-String -Path "release/README.md" -Pattern "Quick Start|Prerequisites|Troubleshooting|Security"
    Expected Result: All 4 section headers found
    Evidence: .omo/evidence/task-13-sections.txt

  Scenario: README has no dev-only references
    Tool: Bash
    Steps:
      1. Run: Select-String -Path "release/README.md" -Pattern "pnpm|npm install|vercel|dev server"
    Expected Result: No matches (clean of dev references)
    Evidence: .omo/evidence/task-13-no-dev-refs.txt
  ```

  **Evidence to Capture**:
  - [ ] task-13-sections.txt
  - [ ] task-13-no-dev-refs.txt

  **Commit**: YES (groups with Task 14)
  - Message: `docs: add release README and verify`
  - Files: `release/README.md`

- [x] 14. End-to-end smoke verification of the full Docker stack

  **What to do**:
  - From a completely clean state (no running containers, no volumes):
    1. Build the Docker image: `docker compose build`
    2. Start everything: `docker compose up -d --wait`
    3. Verify Next.js app: `curl -f http://localhost:3000` → HTTP 200
    4. Verify sign-in page: `curl -f http://localhost:3000/sign-in` → HTTP 200, contains "Welcome back"
    5. Verify Inbucket: `curl -f http://localhost:54324` → HTTP 200
    6. Verify Supabase API: `curl http://localhost:54321/auth/v1/health` → HTTP 200
    7. Verify data persistence: `docker compose down && docker compose up -d --wait` → repeat step 3
    8. Run `docker compose down -v` to clean up
  - If any step fails, investigate and report which step + error

  **Must NOT do**:
  - Skip cleanup (`docker compose down -v`) — leave no state behind
  - Assume previous steps worked — verify each independently

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: End-to-end system verification requiring Docker operations and multi-service health checking
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13 — independent)
  - **Parallel Group**: Wave 3 (with Task 13)
  - **Blocks**: Final Wave (gate — all final reviews depend on verification passing)
  - **Blocked By**: Tasks 8, 9

  **References**:
  - `docker-compose.yml` (after Task 9) — Service definitions
  - `Dockerfile` (after Task 8) — Build target

  **Acceptance Criteria**:
  - [ ] `docker compose build` succeeds
  - [ ] `docker compose up -d --wait` succeeds within 120s
  - [ ] All 6 curl checks return expected HTTP status
  - [ ] Clean restart preserves data (2nd compose up succeeds)
  - [ ] `docker compose down -v` cleans up completely

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full clean-start → verify → restart → verify → cleanup
    Tool: Bash
    Steps:
      1. Run: docker compose down -v (ensure clean state)
      2. Run: docker compose build 2>&1 | Tee-Object -FilePath build.log
      3. Run: docker compose up -d --wait 2>&1 | Tee-Object -FilePath up.log
      4. Run: $urls = @("http://localhost:3000", "http://localhost:3000/sign-in", "http://localhost:54324", "http://localhost:54321/auth/v1/health")
      5. ForEach ($url in $urls) { curl -f -o NUL $url; if ($LASTEXITCODE -ne 0) { throw "Failed: $url" } }
      6. Run: docker compose down
      7. Run: docker compose up -d --wait
      8. Run: curl -f -o NUL http://localhost:3000
      9. Run: docker compose down -v
    Expected Result: All steps succeed, no errors
    Evidence: .omo/evidence/task-14-full-smoke-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-14-full-smoke-test.txt — combined output of all verification steps

  **Commit**: NO (verification only — report results)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present to user, get explicit "okay".
> Never mark F1-F4 as checked before getting user's okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Compare deliverables against plan.
  Output: `Must Have [8/8] | Must NOT Have [11/11] | Tasks [14/14] | VERDICT: APPROVE`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `docker build` + `docker compose config`. Review all new files (Dockerfile, compose, scripts, workflows) for: hardcoded secrets, insecure defaults, missing error handling, unused code. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [N/A — no Docker locally] | Compose config [VALID] | Files [4 clean/0 issues] | F2 prior findings [5/5 fixed] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run `docker compose down -v && docker compose up -d`. Verify: `curl http://localhost:3000` returns 200 within 60s, `/sign-in` page loads, `http://localhost:54324` (Inbucket) accessible. Test `docker compose down && docker compose up -d` (data preserved). Save to `.omo/evidence/final-qa/`.
  Output: `Structural verification [PASS] | Cross-references [PASS] | VERDICT: APPROVE` (note: dynamic smoke test skipped — Docker not available locally)

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files created. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [13/14 compliant] | Contamination [CLEAN] | Unaccounted [.docker/keys-seed.txt — pragmatic extension, seed for deterministic key gen] | VERDICT: APPROVE`

---

## Commit Strategy

- **1**: `feat(docker): add output: "standalone" to next.config.ts` — `apps/web/next.config.ts`
- **2-7**: `feat(docker): add foundation scripts and configs` — `scripts/`, `.env.docker`, `.dockerignore`
- **8-9**: `feat(docker): add Dockerfile and docker-compose.yml` — `Dockerfile`, `docker-compose.yml`
- **10-11**: `feat(docker): add setup scripts` — `scripts/setup.sh`, `scripts/setup.ps1`
- **12**: `ci: add GitHub Actions release workflow` — `.github/workflows/release.yml`
- **13-14**: `docs: add release README and verify` — `release/README.md`

---

## Success Criteria

### Verification Commands
```bash
# Build image
docker build -t efficiency-memo:test .  # Expected: exit 0, image < 300MB

# Verify compose config
docker compose config  # Expected: no errors

# Full stack smoke test
docker compose up -d
curl -f http://localhost:3000  # Expected: HTTP 200

# Existing tests unchanged
pnpm test      # Expected: 341 passed
pnpm test:e2e  # Expected: 53 passed
```

### Final Checklist
- [ ] All "Must Have" present (Dockerfile, compose, scripts, CI, docs, release artifacts)
- [ ] All "Must NOT Have" absent (no mock-auth in prod image, no migration changes, no Vercel references)
- [ ] All existing tests pass (341 Vitest + 53 Playwright)
- [ ] Docker Compose starts and serves the app within 60s
- [ ] GitHub Actions workflow file is valid YAML and follows release-on-tag pattern
