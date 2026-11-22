import { describe, expect, it } from "vitest";
import {
  BUNDLED_COLLECTIONS,
  BUNDLED_PETS,
  DEFAULT_PET,
  discoverBundledDesktopCollections,
  discoverBundledDesktopPets,
  loadDesktopPetSprite,
} from "../desktop-pet-catalog";

const fixturePath = "../assets/pets/example/pet.json";
const atlasPath = "../assets/pets/example/authorized-frames.png";
const manifest = {
  id: "example",
  displayName: "Example Pet",
  description: "Synthetic catalog entry",
  spriteVersionNumber: 2,
  spritesheetPath: "authorized-frames.png",
};
const collectionManifest = {
  id: "example",
  displayName: "Example Collection",
  description: "Synthetic variant package",
  spriteVersionNumber: 3,
  defaultVariant: "first",
  variants: [
    { id: "first", displayName: "First", description: "", spriteVersionNumber: 1, spritesheetPath: "variants/first.png" },
    { id: "second", displayName: "Second", description: "", spriteVersionNumber: 1, spritesheetPath: "variants/second.png" },
  ],
};

describe("bundled desktop pet discovery", () => {
  it("registers a package from its manifest and uses its declared atlas", () => {
    expect(discoverBundledDesktopPets({ [fixturePath]: manifest }, { [atlasPath]: "/built/example.png" }))
      .toEqual([{ manifest, atlas: "/built/example.png" }]);
    expect(DEFAULT_PET.manifest.id).toBe("amber-cat");
  });

  it("registers V3 variant packages as one collection instead of separate pets", () => {
    const atlases = {
      "../assets/pets/example/variants/first.png": "/built/first.png",
      "../assets/pets/example/variants/second.png": "/built/second.png",
    };
    expect(discoverBundledDesktopPets({ [fixturePath]: collectionManifest }, atlases)).toEqual([]);
    const [collection] = discoverBundledDesktopCollections({ [fixturePath]: collectionManifest }, atlases);
    expect(collection.manifest).toEqual(collectionManifest);
    expect(collection.defaultVariant).toBe("first");
    expect(collection.variants.map((variant) => [variant.id, variant.atlas]))
      .toEqual([["first", "/built/first.png"], ["second", "/built/second.png"]]);
    expect(collection.variants[0].manifest.id).toBe("example");
  });

  it("leaves paths without a manifest out of the catalog and rejects mismatched packages", () => {
    expect(discoverBundledDesktopPets({}, { [atlasPath]: "/built/example.png" })).toEqual([]);
    expect(() => discoverBundledDesktopPets({ [fixturePath]: manifest }, {})).toThrow(fixturePath);
    expect(() => discoverBundledDesktopPets(
      { [fixturePath]: { ...manifest, id: "different" } }, { [atlasPath]: "/built/example.png" },
    )).toThrow(fixturePath);
    expect(() => discoverBundledDesktopCollections(
      { [fixturePath]: { ...collectionManifest, id: "different" } },
      { "../assets/pets/example/variants/first.png": "/built/first.png" },
    )).toThrow(fixturePath);
  });
});

describe("bundled desktop pet catalog", () => {
  it("registers every shipped package from its own folder and manifest", () => {
    expect(BUNDLED_PETS.map((pet) => pet.manifest.id))
      .toEqual(["amber-cat", "lantern-moth", "pocket-robot"]);
    for (const pet of BUNDLED_PETS) {
      expect(pet.atlas).toContain(pet.manifest.id);
      expect(pet.manifest.spritesheetPath).toMatch(/\.(png|webp)$/);
    }
    expect(BUNDLED_COLLECTIONS.map((collection) => collection.manifest.id)).toEqual(["clawd", "mole-baby"]);
  });

  it("groups the Clawd on Desk themes as one collection with a V2 default variant", () => {
    const collection = BUNDLED_COLLECTIONS.find((entry) => entry.manifest.id === "clawd");
    expect(collection?.defaultVariant).toBe("clawd");
    expect(collection?.variants.map((variant) => variant.id)).toEqual(["clawd", "calico", "cloudling"]);
    expect(collection?.variants[0].manifest.spriteVersionNumber).toBe(2);
    expect(collection?.variants.slice(1).map((variant) => variant.manifest.spriteVersionNumber)).toEqual([1, 1]);
    expect(collection?.variants.every((variant) => variant.atlas.includes("clawd"))).toBe(true);
    expect(collection?.variants.find((variant) => variant.id === "calico")?.sleepingFrame).toEqual({ row: 4, column: 1 });
    expect(collection?.variants.find((variant) => variant.id === "cloudling")?.sleepingFrame).toEqual({ row: 3, column: 0 });
  });

  it("groups the Lamu forms as one collection while keeping single sheets on their versions", () => {
    const petManifests = new Map(BUNDLED_PETS.map((pet) => [pet.manifest.id, pet.manifest]));
    expect(petManifests.get("lantern-moth")).toMatchObject({ spriteVersionNumber: 2, spritesheetPath: "spritesheet.webp" });
    const collection = BUNDLED_COLLECTIONS.find((entry) => entry.manifest.id === "mole-baby");
    expect(collection?.defaultVariant).toBe("middle");
    expect(collection?.variants.map((variant) => variant.id))
      .toEqual(["seed", "junior", "middle", "senior", "classic", "super", "water", "wood", "fire"]);
    for (const variant of collection?.variants ?? []) {
      expect(variant.atlas).toContain("mole-baby");
      expect(variant.manifest.id).toBe("mole-baby");
      expect(variant.manifest.spritesheetPath).toBe(`variants/${variant.id}.png`);
    }
    expect(collection?.variants.find((variant) => variant.id === "seed")?.sleepingFrame).toEqual({ row: 0, column: 3 });
  });

  it("resolves bundled collection variants by id and falls back to the default", async () => {
    const seed = await loadDesktopPetSprite("mole-baby", "seed");
    expect(seed.manifest.id).toBe("mole-baby");
    expect(seed.atlas).toContain("seed");
    expect(seed.sleepingFrame).toEqual({ row: 0, column: 3 });

    const unknown = await loadDesktopPetSprite("mole-baby", "missing");
    expect(unknown.atlas).toContain("middle");
    expect(unknown.sleepingFrame).toBeUndefined();

    const calico = await loadDesktopPetSprite("clawd", "calico");
    expect(calico.manifest.id).toBe("clawd");
    expect(calico.atlas).toContain("calico");
    expect((await loadDesktopPetSprite("clawd", null)).atlas).toContain("clawd");
  });
});
