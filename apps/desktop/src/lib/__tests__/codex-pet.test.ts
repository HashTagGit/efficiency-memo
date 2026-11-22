import { describe, expect, it } from "vitest";
import {
  isCollectionManifest,
  parseImportedCollectionRef,
  PET_COLUMNS,
  PET_FRAME_HEIGHT,
  PET_FRAME_WIDTH,
  PET_TRACKS,
  parsePetManifest,
  readPetPack,
  validatePetAtlas,
} from "../codex-pet";
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

const variant = (id: string) => ({
  id,
  displayName: `${id} form`,
  description: "",
  spriteVersionNumber: 1 as const,
  spritesheetPath: `variants/${id}.png`,
});
const collection = {
  id: "mole-baby",
  displayName: "Mole Baby",
  description: "A variant package",
  spriteVersionNumber: 3 as const,
  defaultVariant: "middle",
  variants: [variant("seed"), variant("middle"), variant("super")],
};

describe("Codex Pet V3 variant packages", () => {
  it("parses a variant package as one manifest with ordered variants", () => {
    const parsed = parsePetManifest(collection);
    expect(isCollectionManifest(parsed)).toBe(true);
    if (!isCollectionManifest(parsed)) throw new Error("expected a collection");
    expect(parsed.defaultVariant).toBe("middle");
    expect(parsed.variants.map((entry) => [entry.id, entry.spritesheetPath]))
      .toEqual([["seed", "variants/seed.png"], ["middle", "variants/middle.png"], ["super", "variants/super.png"]]);
  });

  it("accepts a per-variant sleeping frame inside the declared atlas", () => {
    const parsed = parsePetManifest({
      ...collection,
      variants: [
        { ...variant("seed"), sleepingFrame: { row: 0, column: 3 } },
        { ...variant("middle"), spriteVersionNumber: 2, sleepingFrame: { row: 10, column: 7 } },
      ],
      defaultVariant: "seed",
    });
    if (!isCollectionManifest(parsed)) throw new Error("expected a collection");
    expect(parsed.variants[0].sleepingFrame).toEqual({ row: 0, column: 3 });
    expect(parsed.variants[1].sleepingFrame).toEqual({ row: 10, column: 7 });
    expect(() => parsePetManifest({
      ...collection,
      variants: [variant("seed"), { ...variant("middle"), sleepingFrame: { row: 11, column: 0 } }],
    })).toThrow("manifest");
    expect(() => parsePetManifest({
      ...collection,
      variants: [variant("seed"), { ...variant("middle"), sleepingFrame: { row: 0, column: 7 } }],
    })).toThrow("manifest");
  });

  it("rejects duplicate ids, a missing default, short variant lists, and unsafe paths", () => {
    expect(() => parsePetManifest({ ...collection, variants: [variant("seed")] })).toThrow("manifest");
    expect(() => parsePetManifest({ ...collection, variants: [variant("seed"), variant("seed")], defaultVariant: "seed" }))
      .toThrow("manifest");
    expect(() => parsePetManifest({ ...collection, defaultVariant: "missing" })).toThrow("manifest");
    expect(() => parsePetManifest({
      ...collection,
      variants: [{ ...variant("seed"), spritesheetPath: "variants/../seed.png" }, variant("middle")],
    })).toThrow("manifest");
    expect(() => parsePetManifest({
      ...collection,
      variants: [{ ...variant("seed"), spritesheetPath: "/absolute.png" }, variant("middle")],
    })).toThrow("manifest");
  });

  it("keeps imported collection row metadata readable and rejects malformed rows", () => {
    const ref = {
      id: "mole-baby",
      displayName: "Mole Baby",
      description: "A variant package",
      defaultVariant: "middle",
      variantId: "middle",
      variantDisplayName: "Middle Lamu",
      variantDescription: "",
      order: 2,
    };
    expect(parseImportedCollectionRef(ref)).toEqual(ref);
    expect(parseImportedCollectionRef({ ...ref, variantId: "not valid!" })).toBeNull();
    expect(parseImportedCollectionRef({ ...ref, order: -1 })).toBeNull();
    expect(parseImportedCollectionRef(null)).toBeNull();
  });

  it("requires V3 collections to be imported as a ZIP", async () => {
    const manifestFile = {
      name: "pet.json",
      size: 100,
      text: async () => JSON.stringify(collection),
    } as unknown as File;
    await expect(readPetPack([manifestFile])).rejects.toThrow("files");
  });
});
