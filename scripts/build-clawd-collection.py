"""Build the EfficiencyMemo V3 collection for clawd-on-desk's three built-in themes.

Themes: Clawd (pixel crab, existing V2 atlas), Calico (APNG states), Cloudling
(GIF preview states). Each theme is sampled into the nine Codex tracks and packed
as one variant of the single `clawd` pet.

Usage:
  python scripts/build-clawd-collection.py \
    --clawd-on-desk path/to/clawd-on-desk \
    --clawd-sheet path/to/previous/clawd/spritesheet.png \
    --output apps/desktop/src/assets/pets/clawd
"""

import argparse
import json
import pathlib

from PIL import Image

COLUMNS = 8
FRAME = (192, 208)
TRACKS = [("idle", 6), ("running-right", 8), ("running-left", 8), ("waving", 4),
          ("jumping", 5), ("failed", 8), ("waiting", 6), ("running", 6), ("review", 6)]

# theme -> track -> (source relative to clawd-on-desk root, frame count, max scale, mirror)
SOURCES = {
    "calico": {
        "idle": ("themes/calico/assets/calico-idle.apng", 6, 0.85),
        "running-right": ("themes/calico/assets/calico-roam-crabwalk.apng", 8, 0.85),
        "running-left": ("themes/calico/assets/calico-roam-crabwalk.apng", 8, 0.85),
        "waving": ("themes/calico/assets/calico-happy.apng", 4, 0.75),
        "jumping": ("themes/calico/assets/calico-mini-happy.apng", 5, 0.85),
        "failed": ("themes/calico/assets/calico-error.apng", 8, 0.85),
        "waiting": ("themes/calico/assets/calico-notification.apng", 6, 0.85),
        "running": ("themes/calico/assets/calico-working-typing.apng", 6, 0.85),
        "review": ("themes/calico/assets/calico-thinking.apng", 6, 0.85),
    },
    "cloudling": {
        "idle": ("assets/gif/cloudling-idle.gif", 6, 1.5),
        "running-right": ("assets/gif/cloudling-mini-crabwalk.gif", 8, 1.8),
        "running-left": ("assets/gif/cloudling-mini-crabwalk.gif", 8, 1.8),
        "waving": ("assets/gif/cloudling-attention.gif", 4, 1.35),
        "jumping": ("assets/gif/cloudling-mini-happy.gif", 5, 1.4),
        "failed": ("assets/gif/cloudling-error.gif", 8, 1.35),
        "waiting": ("assets/gif/cloudling-notification.gif", 6, 1.35),
        "running": ("assets/gif/cloudling-typing.gif", 6, 1.4),
        "review": ("assets/gif/cloudling-thinking.gif", 6, 1.35),
    },
}

VARIANTS = {
    "clawd": {
        "displayName": "Clawd",
        "description": "The original pixel crab from clawd-on-desk.",
        "spriteVersionNumber": 2,
    },
    "calico": {
        "displayName": "Calico",
        "description": "The calico cat theme: naps, typing, and rainbow celebrations.",
        "spriteVersionNumber": 1,
        "sleepingFrame": {"row": 4, "column": 1},
    },
    "cloudling": {
        "displayName": "Cloudling",
        "description": "The soft cloud companion with bright, grumpy, and sleepy moods.",
        "spriteVersionNumber": 1,
        "sleepingFrame": {"row": 3, "column": 0},
    },
}

MIRRORED = {"running-left"}


def load_frames(path: pathlib.Path) -> list[Image.Image]:
    frames = []
    with Image.open(path) as image:
        for index in range(getattr(image, "n_frames", 1)):
            image.seek(index)
            frames.append(image.convert("RGBA"))
    return frames


def pick(frames: list[Image.Image], count: int) -> list[Image.Image]:
    if len(frames) == count:
        return frames
    step = (len(frames) - 1) / (count - 1)
    return [frames[round(index * step)] for index in range(count)]


def alpha_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    left = top = 10**9
    right = bottom = -1
    for frame in frames:
        box = frame.getchannel("A").point([0] + [255] * 255).getbbox()
        if box is None:
            continue
        left, top = min(left, box[0]), min(top, box[1])
        right, bottom = max(right, box[2]), max(bottom, box[3])
    if right < 0:
        raise SystemExit("source animation is empty")
    return left, top, right, bottom


def build_theme(root: pathlib.Path, theme: str) -> Image.Image:
    atlas = Image.new("RGBA", (COLUMNS * FRAME[0], len(TRACKS) * FRAME[1]))
    for row, (track, count) in enumerate(TRACKS):
        source, expected, max_scale = SOURCES[theme][track]
        if expected != count:
            raise SystemExit(f"{theme}/{track}: frame count mismatch")
        frames = pick(load_frames(root / source), count)
        if track in MIRRORED:
            frames = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in frames]
        left, top, right, bottom = alpha_bbox(frames)
        width, height = right - left, bottom - top
        scale = min(max_scale, (FRAME[0] - 12) / width, (FRAME[1] - 18) / height)
        target_x = round(FRAME[0] / 2 - (left + right) / 2 * scale)
        target_y = round(FRAME[1] - 8 - bottom * scale)
        for column, frame in enumerate(frames):
            resized = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
            cell = Image.new("RGBA", FRAME)
            cell.paste(resized, (target_x, target_y), resized)
            if cell.getchannel("A").getextrema()[1] == 0:
                raise SystemExit(f"{theme}/{track} frame {column + 1} is empty")
            atlas.paste(cell, (column * FRAME[0], row * FRAME[1]))
    return atlas


def validate_sheet(atlas: Image.Image, label: str) -> None:
    if atlas.size != (COLUMNS * FRAME[0], len(TRACKS) * FRAME[1]):
        raise SystemExit(f"{label}: unexpected atlas size {atlas.size}")
    alpha = atlas.getchannel("A")
    for row, count in enumerate(TRACKS):
        for column in range(COLUMNS):
            cell = alpha.crop((column * FRAME[0], row * FRAME[1], (column + 1) * FRAME[0], (row + 1) * FRAME[1]))
            least, most = cell.getextrema()
            active = column < count[1]
            if active and (least != 0 or most == 0):
                raise SystemExit(f"{label}: active cell {row}:{column} must be artwork on transparency")
            if not active and most != 0:
                raise SystemExit(f"{label}: unused cell {row}:{column} must be transparent")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clawd-on-desk", type=pathlib.Path, required=True)
    parser.add_argument("--clawd-sheet", type=pathlib.Path, required=True, help="existing Clawd V2 spritesheet")
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()

    variants_dir = args.output / "variants"
    variants_dir.mkdir(parents=True, exist_ok=True)

    clawd_sheet = Image.open(args.clawd_sheet).convert("RGBA")
    if clawd_sheet.size != (COLUMNS * FRAME[0], 11 * FRAME[1]):
        raise SystemExit(f"clawd sheet: expected a V2 atlas, got {clawd_sheet.size}")
    clawd_sheet.save(variants_dir / "clawd.png")

    for theme in ("calico", "cloudling"):
        atlas = build_theme(args.clawd_on_desk, theme)
        validate_sheet(atlas, theme)
        atlas.save(variants_dir / f"{theme}.webp", "WEBP", quality=95, method=6)

    manifest = {
        "id": "clawd",
        "displayName": "Clawd on Desk",
        "description": "clawd-on-desk's three built-in companions: the Clawd crab, Calico, and Cloudling.",
        "spriteVersionNumber": 3,
        "defaultVariant": "clawd",
        "variants": [
            {
                "id": theme,
                "displayName": VARIANTS[theme]["displayName"],
                "description": VARIANTS[theme]["description"],
                "spriteVersionNumber": VARIANTS[theme]["spriteVersionNumber"],
                "spritesheetPath": f"variants/{theme}.png" if theme == "clawd" else f"variants/{theme}.webp",
                **({"sleepingFrame": VARIANTS[theme]["sleepingFrame"]} if "sleepingFrame" in VARIANTS[theme] else {}),
            }
            for theme in ("clawd", "calico", "cloudling")
        ],
    }
    (args.output / "pet.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()



