# Third-party notice — Clawd on Desk pet package

- Characters: Clawd (pixel crab), Calico (calico cat), and Cloudling (cloud companion)
- Source project: [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk), commit
  `318d2c23979a7114e5bb79bddd67b61a475e8e85` (v1.7.0), built-in themes
  `themes/clawd`, `themes/calico`, and `themes/cloudling`
- Themes: `themes/clawd/theme.json` (author: rullerzhou, theme repo
  <https://github.com/nicepkg/clawd>), `themes/calico/theme.json` (Calico cat, author
  rullerzhou), `themes/cloudling/theme.json` (Cloudling, author stlabslogo).
- Package format: V3 collection (`spriteVersionNumber: 3`) with three variants under one
  pet id. See `docs/specs/desktop-pet-variants.md` in the EfficiencyMemo repository.
- Conversion, run from the EfficiencyMemo repository root:

  ```bash
  node scripts/render-clawd-pet.mjs \
    --svg-dir path/to/clawd-on-desk/assets/svg --out /tmp/clawd-frames
  python scripts/prepare-desktop-pet.py --frames /tmp/clawd-frames \
    --output /tmp/clawd-pet --id clawd --version 2 --name Clawd --description "..."
  python scripts/build-clawd-collection.py \
    --clawd-on-desk path/to/clawd-on-desk \
    --clawd-sheet /tmp/clawd-pet/clawd/spritesheet.png \
    --output apps/desktop/src/assets/pets/clawd
  ```

  The Clawd variant is the existing V2 atlas rendered from the theme SVGs (nine sampled
  animation states plus sixteen gaze frames). Calico is sampled from the theme's APNG
  states and Cloudling from its GIF preview states into the nine Codex tracks. The guide's
  state mapping: idle, running-right/left, waving, jumping, failed, waiting, running, and
  review; no artwork is redrawn.

## Rights

clawd-on-desk source code is AGPL-3.0-only. Its `assets/LICENSE` states that the artwork is
“NOT covered by the project's source-code license. All rights are reserved by their
respective copyright holders”, that “The Clawd character is the property of Anthropic” and
that the Clawd pixel art is “fan-created and may not be used for commercial purposes. It
also states that Calico cat (三花猫) artwork is “Copyright (c) 2026 鹿鹿 (rullerzhou-afk).
All rights reserved.”, and that third-party artist contributions retain their respective
copyright. The license also says you “may NOT copy, modify, distribute, or use any artwork
... without explicit written permission from the copyright holder(s)”.

This package is bundled at the direction of this repository's owner (see
[ADR 0009](../../../../../../docs/adr/0009-bundle-third-party-pet-artwork.md)), is **not**
covered by EfficiencyMemo's MIT license, and must not be redistributed without permission
from the rights holders.
