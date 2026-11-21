import { describe, expect, it } from "vitest";
import { BUNDLED_PETS, DEFAULT_PET, discoverBundledDesktopPets } from "../desktop-pet-catalog";

const fixturePath = "../assets/pets/example/pet.json";
const atlasPath = "../assets/pets/example/authorized-frames.png";
const manifest = {
  id: "example",
  displayName: "Example Pet",
  description: "Synthetic catalog entry",
  spriteVersionNumber: 2,
  spritesheetPath: "authorized-frames.png",
};

describe("bundled desktop pet discovery", () => {
  it("registers a package from its manifest and uses its declared atlas", () => {
    expect(discoverBundledDesktopPets({ [fixturePath]: manifest }, { [atlasPath]: "/built/example.png" }))
      .toEqual([{ manifest, atlas: "/built/example.png" }]);
    expect(DEFAULT_PET.manifest.id).toBe("amber-cat");
  });

  it("leaves paths without a manifest out of the catalog and rejects mismatched packages", () => {
    expect(discoverBundledDesktopPets({}, { [atlasPath]: "/built/example.png" })).toEqual([]);
    expect(() => discoverBundledDesktopPets({ [fixturePath]: manifest }, {})).toThrow(fixturePath);
    expect(() => discoverBundledDesktopPets(
      { [fixturePath]: { ...manifest, id: "different" } }, { [atlasPath]: "/built/example.png" },
    )).toThrow(fixturePath);
  });
});

describe("bundled desktop pet catalog", () => {
  it("registers every shipped package from its own folder and manifest", () => {
    expect(BUNDLED_PETS.map((pet) => pet.manifest.id))
      .toEqual(["amber-cat", "clawd", "lantern-moth", "mole-baby", "pocket-robot"]);
    for (const pet of BUNDLED_PETS) {
      expect(pet.atlas).toContain(pet.manifest.id);
      expect(pet.manifest.spritesheetPath).toMatch(/\.(png|webp)$/);
    }
  });

  it("keeps the mole-baby and clawd packages on their declared sprite versions", () => {
    const manifests = new Map(BUNDLED_PETS.map((pet) => [pet.manifest.id, pet.manifest]));
    expect(manifests.get("mole-baby")).toMatchObject({ spriteVersionNumber: 1, spritesheetPath: "spritesheet.png" });
    expect(manifests.get("clawd")).toMatchObject({ spriteVersionNumber: 2, spritesheetPath: "spritesheet.png" });
  });
});
