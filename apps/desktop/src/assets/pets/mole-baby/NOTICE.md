# Third-party notice — Mole Baby (拉姆) pet package

- Character: 拉姆 (Lamu) from 《摩尔庄园》
- Source project: [mole-baby](https://github.com/Vinci-217/mole-baby), commit
  `9e5ffa35c02812155b3782e8f0edeaa1be1c4cf2` (v0.34.0)
- Artwork used: `public/assets/classic/*-neutral.png` for the eight adult forms and
  `public/assets/original/seed/{body,pot}.png` for the seed stage. The upstream
  `public/assets/classic/SOURCE-RECORD.md` records that these are sampled from the original
  client sprite sheets (`lamubone.swf` and the element skill SWFs).
- Package format: V3 collection (`spriteVersionNumber: 3`) with nine variants under one
  pet id. See `docs/specs/desktop-pet-variants.md` in the EfficiencyMemo repository.
- Conversion, run from the EfficiencyMemo repository root:

  ```bash
  python scripts/build-mole-baby-collection.py \
    --assets path/to/mole-baby/public/assets \
    --output apps/desktop/src/assets/pets/mole-baby
  ```

  Adult atlases are copied with unused cells cleared, unchanged otherwise. The seed atlas
  is 96×99 cells in a separate body layer plus a `pot.png` layer; the script composes them
  onto the standard 192×208 grid, samples the upstream 61-frame loop across the nine
  tracks, and marks the closed-eye frame as `sleepingFrame`. No artwork is redrawn. The
  `classic` (经典超级拉姆) atlas inherits clipped top leaves and a few leftover unused cells
  from the upstream export; the leftover cells are cleared here, but the clipped leaves
  remain and should be re-exported before using that form alone.

## Rights

mole-baby does not license its game artwork. Its `public/assets/classic/SOURCE-RECORD.md`
(拉姆 section) states: “本项目是原游戏素材的同人格式适配，并非摩尔庄园、淘米或 OpenAI
官方发行。角色及原游戏素材权益保留给原权利方。”

The character, name, and original client artwork belong to the rights holders of
《摩尔庄园》. This package is bundled at the direction of this repository's owner (see
[ADR 0009](../../../../../../docs/adr/0009-bundle-third-party-pet-artwork.md)) and is **not**
covered by EfficiencyMemo's MIT license. Do not redistribute this package without permission
from the rights holders.
