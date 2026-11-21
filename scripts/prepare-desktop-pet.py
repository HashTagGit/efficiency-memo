"""Prepare a Codex Pet package from local raster artwork. Requires Pillow."""

import argparse
import json
import re
from pathlib import Path

from PIL import Image


CONTRACT_PATH = Path(__file__).resolve().parents[1] / "apps/desktop/src/lib/codex-pet-atlas.json"
CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
COLUMNS = CONTRACT["columns"]
FRAME_SIZE = (CONTRACT["frameWidth"], CONTRACT["frameHeight"])
MAX_IMAGE_BYTES = 20 * 1024 * 1024


def read_image(path, size, formats):
    if path.stat().st_size > MAX_IMAGE_BYTES:
        raise ValueError(f"{path}: image exceeds 20 MiB")
    with Image.open(path, formats=formats) as image:
        if image.size != size or getattr(image, "n_frames", 1) != 1:
            raise ValueError(f"{path}: expected a single {size[0]} × {size[1]} image")
        return image.convert("RGBA")


def assemble_atlas(version, atlas_path, frames_path):
    tracks = [(track["name"], len(track["durations"])) for track in CONTRACT["tracks"]]
    if version == 2:
        tracks.append(("look", CONTRACT["lookFrames"]))
    width, height = FRAME_SIZE
    rows = sum((count + COLUMNS - 1) // COLUMNS for _, count in tracks)
    size = (COLUMNS * width, rows * height)
    source = read_image(atlas_path, size, ["PNG", "WEBP"]) if atlas_path else None
    atlas = Image.new("RGBA", size)
    first_row = 0

    for name, count in tracks:
        for index in range(count):
            row, column = divmod(index, COLUMNS)
            x, y = column * width, (first_row + row) * height
            if source is None:
                frame = read_image(frames_path / name / f"{index + 1:02}.png", FRAME_SIZE, ["PNG"])
            else:
                frame = source.crop((x, y, x + width, y + height))

            least_alpha, most_alpha = frame.getchannel("A").getextrema()
            if least_alpha != 0 or most_alpha == 0:
                raise ValueError(f"{name} frame {index + 1}: expected artwork on a transparent background")
            # Clear hidden RGB without blending partially transparent pixels twice.
            visible = frame.getchannel("A").point([0] + [255] * 255)
            atlas.paste(frame, (x, y), visible)
        first_row += (count + COLUMNS - 1) // COLUMNS

    return atlas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--atlas", type=Path, help="An existing Codex-sized PNG or WebP")
    source.add_argument("--frames", type=Path, help="PNG frames grouped into animation directories")
    parser.add_argument("--output", required=True, type=Path, help="Parent directory for the new package")
    parser.add_argument("--id", required=True, help="Package ID, also used as the new directory name")
    parser.add_argument("--name", required=True, help="Display name")
    parser.add_argument("--description", default="")
    parser.add_argument("--version", type=int, choices=(1, 2), default=1)
    args = parser.parse_args()

    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", args.id):
        parser.error("--id must contain 1 to 100 ASCII letters, digits, underscores, or hyphens")
    if not args.name.strip() or len(args.name.encode("utf-16-le")) // 2 > 120:
        parser.error("--name must contain 1 to 120 UTF-16 code units")
    if len(args.description.encode("utf-16-le")) // 2 > 500:
        parser.error("--description must contain at most 500 UTF-16 code units")

    try:
        atlas = assemble_atlas(args.version, args.atlas, args.frames)
        target = args.output / args.id
        target.mkdir(parents=True, exist_ok=False)
        atlas.save(target / "spritesheet.png")
        manifest = {
            "id": args.id,
            "displayName": args.name,
            "description": args.description,
            "spriteVersionNumber": args.version,
            "spritesheetPath": "spritesheet.png",
        }
        (target / "pet.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")

    print(target)


if __name__ == "__main__":
    main()
