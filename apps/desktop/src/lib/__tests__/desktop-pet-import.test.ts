import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import type { ImportedPetCollection } from "../codex-pet";

const state = vi.hoisted(() => ({ rows: [] as unknown[], inserts: [] as unknown[][] }));

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("../db", () => ({
  dbSelect: vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("SELECT id, manifest, thumbnail")) return state.rows;
    if (sql.startsWith("SELECT id FROM desktop_pet_packs")) {
      const [id] = (params ?? []) as string[];
      return state.rows
        .map((row) => row as { id: string })
        .filter((row) => row.id === id || row.id.startsWith(`${id}:`));
    }
    return [];
  }),
  dbExecute: vi.fn(async (_sql: string, params?: unknown[]) => {
    state.inserts.push(params ?? []);
  }),
}));

import { loadDesktopPetSprite, loadImportedDesktopPets, saveImportedDesktopPet } from "../desktop-pet-catalog";

const THUMBNAIL = "data:image/png;base64,AA==";

function importedVariantRow(variantId: string, order: number) {
  return {
    id: `mole-import:${variantId}`,
    manifest: JSON.stringify({
      id: "mole-import",
      displayName: "Mole Import",
      description: "Imported forms",
      spriteVersionNumber: 1,
      spritesheetPath: `variants/${variantId}.png`,
      collection: {
        id: "mole-import",
        displayName: "Mole Import",
        description: "Imported forms",
        defaultVariant: "middle",
        variantId,
        variantDisplayName: variantId,
        variantDescription: "",
        order,
      },
    }),
    thumbnail: THUMBNAIL,
  };
}

afterEach(() => {
  state.rows = [];
  state.inserts = [];
  vi.clearAllMocks();
});

describe("imported V3 pet collections", () => {
  it("groups variant rows into one collection ordered by variant order", async () => {
    state.rows = [importedVariantRow("middle", 1), importedVariantRow("seed", 0)];
    const entries = await loadImportedDesktopPets();
    expect(entries).toEqual([{
      kind: "collection",
      id: "mole-import",
      displayName: "Mole Import",
      description: "Imported forms",
      defaultVariant: "middle",
      variants: [
        { id: "seed", displayName: "seed", description: "", thumbnail: THUMBNAIL },
        { id: "middle", displayName: "middle", description: "", thumbnail: THUMBNAIL },
      ],
    }]);
  });

  it("keeps single-sheet imports as ordinary pets", async () => {
    state.rows = [{
      id: "single-pet",
      manifest: JSON.stringify({
        id: "single-pet",
        displayName: "Single Pet",
        description: "",
        spriteVersionNumber: 1,
        spritesheetPath: "spritesheet.png",
      }),
      thumbnail: THUMBNAIL,
    }];
    expect(await loadImportedDesktopPets()).toEqual([{
      kind: "pet",
      id: "single-pet",
      manifest: {
        id: "single-pet",
        displayName: "Single Pet",
        description: "",
        spriteVersionNumber: 1,
        spritesheetPath: "spritesheet.png",
      },
      thumbnail: THUMBNAIL,
    }]);
  });

  it("stores one row per variant under a composite id", async () => {
    const variant = (id: string) => ({
      id,
      displayName: id,
      description: "",
      manifest: {
        id: "mole-import-2",
        displayName: "Mole Import 2",
        description: "",
        spriteVersionNumber: 1 as const,
        spritesheetPath: `variants/${id}.png`,
      },
      atlas: "data:image/png;base64,AA==",
      thumbnail: THUMBNAIL,
    });
    const bundle = {
      manifest: {
        id: "mole-import-2",
        displayName: "Mole Import 2",
        description: "",
        spriteVersionNumber: 3 as const,
        defaultVariant: "a",
        variants: [
          { id: "a", displayName: "A", description: "", spriteVersionNumber: 1 as const, spritesheetPath: "variants/a.png" },
          { id: "b", displayName: "B", description: "", spriteVersionNumber: 1 as const, spritesheetPath: "variants/b.png" },
        ],
      },
      variants: [variant("a"), variant("b")],
    } satisfies ImportedPetCollection;
    await saveImportedDesktopPet(bundle);
    expect(state.inserts).toHaveLength(1);
    const params = state.inserts[0];
    expect(params[0]).toBe("mole-import-2:a");
    expect(params[4]).toBe("mole-import-2:b");
    expect(JSON.parse(String(params[1]))).toMatchObject({
      collection: { id: "mole-import-2", defaultVariant: "a", variantId: "a", order: 0 },
    });
  });
});



it("keeps V1/V2 imports whose sprite filename contains spaces", async () => {
  const manifest = {
    id: "legacy-pet",
    displayName: "Legacy Pet",
    description: "",
    spriteVersionNumber: 1,
    spritesheetPath: "My Pet.png",
  };
  state.rows = [{ id: "legacy-pet", manifest: JSON.stringify(manifest), thumbnail: THUMBNAIL }];
  const entries = await loadImportedDesktopPets();
  expect(entries).toEqual([{ kind: "pet", id: "legacy-pet", manifest, thumbnail: THUMBNAIL }]);

  vi.mocked(invoke).mockResolvedValue({ manifest: JSON.stringify(manifest), atlas: "data:image/png;base64,AA==" });
  expect((await loadDesktopPetSprite("legacy-pet")).manifest.spritesheetPath).toBe("My Pet.png");
});
