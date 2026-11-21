import { describe, expect, it } from "vitest";
import { PET_COLUMNS, PET_FRAME_HEIGHT, PET_FRAME_WIDTH, PET_TRACKS, parsePetManifest, validatePetAtlas } from "../codex-pet";

const manifest = { id: "example-pet", displayName: "Example Pet", description: "A test pet" };

function atlas(rows: number): ImageData {
  const width = PET_COLUMNS * PET_FRAME_WIDTH;
  const height = rows * PET_FRAME_HEIGHT;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < rows; row++) {
    const columns = PET_TRACKS[row]?.length ?? PET_COLUMNS;
    for (let col = 0; col < columns; col++) {
      const firstPixel = row * PET_FRAME_HEIGHT * width + col * PET_FRAME_WIDTH;
      data[firstPixel * 4 + 3] = 255;
    }
  }
  return { width, height, data, colorSpace: "srgb" };
}

describe("Codex pet package format", () => {
  it("keeps the V1 defaults and uses the version declared by V2 packs", () => {
    expect(parsePetManifest(manifest)).toMatchObject({ spriteVersionNumber: 1, spritesheetPath: "spritesheet.webp" });
    expect(parsePetManifest({ ...manifest, spriteVersionNumber: 2, spritesheetPath: "my-pet.png" }))
      .toMatchObject({ spriteVersionNumber: 2, spritesheetPath: "my-pet.png" });
    expect(() => parsePetManifest({ ...manifest, spritesheetPath: "../external.webp" })).toThrow("manifest");
    expect(() => parsePetManifest({ ...manifest, spriteVersionNumber: 3 })).toThrow("manifest");
  });

  it("accepts the matching V1 and V2 frame grids only", () => {
    const v1 = atlas(9);
    const v2 = atlas(11);
    expect(() => validatePetAtlas(1, v1)).not.toThrow();
    expect(() => validatePetAtlas(2, v2)).not.toThrow();
    expect(() => validatePetAtlas(2, v1)).toThrow("layout");
    expect(() => validatePetAtlas(1, v2)).toThrow("layout");
  });

  it("rejects missing look poses and nonempty unused cells", () => {
    const missingPose = atlas(11);
    missingPose.data[(10 * PET_FRAME_HEIGHT * missingPose.width) * 4 + 3] = 0;
    expect(() => validatePetAtlas(2, missingPose)).toThrow("layout");

    const extraFrame = atlas(11);
    extraFrame.data[(6 * PET_FRAME_WIDTH) * 4 + 3] = 255;
    expect(() => validatePetAtlas(2, extraFrame)).toThrow("layout");
  });
});
