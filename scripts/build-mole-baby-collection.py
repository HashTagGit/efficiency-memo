"""Build the EfficiencyMemo V3 multi-variant package for mole-baby's Lamu forms.

The upstream repository ships eight Codex V1 atlases plus a separate seed atlas
(96 x 99 cells with a stand-alone pot layer). This script clears unused cells,
composes the seed frames onto the standard 192 x 208 grid, and writes the
variant manifest used by EfficiencyMemo's V3 pet package format.

Usage:
  python scripts/build-mole-baby-collection.py \
    --assets path/to/mole-baby/public/assets \
    --output apps/desktop/src/assets/pets/mole-baby
"""

import argparse
import json
import pathlib

from PIL import Image

TRACKS = [6, 8, 8, 4, 5, 8, 6, 6, 6]
COLUMNS = 8
FRAME = (192, 208)
ADULT_FORMS = ["junior", "middle", "senior", "classic", "super", "water", "wood", "fire"]
SEED_FRAMES = 62  # 0..60 original animation, 61 closed-eye upright sleep
SEED_SLEEP_FRAME = 61
SEED_REGISTRATION = {"pot": (36, 95, 119, 103), "body": (51, 36, 96, 99)}

VARIANTS = {
    "seed": ("种子期", "花盆中轻轻摆动的拉姆种子。", None),
    "junior": ("初级拉姆", "离开花盆、还没有叶子的初级拉姆。", None),
    "middle": ("中级拉姆", "长出两片嫩叶的中级拉姆。", None),
    "senior": ("高级拉姆", "扇形叶片展开的高级拉姆。", None),
    "classic": ("经典超级拉姆", "三片金色叶子的经典超级拉姆。", None),
    "super": ("神力超级拉姆", "金色神力头冠的神力超级形态。", None),
    "water": ("神奇水系拉姆", "展开晶莹水花头冠的神奇水系形态。", None),
    "wood": ("弹力木系拉姆", "戴着翠绿木系头冠的弹力木系形态。", None),
    "fire": ("霹雳火系拉姆", "顶着明亮火焰头冠的霹雳火系形态。", None),
}


def read_adult_sheet(path: pathlib.Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    if source.size != (COLUMNS * FRAME[0], len(TRACKS) * FRAME[1]):
        raise SystemExit(f"{path}: unexpected source atlas size {source.size}")
    atlas = Image.new("RGBA", source.size)
    for row, count in enumerate(TRACKS):
        for column in range(count):
            box = (column * FRAME[0], row * FRAME[1], (column + 1) * FRAME[0], (row + 1) * FRAME[1])
            cell = source.crop(box)
            alpha = cell.getchannel("A")
            least, most = alpha.getextrema()
            if least != 0 or most == 0:
                raise SystemExit(f"{path}: row {row} column {column} must be artwork on transparency")
            atlas.paste(cell, box)
    return atlas


def compose_seed_cell(body: Image.Image, pot: Image.Image, frame: int) -> Image.Image:
    canvas = Image.new("RGBA", FRAME)
    pot_x, pot_y, pot_w, pot_h = SEED_REGISTRATION["pot"]
    body_x, body_y, body_w, body_h = SEED_REGISTRATION["body"]
    canvas.alpha_composite(pot.resize((pot_w, pot_h), Image.Resampling.LANCZOS), (pot_x, pot_y))
    column, row = frame % COLUMNS, frame // COLUMNS
    cell = body.crop((column * body_w, row * body_h, (column + 1) * body_w, (row + 1) * body_h))
    canvas.alpha_composite(cell.resize((body_w, body_h), Image.Resampling.LANCZOS), (body_x, body_y))
    return canvas


def build_seed_sheet(assets: pathlib.Path) -> Image.Image:
    body = Image.open(assets / "original/seed/body.png").convert("RGBA")
    pot = Image.open(assets / "original/seed/pot.png").convert("RGBA")
    if body.size != (COLUMNS * 96, 8 * 99):
        raise SystemExit(f"seed body: unexpected size {body.size}")
    atlas = Image.new("RGBA", (COLUMNS * FRAME[0], len(TRACKS) * FRAME[1]))
    for track_row, count in enumerate(TRACKS):
        frames = [(round(index * 61 / count) + track_row * 3) % 61 for index in range(count)]
        if track_row == 0 and count >= 4:
            frames[3] = SEED_SLEEP_FRAME
        for column, frame in enumerate(frames):
            cell = compose_seed_cell(body, pot, frame)
            alpha = cell.getchannel("A")
            if alpha.getextrema()[1] == 0:
                raise SystemExit(f"seed row {track_row} column {column} is empty")
            atlas.paste(cell, (column * FRAME[0], track_row * FRAME[1]))
    return atlas


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=pathlib.Path, required=True, help="mole-baby/public/assets")
    parser.add_argument("--output", type=pathlib.Path, required=True, help="destination package directory")
    args = parser.parse_args()

    assets: pathlib.Path = args.assets
    output: pathlib.Path = args.output
    variants_dir = output / "variants"
    variants_dir.mkdir(parents=True, exist_ok=True)

    for form in ADULT_FORMS:
        sheet = read_adult_sheet(assets / "classic" / f"{form}-neutral.png")
        sheet.save(variants_dir / f"{form}.png")
    build_seed_sheet(assets).save(variants_dir / "seed.png")

    manifest = {
        "id": "mole-baby",
        "displayName": "Mole Baby",
        "description": "The round Lamu mole from mole-baby, across its seed, growth, and five evolution forms.",
        "spriteVersionNumber": 3,
        "defaultVariant": "middle",
        "variants": [
            {
                "id": form,
                "displayName": VARIANTS[form][0],
                "description": VARIANTS[form][1],
                "spriteVersionNumber": 1,
                "spritesheetPath": f"variants/{form}.png",
                **({"sleepingFrame": {"row": 0, "column": 3}} if form == "seed" else {}),
            }
            for form in ["seed", *ADULT_FORMS]
        ],
    }
    (output / "pet.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
