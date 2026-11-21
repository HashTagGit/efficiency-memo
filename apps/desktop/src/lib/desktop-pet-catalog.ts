import { invoke } from "@tauri-apps/api/core";
import { dbExecute, dbSelect } from "./db";
import { parsePetManifest, PetPackError, type CodexPetManifest, type ImportedPetPack } from "./codex-pet";

export interface DesktopPetSprite {
  manifest: CodexPetManifest;
  atlas: string;
}

export function discoverBundledDesktopPets(
  manifests: Record<string, unknown>,
  atlases: Record<string, string>,
): DesktopPetSprite[] {
  return Object.keys(manifests).sort().map((path) => {
    const folder = path.slice(0, path.lastIndexOf("/"));
    const folderId = folder.slice(folder.lastIndexOf("/") + 1);
    const manifest = parsePetManifest(manifests[path]);
    const atlas = atlases[`${folder}/${manifest.spritesheetPath}`];
    if (manifest.id !== folderId || !atlas) throw new Error(`Invalid bundled desktop pet package: ${path}`);
    return { manifest, atlas };
  });
}

export const BUNDLED_PETS: readonly DesktopPetSprite[] = discoverBundledDesktopPets(
  import.meta.glob("../assets/pets/*/pet.json", { eager: true, import: "default" }),
  import.meta.glob<string>("../assets/pets/*/*.{png,webp}", { eager: true, query: "?url", import: "default" }),
);
const defaultPet = BUNDLED_PETS.find((pet) => pet.manifest.id === "amber-cat");
if (!defaultPet) throw new Error("The default desktop pet is missing");
export const DEFAULT_PET = defaultPet;

function validDataImage(source: string): boolean {
  return source.startsWith("data:image/png;base64,") || source.startsWith("data:image/webp;base64,");
}

export async function loadImportedDesktopPets(): Promise<Pick<ImportedPetPack, "manifest" | "thumbnail">[]> {
  const rows = await dbSelect<{ manifest: string; thumbnail: string }>(
    "SELECT manifest, thumbnail FROM desktop_pet_packs ORDER BY id",
  );
  return rows.flatMap((row) => {
    try {
      const manifest = parsePetManifest(JSON.parse(row.manifest));
      if (BUNDLED_PETS.some((pet) => pet.manifest.id === manifest.id)) return [];
      return validDataImage(row.thumbnail) ? [{ manifest, thumbnail: row.thumbnail }] : [];
    } catch {
      return [];
    }
  });
}

export async function saveImportedDesktopPet(pack: ImportedPetPack): Promise<void> {
  const id = pack.manifest.id;
  const [existing] = await dbSelect<{ id: string }>("SELECT id FROM desktop_pet_packs WHERE id = $1", [id]);
  if (existing || BUNDLED_PETS.some((pet) => pet.manifest.id === id)) throw new PetPackError("duplicate");
  await dbExecute("INSERT INTO desktop_pet_packs (id, manifest, atlas, thumbnail) VALUES ($1, $2, $3, $4)",
    [id, JSON.stringify(pack.manifest), pack.atlas, pack.thumbnail]);
}

export async function loadDesktopPetSelection(): Promise<string> {
  const [row] = await dbSelect<{ selected_pet_id: string }>(
    "SELECT selected_pet_id FROM desktop_reminder_preferences WHERE id = 1",
  );
  return row?.selected_pet_id ?? DEFAULT_PET.manifest.id;
}

export function updateDesktopPetWindow(petId: string): Promise<void> {
  return invoke("select_desktop_pet", { petId });
}

export async function saveDesktopPetSelection(petId: string): Promise<void> {
  await dbExecute(
    "INSERT INTO desktop_reminder_preferences (id, pet_enabled, selected_pet_id) VALUES (1, 1, $1) ON CONFLICT(id) DO UPDATE SET selected_pet_id = excluded.selected_pet_id",
    [petId],
  );
  await updateDesktopPetWindow(petId);
}

export async function loadDesktopPetSprite(petId: string): Promise<DesktopPetSprite> {
  const builtIn = BUNDLED_PETS.find((pet) => pet.manifest.id === petId);
  if (builtIn) return builtIn;
  const pack = await invoke<{ manifest: string; atlas: string } | null>("load_desktop_pet_sprite", { petId });
  if (!pack || !validDataImage(pack.atlas)) return DEFAULT_PET;
  const manifest = parsePetManifest(JSON.parse(pack.manifest));
  return manifest.id === petId ? { manifest, atlas: pack.atlas } : DEFAULT_PET;
}
