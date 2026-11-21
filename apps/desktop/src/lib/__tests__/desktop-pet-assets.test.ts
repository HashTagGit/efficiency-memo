import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { BUNDLED_PETS } from "../desktop-pet-catalog";
import { PET_COLUMNS, PET_FRAME_HEIGHT, PET_FRAME_WIDTH, petAtlasRows } from "../codex-pet";

interface ImageSize {
  width: number;
  height: number;
}

const PNG_SIGNATURE = 0x89504e47;

function imageSize(bytes: Buffer): ImageSize {
  if (bytes.length > 24 && bytes.readUInt32BE(0) === PNG_SIGNATURE) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length > 30
    && bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    switch (bytes.subarray(12, 16).toString("ascii")) {
      case "VP8X":
        return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
      case "VP8L": {
        const bits = bytes.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      case "VP8 ":
        return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
      default:
        break;
    }
  }
  throw new Error("Unsupported spritesheet format");
}

describe("bundled desktop pet spritesheets", () => {
  it("match the Codex Pet cell grid declared by each manifest", () => {
    for (const pet of BUNDLED_PETS) {
      const folder = new URL(`../../assets/pets/${pet.manifest.id}/`, import.meta.url);
      const bytes = readFileSync(new URL(pet.manifest.spritesheetPath, folder));
      const { width, height } = imageSize(bytes);
      expect(width, pet.manifest.id).toBe(PET_COLUMNS * PET_FRAME_WIDTH);
      expect(height, pet.manifest.id).toBe(petAtlasRows(pet.manifest.spriteVersionNumber) * PET_FRAME_HEIGHT);
    }
  });
});
