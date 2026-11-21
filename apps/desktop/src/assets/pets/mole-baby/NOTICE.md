# Third-party notice — Mole Baby (拉姆) pet package

- Character: 拉姆 (Lamu) from 《摩尔庄园》
- Source project: [mole-baby](https://github.com/Vinci-217/mole-baby), commit
  `9e5ffa35c02812155b3782e8f0edeaa1be1c4cf2` (v0.34.0)
- Artwork used: `public/assets/classic/middle-neutral.png`, an 8 × 9 Codex-sized cell atlas.
  The upstream `public/assets/classic/SOURCE-RECORD.md` records that it is sampled from the
  original client sprite sheets (`lamubone.swf`).
- Conversion, run from the EfficiencyMemo repository root:

  ```bash
  python scripts/prepare-desktop-pet.py \
    --atlas path/to/mole-baby/public/assets/classic/middle-neutral.png \
    --output apps/desktop/src/assets/pets \
    --id mole-baby --name "Mole Baby" --version 1 \
    --description "The round little Lamu mole from mole-baby, with a leafy sprout and a calm smile."
  ```

  The cells are copied unchanged into a Codex Pet V1 package; nothing is redrawn.

## Rights

mole-baby does not license its game artwork. Its `public/assets/classic/SOURCE-RECORD.md`
(拉姆 section) states: “本项目是原游戏素材的同人格式适配，并非摩尔庄园、淘米或 OpenAI
官方发行。角色及原游戏素材权益保留给原权利方。”

The character, name, and original client artwork belong to the rights holders of
《摩尔庄园》. This package is bundled at the direction of this repository's owner (see
[ADR 0009](../../../../../../docs/adr/0009-bundle-third-party-pet-artwork.md)) and is **not**
covered by EfficiencyMemo's MIT license. Do not redistribute this package without permission
from the rights holders.
