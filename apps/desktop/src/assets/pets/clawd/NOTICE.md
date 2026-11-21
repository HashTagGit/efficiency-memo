# Third-party notice — Clawd pet package

- Character: Clawd, the pixel crab
- Source project: [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk), commit
  `318d2c23979a7114e5bb79bddd67b61a475e8e85` (v1.7.0), theme `themes/clawd/theme.json`
  (author: rullerzhou, theme repo: <https://github.com/nicepkg/clawd>)
- Pose artwork: `assets/svg/clawd-*.svg`
- Conversion, run from the EfficiencyMemo repository root:

  ```bash
  pnpm exec playwright install chromium
  node scripts/render-clawd-pet.mjs --svg-dir path/to/clawd-on-desk/assets/svg --out /tmp/clawd-frames
  python scripts/prepare-desktop-pet.py \
    --frames /tmp/clawd-frames \
    --output apps/desktop/src/assets/pets \
    --id clawd --name "Clawd" --version 2 \
    --description "The original pixel crab from clawd-on-desk, with theme-accurate poses and pointer gaze."
  ```

  Every cell is sampled from the theme's CSS animation with headless Chromium. The sixteen
  gaze cells derive from the theme's direction-based eye, body, and shadow tracking. No
  artwork is redrawn.
- State mapping: idle → `clawd-idle-follow`, running-right/left → `clawd-mini-crabwalk`
  (left mirrored), waving → `clawd-happy`, jumping → `clawd-react-double-jump`,
  failed → `clawd-error`, waiting → `clawd-notification`, running → `clawd-working-typing`,
  review → `clawd-idle-reading`.

## Rights

clawd-on-desk source code is AGPL-3.0-only. Its `assets/LICENSE` states that the artwork is
“NOT covered by the project's source-code license. All rights are reserved by their
respective copyright holders”, that “The Clawd character is the property of Anthropic”, that
the pixel art is “fan-created and may not be used for commercial purposes”, and that you
“may NOT copy, modify, distribute, or use any artwork ... without explicit written
permission from the copyright holder(s)”.

This package is bundled at the direction of this repository's owner (see
[ADR 0009](../../../../../../docs/adr/0009-bundle-third-party-pet-artwork.md)), is **not**
covered by EfficiencyMemo's MIT license, and must not be redistributed without permission
from the rights holders.
