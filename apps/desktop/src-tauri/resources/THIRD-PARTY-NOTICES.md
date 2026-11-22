# Bundled third-party desktop pet artwork

This file installs with the EfficiencyMemo application. EfficiencyMemo's MIT license does
not cover the third-party character artwork bundled in `apps/desktop/src/assets/pets/`. The
packages ship at the direction of this repository's owner; see
`docs/adr/0009-bundle-third-party-pet-artwork.md` in the source tree for the decision and
removal path.

## Mole Baby (拉姆)

- Character: 拉姆 (Lamu) from 《摩尔庄园》
- Source: [mole-baby](https://github.com/Vinci-217/mole-baby) commit
  `9e5ffa35c02812155b3782e8f0edeaa1be1c4cf2` (v0.34.0), `public/assets/classic/*-neutral.png`
  and `public/assets/original/seed/{body,pot}.png`, sampled by the upstream project from the
  original client sprite sheets (`lamubone.swf` and element skill SWFs).
- Package: one V3 pet collection with nine Lamu forms (seed, three growth stages, and five
  evolution forms); the seed atlas is composed from its 96×99 cells and pot layer onto the
  192×208 grid, and the classic form inherits clipped top leaves from the upstream export.
- Rights: upstream `public/assets/classic/SOURCE-RECORD.md` states
  “本项目是原游戏素材的同人格式适配，并非摩尔庄园、淘米或 OpenAI 官方发行。角色及原游戏素材权益保留给原权利方。”
  The character, name, and original client artwork belong to the rights holders of 《摩尔庄园》.
  Do not redistribute this package without permission.

## Clawd on Desk (Clawd, Calico, Cloudling)

- Characters: Clawd (pixel crab), Calico (calico cat), and Cloudling (cloud companion)
- Source: [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) commit
  `318d2c23979a7114e5bb79bddd67b61a475e8e85` (v1.7.0), built-in themes
  `themes/clawd/theme.json` (author: rullerzhou, theme repo <https://github.com/nicepkg/clawd>),
  `themes/calico/theme.json` (Calico cat, author rullerzhou), and
  `themes/cloudling/theme.json` (Cloudling, author stlabslogo). Artwork: theme SVGs,
  Calico APNG states, and Cloudling preview GIF states.
- Package: one V3 pet collection with three theme variants. The Clawd variant keeps its V2
  gaze frames; Calico and Cloudling are sampled into the nine Codex tracks.
- Rights: upstream `assets/LICENSE` states that the artwork is “NOT covered by the project's
  source-code license. All rights are reserved by their respective copyright holders”, that
  “The Clawd character is the property of Anthropic”, that the pixel art is “fan-created and
  may not be used for commercial purposes”, and that you “may NOT copy, modify, distribute,
  or use any artwork ... without explicit written permission from the copyright holder(s)”.
  Calico cat (三花猫) artwork is “Copyright (c) 2026 鹿鹿 (rullerzhou-afk). All rights
  reserved.” Third-party artist contributions retain their respective copyright. Do not
  redistribute this package without permission.

The same notices live beside each package in the source tree
(`apps/desktop/src/assets/pets/<id>/NOTICE.md`) together with the exact conversion steps.
