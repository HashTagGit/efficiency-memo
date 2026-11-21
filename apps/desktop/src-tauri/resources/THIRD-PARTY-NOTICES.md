# Bundled third-party desktop pet artwork

This file installs with the EfficiencyMemo application. EfficiencyMemo's MIT license does
not cover the third-party character artwork bundled in `apps/desktop/src/assets/pets/`. The
packages ship at the direction of this repository's owner; see
`docs/adr/0009-bundle-third-party-pet-artwork.md` in the source tree for the decision and
removal path.

## Mole Baby (拉姆)

- Character: 拉姆 (Lamu) from 《摩尔庄园》
- Source: [mole-baby](https://github.com/Vinci-217/mole-baby) commit
  `9e5ffa35c02812155b3782e8f0edeaa1be1c4cf2` (v0.34.0), `public/assets/classic/middle-neutral.png`,
  sampled by the upstream project from the original client sprite sheets (`lamubone.swf`).
- Rights: upstream `public/assets/classic/SOURCE-RECORD.md` states
  “本项目是原游戏素材的同人格式适配，并非摩尔庄园、淘米或 OpenAI 官方发行。角色及原游戏素材权益保留给原权利方。”
  The character, name, and original client artwork belong to the rights holders of 《摩尔庄园》.
  Do not redistribute this package without permission.

## Clawd

- Character: Clawd, the pixel crab
- Source: [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) commit
  `318d2c23979a7114e5bb79bddd67b61a475e8e85` (v1.7.0), theme `themes/clawd/theme.json`
  (author: rullerzhou, theme repo: <https://github.com/nicepkg/clawd>), pose artwork
  `assets/svg/clawd-*.svg`.
- Rights: upstream `assets/LICENSE` states that the artwork is “NOT covered by the project's
  source-code license. All rights are reserved by their respective copyright holders”, that
  “The Clawd character is the property of Anthropic”, that the pixel art is “fan-created and
  may not be used for commercial purposes”, and that you “may NOT copy, modify, distribute,
  or use any artwork ... without explicit written permission from the copyright holder(s)”.
  Do not redistribute this package without permission.

The same notices live beside each package in the source tree
(`apps/desktop/src/assets/pets/<id>/NOTICE.md`) together with the exact conversion steps.
