# EfficiencyMemo

A local-first desktop toolkit for deliberate focus and healthier work rhythms. It ships as a Tauri v2 application with local SQLite storage.

## About

EfficiencyMemo is a pnpm monorepo with independent tools behind one desktop workspace. CoreHour records and reviews focus time; Pause & Hydrate provides local break and hydration reminders. An optional Windows desktop pet can surface those reminders instead of system notifications. WebDAV sync code is retained but outside the current product scope.

## Features

### CoreHour — time tracking with periodic check-ins
- Choose a 15, 30, or 60 minute interval for the next session
- Start, pause, continue, and end sessions; an interrupted session restores paused
- Review sleep, delayed-timer, and Windows system-idle intervals before they change confirmed focus time
- Add missed time manually and edit completed session activity, tag, start, or end time
- Plan focus blocks separately from recorded time, compare plan and actual in day/week timelines, and explicitly convert a plan into a session
- Move plans between week days, resize them on a 15-minute grid, and review planned time, actual time, completion, and variance
- Add missed time manually from the Timeline toolbar without inflating actual time from unconfirmed plans
- Set a daily focus target and review weekly progress, activity, and tag trends in Insights
- Categorize a due check-in with one tag and an optional note, or skip it as uncategorized
- Review daily totals, tag totals, sessions, and check-ins
- Receive one native notification when a check-in becomes due while the app is backgrounded

### Pause & Hydrate — break and hydration reminders
- Configure independent movement-break and hydration intervals
- Complete, postpone for 10 minutes, or mute a reminder for the day
- Defer due reminders while a CoreHour session is active
- Review today's completed actions from timestamped local events

### Desktop pet (Windows)
- Choose Amber Cat, Lantern Moth, or Pocket Robot; Clawd on Desk groups its Clawd, Calico, and Cloudling themes under one pet with a theme picker, and Mole Baby groups its seed, growth, and five evolution forms under one pet with a form picker
- Import a Codex Pet package; single-sheet V1/V2 packs and multi-form V3 ZIPs are supported
- Show due reminders in a transparent, always-on-top pet instead of a system notification
- React to focus state with idle, working, waiting, greeting, walk, and sleep poses; V2 pets follow the nearby pointer
- Drag the pet, dock it to a screen edge, and recover its window from Pet Assistant
- Clawd and Mole Baby are third-party characters with separate notices under `apps/desktop/src/assets/pets/`; they are not covered by the MIT license

### Appearance
- Choose System, Light, or Dark mode independently from the color palette
- Switch between Ember, Grove, and Tide palettes across every tool
- Keep focus, planned, actual, recovery, hydration, privacy, and suggestion colors semantically consistent across palettes
- Change application language from the same global settings page

### Data & Privacy
- Create a single-file local backup with record and preference preview before restore
- Export readable CoreHour or Pause & Hydrate JSON without exposing keychain secrets
- Reset one module or all local data with explicit destructive confirmation

## Quick Start — Desktop App (recommended)

The Tauri desktop app is a single `.exe` (or `.msi` installer) that runs locally with a local SQLite database. No container runtime, no cloud account, no internet required for core features.

**Prerequisites:** Node.js ≥20, pnpm ≥9, Rust toolchain (only needed to build from source; pre-built releases will not require Rust)

### From source

```bash
# Install pnpm deps
pnpm install

# Launch the desktop app (dev mode with hot-reload)
pnpm --filter desktop tauri:dev
```

The first launch takes a few minutes while Rust compiles the native shell. Subsequent launches are instant.

To build a production installer:

```bash
pnpm --filter desktop tauri:build
```

Output:
- Windows: `apps/desktop/src-tauri/target/release/bundle/msi/EfficiencyMemo_0.0.2_x64_en-US.msi`
- Standalone `.exe`: `apps/desktop/src-tauri/target/release/EfficiencyMemo.exe`

On first launch the app creates its database in `%APPDATA%/com.efficiency-memo.app/efficiency-memo.db` (Windows) or `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db` (macOS). All 7 migrations run automatically.

### Using the app

1. **Launch the app** — A local profile is selected or created automatically; there is no sign-in step.
2. **Create tags** — Open **CoreHour → Tags** and add the categories you want to use.
3. **Set your cadence** — Open **CoreHour → Settings**, choose a check-in interval and a daily focus goal, then save.
4. **Track time** — Open **CoreHour → Today**, describe the activity or continue a recent favorite, then start a session. At each due check-in, choose one tag and an optional note, or skip. Allow the operating-system notification permission for background reminders.
   If CoreHour detects an uncertain suspend or idle interval, review how much time to include before continuing.
5. **Plan and review time** — Open **CoreHour → Timeline** to add planned focus, move or resize planned blocks, switch between day and week views, compare plan with actual, or use **Add time** for missed sessions.
6. **Review the week** — Open **CoreHour → Insights** to compare confirmed focus with last week, inspect goal consistency, and review activity and tag trends. Plans never enter these totals.
7. **Set healthy reminders** — Open **Pause & Hydrate**, enable either reminder, choose its interval, and save. Due reminders wait while CoreHour is active.
8. **Adjust appearance** — Open **Settings** to choose a mode, color palette, and language. Changes preview and persist immediately.
9. **Choose a desktop pet** — Open **Pet Assistant** to enable the Windows pet, pick a bundled or imported Codex Pet package, and choose a form for multi-form pets such as Mole Baby. Send a test reminder to check the result.
10. **Control your data** — Open **Settings → Data & privacy** to create a portable backup, preview a restore, export readable module JSON, or reset local records.

Use the native Tauri window opened by `tauri:dev`; `http://localhost:1420` is only the Vite development server and does not provide the Tauri SQLite bridge.

For platform-specific setup and troubleshooting, see [docs/Installation.md](docs/Installation.md).

## Scripts

| Command | Description |
|---|---|
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode (HMR + DevTools) |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend only (no Rust) |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run Vitest across all workspaces |

## Architecture

EfficiencyMemo is organized as a pnpm monorepo. The design system lives in `packages/shared/` (cross-tool types and constants) and `packages/ui/` (React + Tailwind v4 component library). Both packages are consumed by the desktop app via `workspace:*` references.

### Desktop (`apps/desktop/`)

```
apps/desktop/
├── src/                   # React + Vite frontend (SPA, no SSR)
│   ├── features/          # CoreHour, Pause & Hydrate, and retained legacy code
│   ├── pages/             # Route pages (dashboard, tools/*, settings/sync)
│   ├── components/        # Shell layout
│   ├── lib/               # db/profile wrapper, sync wrapper, tool registry
│   └── main.tsx           # React entry
└── src-tauri/             # Rust native shell
    ├── src/               # Plugin registration and Tauri command handlers
    ├── migrations/        # 7 SQLite migration files
    └── tauri.conf.json    # Bundle config (msi + nsis targets)
```

Key design choices:
- **No SSR** — Tauri uses a webview, not a browser, so server-side rendering is unnecessary. Vite + React Router handles all routing.
- **Local SQLite** — Tauri plugin-sql opens `sqlite:efficiency-memo.db` from the OS app-data directory. All 7 migrations run on first launch.
- **CoreHour session state** — Active-session progress is kept locally and restored as paused after an app restart, so closed-app time is never counted.
- **Bilingual workspace** — The desktop shell and active tools support English and Simplified Chinese, with the selected language persisted locally.
- **Appearance preferences** — System/light/dark mode and Ember/Grove/Tide palettes are persisted locally; the workspace shell retains a quick mode toggle.
- **Data control** — Portable .ememo files are validated SQLite snapshots with stable appearance preferences; restores are staged and applied before the next database connection opens.
- **Native notifications** — `tauri-plugin-notification` handles due CoreHour check-ins and Pause & Hydrate reminders.
- **Desktop pets** — Bundled Codex Pet packages live in `apps/desktop/src/assets/pets/` and follow the V1/V2 cell contract in `src/lib/codex-pet-atlas.json`; the Windows-only pet window in `src-tauri/src/desktop_pet.rs` renders reminders, poses, docking, and pointer gaze. A V3 package can group multiple named forms under one pet identity (`docs/specs/desktop-pet-variants.md`). Third-party packages keep their notices beside the package and in the installed `src-tauri/resources/THIRD-PARTY-NOTICES.md`.
- **Local archive** — retired experiments may be kept under the ignored root `bak/` directory and are not part of the product or active repository tree. WebDAV sync is not part of the current product scope.

### Shared packages

- `packages/shared/` — cross-tool types (`ToolManifest`) and constants (`APP_NAME`)
- `packages/ui/` — `Button`, `Card`, `Modal`, `Sidebar`, `Shell`, plus `Input`, `Alert`, `EmptyState`, `PageHeader`. Components consume the shared light/dark design tokens from `apps/desktop/src/index.css`. Consumed by the desktop app without modification.

## Tech Stack

| Technology | Version | Used by |
|---|---|---|
| Tauri | 2 | Desktop shell |
| Vite | 6 | Desktop frontend |
| React | 19.2.4 | Frontend |
| React Router | 7 | Desktop routing |
| TypeScript | strict | All packages |
| Tailwind CSS | v4 | Styling |
| SQLite | via `tauri-plugin-sql` | Desktop storage |
| Tauri notification plugin | 2 | Background CoreHour reminders |
| Vitest | latest | Tests |
| pnpm | ≥9 | Package manager |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and how to add a new tool.

## License

MIT (c) 2026 HashTagGit. See [LICENSE](./LICENSE).
