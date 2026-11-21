# Contributing to EfficiencyMemo

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Rust toolchain (install via [rustup](https://rustup.rs/))
  - Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`

## Local Setup

```bash
git clone https://github.com/HashTagGit/efficiency-memo.git
cd efficiency-memo
pnpm install
pnpm --filter desktop tauri:dev
# Opens a Tauri window with hot-reload
```

## Workspace Layout

```
EfficiencyMemo/
├── apps/desktop/      # Tauri v2 desktop app (recommended for personal use)
├── packages/shared/   # Cross-tool types and constants
└── packages/ui/       # React + Tailwind v4 component library
```

## Development Commands

| Command | Description |
|---|---|
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run all workspace tests |
| `pnpm --filter desktop tauri:dev` | Launch desktop app in dev mode |
| `pnpm --filter desktop tauri:build` | Build production desktop installer |
| `pnpm --filter desktop build` | Build desktop frontend (Vite only) |
| `pnpm --filter desktop typecheck` | TypeScript check in desktop |

## CoreHour Scope

Keep the user workflow local: session timer, check-ins, plans, reviews, recovery reminders, tags, and settings. Charger Reminder is retired to the ignored local `bak/` archive; do not restore it without an explicit product decision. WebDAV sync remains outside the current product scope.

## Desktop Pet Packages

Place a finished Codex Pet package in `apps/desktop/src/assets/pets/<id>/`. Keep `pet.json` beside its PNG or WebP spritesheet and match the folder name to `pet.json`'s `id`. The Pet Assistant picker discovers packages from this directory and displays their `displayName` when there is no localized label; add `desktopPet.pet.<id>` in `apps/desktop/src/lib/i18n.tsx` for a translated name. Select the pet and send a test reminder in the Windows Tauri app before publishing.

Bundled packages: `amber-cat`, `lantern-moth`, and `pocket-robot` are first-party. `mole-baby` (拉姆 from mole-baby) and `clawd` (the pixel crab from clawd-on-desk) are third-party artwork. Keep the applicable license and attribution beside any third-party package in its `NOTICE.md` and mirror it into `apps/desktop/src-tauri/resources/THIRD-PARTY-NOTICES.md`, which the Tauri bundle installs; neither package is covered by this project's MIT license. The bundling decision is recorded in `docs/adr/0009-bundle-third-party-pet-artwork.md`.

The optional `scripts/prepare-desktop-pet.py` helper uses Python and Pillow. It reads local raster files and writes the standard `pet.json` and `spritesheet.png` package into a new directory. Use a temporary output location to inspect the result before bundling.

- For a Codex-sized atlas such as a mole-baby-style export, use `--atlas path/to/atlas.png --version 1`. The helper checks the required cells and clears any pixels in unused cells.
- For separate animations such as a Clawd-style theme, render the selected poses to transparent 192 × 208 PNGs outside the app. Then use `--frames path/to/frames --version 1` or `--version 2`. Use the state directory names and frame counts in [the atlas contract](apps/desktop/src/lib/codex-pet-atlas.json) and name each state's frames `01.png`, `02.png`, and so on. For V2, add `look/01.png` through `look/16.png` clockwise from up, in steps of 22.5 degrees.
- `scripts/render-clawd-pet.mjs` performs that rasterization for the clawd-on-desk `assets/svg` theme states with Playwright (`pnpm exec playwright install chromium`), including the sixteen gaze frames. Run it with `--svg-dir path/to/clawd-on-desk/assets/svg --out path/to/frames` before the `--frames` packaging step.

Both commands take `--output path/to/packages --id my-pet --name "My Pet"` and an optional `--description`. The running app accepts the resulting raster atlases through its existing import picker.

## Code Conventions

- Path aliases: `@/*` -> `apps/desktop/src/*`, `@memo/shared` -> `packages/shared/src`, `@memo/ui` -> `packages/ui/src`
- Tests mirror source tree under `__tests__/`

See [AGENTS.md](./AGENTS.md) for repository boundaries and agent workflow.

## Testing

- Unit/Integration: `pnpm test` (Vitest, mirrors source under `__tests__/`)

## Commit Style

Follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `test:` tests

## License

MIT — see [LICENSE](./LICENSE)
