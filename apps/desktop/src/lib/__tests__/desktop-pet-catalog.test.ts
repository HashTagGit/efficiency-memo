import { describe, expect, it } from "vitest";
import { DEFAULT_PET, discoverBundledDesktopPets } from "../desktop-pet-catalog";

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
