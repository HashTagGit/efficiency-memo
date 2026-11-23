import { invoke } from "@tauri-apps/api/core";
import { dbExecute, dbSelect } from "./db";
import {
  isCollectionManifest,
  parseImportedCollectionRef,
  parsePetManifest,
  parseStoredSingleManifest,
  PetPackError,
  type CodexPetCollectionManifest,
  type CodexPetSingleManifest,
  type ImportedPetBundle,
  type ImportedPetCollection,
  type ImportedPetPack,
  type PetSleepingFrame,
} from "./codex-pet";

export interface DesktopPetSprite {
  manifest: CodexPetSingleManifest;
  atlas: string;
  sleepingFrame?: PetSleepingFrame;
}

export interface DesktopPetVariant extends DesktopPetSprite {
  id: string;
  displayName: string;
  description: string;
}

export interface DesktopPetCollection {
  manifest: CodexPetCollectionManifest;
  variants: DesktopPetVariant[];
  defaultVariant: string;
}

export interface DesktopPetSelection {
  petId: string;
  variantId: string | null;
}

export interface ImportedDesktopPet {
  kind: "pet";
  id: string;
  manifest: CodexPetSingleManifest;
  thumbnail: string;
}

export interface ImportedDesktopCollectionVariant {
  id: string;
  displayName: string;
  description: string;
  thumbnail: string;
}

export interface ImportedDesktopCollection {
  kind: "collection";
  id: string;
  displayName: string;
  description: string;
  defaultVariant: string;
  variants: ImportedDesktopCollectionVariant[];
}

export type ImportedDesktopEntry = ImportedDesktopPet | ImportedDesktopCollection;

interface BundledCatalog {
  pets: DesktopPetSprite[];
  collections: DesktopPetCollection[];
}

export function discoverBundledDesktopPetCatalog(
  manifests: Record<string, unknown>,
  atlases: Record<string, string>,
): BundledCatalog {
  const pets: DesktopPetSprite[] = [];
  const collections: DesktopPetCollection[] = [];
  for (const path of Object.keys(manifests).sort()) {
    const folder = path.slice(0, path.lastIndexOf("/"));
    const folderId = folder.slice(folder.lastIndexOf("/") + 1);
    const manifest = parsePetManifest(manifests[path]);
    if (manifest.id !== folderId) throw new Error(`Invalid bundled desktop pet package: ${path}`);
    if (isCollectionManifest(manifest)) {
      const variants = manifest.variants.map((variant) => {
        const atlas = atlases[`${folder}/${variant.spritesheetPath}`];
        if (!atlas) throw new Error(`Invalid bundled desktop pet package: ${path}`);
        return {
          id: variant.id,
          displayName: variant.displayName,
          description: variant.description,
          manifest: { ...variant, id: manifest.id },
          atlas,
          sleepingFrame: variant.sleepingFrame,
        };
      });
      collections.push({ manifest, variants, defaultVariant: manifest.defaultVariant });
      continue;
    }
    const atlas = atlases[`${folder}/${manifest.spritesheetPath}`];
    if (!atlas) throw new Error(`Invalid bundled desktop pet package: ${path}`);
    pets.push({ manifest, atlas, sleepingFrame: manifest.sleepingFrame });
  }
  return { pets, collections };
}

export function discoverBundledDesktopPets(
  manifests: Record<string, unknown>,
  atlases: Record<string, string>,
): DesktopPetSprite[] {
  return discoverBundledDesktopPetCatalog(manifests, atlases).pets;
}

export function discoverBundledDesktopCollections(
  manifests: Record<string, unknown>,
  atlases: Record<string, string>,
): DesktopPetCollection[] {
  return discoverBundledDesktopPetCatalog(manifests, atlases).collections;
}

const bundledCatalog = discoverBundledDesktopPetCatalog(
  import.meta.glob("../assets/pets/*/pet.json", { eager: true, import: "default" }),
  import.meta.glob<string>("../assets/pets/**/*.{png,webp}", { eager: true, query: "?url", import: "default" }),
);

export const BUNDLED_PETS: readonly DesktopPetSprite[] = bundledCatalog.pets;
export const BUNDLED_COLLECTIONS: readonly DesktopPetCollection[] = bundledCatalog.collections;

const defaultPet = BUNDLED_PETS.find((pet) => pet.manifest.id === "amber-cat");
if (!defaultPet) throw new Error("The default desktop pet is missing");
export const DEFAULT_PET = defaultPet;

function validDataImage(source: string): boolean {
  return source.startsWith("data:image/png;base64,") || source.startsWith("data:image/webp;base64,");
}

function isCollectionBundle(bundle: ImportedPetBundle): bundle is ImportedPetCollection {
  return "variants" in bundle;
}

function isBundledId(id: string): boolean {
  return BUNDLED_PETS.some((pet) => pet.manifest.id === id)
    || BUNDLED_COLLECTIONS.some((collection) => collection.manifest.id === id);
}

export async function loadImportedDesktopPets(): Promise<ImportedDesktopEntry[]> {
  const rows = await dbSelect<{ id: string; manifest: string; thumbnail: string }>(
    "SELECT id, manifest, thumbnail FROM desktop_pet_packs ORDER BY id",
  );
  const pets: ImportedDesktopPet[] = [];
  const collections = new Map<string, ImportedDesktopCollection & { order: Map<string, number> }>();
  for (const row of rows) {
    if (!validDataImage(row.thumbnail)) continue;
    try {
      const raw = JSON.parse(row.manifest) as Record<string, unknown>;
      const collection = parseImportedCollectionRef(raw.collection);
      const manifest = collection ? parseStoredSingleManifest(raw) : parsePetManifest(raw);
      if (isCollectionManifest(manifest)) continue;
      if (!collection || collection.id !== manifest.id) {
        pets.push({ kind: "pet", id: manifest.id, manifest, thumbnail: row.thumbnail });
        continue;
      }
      const entry = collections.get(collection.id) ?? {
        kind: "collection" as const,
        id: collection.id,
        displayName: collection.displayName,
        description: collection.description,
        defaultVariant: collection.defaultVariant,
        variants: [],
        order: new Map<string, number>(),
      };
      entry.variants.push({
        id: collection.variantId,
        displayName: collection.variantDisplayName,
        description: collection.variantDescription,
        thumbnail: row.thumbnail,
      });
      entry.order.set(collection.variantId, collection.order);
      collections.set(collection.id, entry);
    } catch {
      // Ignore unreadable imported rows; the catalog keeps working.
    }
  }
  return [
    ...pets,
    ...Array.from(collections.values()).map(({ order, ...entry }) => ({
      ...entry,
      variants: [...entry.variants].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
    })),
  ];
}

async function importedRows(id: string): Promise<{ id: string }[]> {
  return dbSelect<{ id: string }>(
    "SELECT id FROM desktop_pet_packs WHERE id = $1 OR substr(id, 1, length($1) + 1) = $2",
    [id, `${id}:`],
  );
}

async function saveImportedCollection(pack: ImportedPetCollection): Promise<void> {
  const id = pack.manifest.id;
  if (isBundledId(id) || (await importedRows(id)).length > 0) throw new PetPackError("duplicate");
  const params: unknown[] = [];
  const rows = pack.variants.map((variant, index) => {
    const manifest = {
      ...variant.manifest,
      collection: {
        id,
        displayName: pack.manifest.displayName,
        description: pack.manifest.description,
        defaultVariant: pack.manifest.defaultVariant,
        variantId: variant.id,
        variantDisplayName: variant.displayName,
        variantDescription: variant.description,
        order: index,
      },
    };
    params.push(`${id}:${variant.id}`, JSON.stringify(manifest), variant.atlas, variant.thumbnail);
    const offset = index * 4;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  });
  // One statement keeps the whole collection atomic if the app closes mid-import.
  await dbExecute(`INSERT INTO desktop_pet_packs (id, manifest, atlas, thumbnail) VALUES ${rows.join(", ")}`, params);
}

export async function saveImportedDesktopPet(bundle: ImportedPetBundle): Promise<void> {
  if (isCollectionBundle(bundle)) {
    await saveImportedCollection(bundle);
    return;
  }
  const pack: ImportedPetPack = bundle;
  const id = pack.manifest.id;
  if (isBundledId(id) || (await importedRows(id)).length > 0) throw new PetPackError("duplicate");
  await dbExecute("INSERT INTO desktop_pet_packs (id, manifest, atlas, thumbnail) VALUES ($1, $2, $3, $4)",
    [id, JSON.stringify(pack.manifest), pack.atlas, pack.thumbnail]);
}

export async function loadDesktopPetSelection(): Promise<DesktopPetSelection> {
  const [row] = await dbSelect<{ selected_pet_id: string; selected_pet_variant: string | null }>(
    "SELECT selected_pet_id, selected_pet_variant FROM desktop_reminder_preferences WHERE id = 1",
  );
  return {
    petId: row?.selected_pet_id ?? DEFAULT_PET.manifest.id,
    variantId: row?.selected_pet_variant ?? null,
  };
}

export function updateDesktopPetWindow(petId: string, variantId?: string | null): Promise<void> {
  return invoke("select_desktop_pet", variantId ? { petId, variantId } : { petId });
}

export async function saveDesktopPetSelection(petId: string, variantId?: string | null): Promise<void> {
  await dbExecute(
    "INSERT INTO desktop_reminder_preferences (id, pet_enabled, selected_pet_id, selected_pet_variant) VALUES (1, 1, $1, $2) ON CONFLICT(id) DO UPDATE SET selected_pet_id = excluded.selected_pet_id, selected_pet_variant = excluded.selected_pet_variant",
    [petId, variantId ?? null],
  );
  await updateDesktopPetWindow(petId, variantId ?? null);
}

export function findBundledCollection(petId: string): DesktopPetCollection | undefined {
  return BUNDLED_COLLECTIONS.find((collection) => collection.manifest.id === petId);
}

export async function resolveDesktopPetSelection(): Promise<DesktopPetSelection> {
  const selection = await loadDesktopPetSelection();
  const imported = isBundledId(selection.petId) ? [] : await loadImportedDesktopPets().catch(() => []);
  return normalizeDesktopPetSelection(selection, imported);
}

export function normalizeDesktopPetSelection(selection: DesktopPetSelection, imported: ImportedDesktopEntry[]): DesktopPetSelection {
  const bundled = findBundledCollection(selection.petId);
  if (bundled) {
    const variant = bundled.variants.find((entry) => entry.id === selection.variantId) ?? bundled.variants.find((entry) => entry.id === bundled.defaultVariant) ?? bundled.variants[0];
    return { petId: selection.petId, variantId: variant?.id ?? null };
  }
  if (BUNDLED_PETS.some((pet) => pet.manifest.id === selection.petId)) {
    return { petId: selection.petId, variantId: null };
  }
  const importedCollection = imported.find((entry): entry is ImportedDesktopCollection => entry.kind === "collection" && entry.id === selection.petId);
  if (importedCollection) {
    const variant = importedCollection.variants.find((entry) => entry.id === selection.variantId) ?? importedCollection.variants.find((entry) => entry.id === importedCollection.defaultVariant) ?? importedCollection.variants[0];
    return { petId: selection.petId, variantId: variant?.id ?? null };
  }
  const known = BUNDLED_PETS.some((pet) => pet.manifest.id === selection.petId)
    || imported.some((entry) => entry.id === selection.petId);
  return known ? { petId: selection.petId, variantId: null } : { petId: DEFAULT_PET.manifest.id, variantId: null };
}

export async function loadDesktopPetSprite(petId: string, variantId?: string | null): Promise<DesktopPetSprite> {
  const builtIn = BUNDLED_PETS.find((pet) => pet.manifest.id === petId);
  if (builtIn) return builtIn;
  const collection = findBundledCollection(petId);
  if (collection) {
    const variant = collection.variants.find((entry) => entry.id === variantId)
      ?? collection.variants.find((entry) => entry.id === collection.defaultVariant)
      ?? collection.variants[0];
    if (variant) return { manifest: variant.manifest, atlas: variant.atlas, sleepingFrame: variant.sleepingFrame };
  }
  const rowId = variantId ? `${petId}:${variantId}` : petId;
  const pack = await invoke<{ manifest: string; atlas: string } | null>("load_desktop_pet_sprite", { petId: rowId });
  if (!pack || !validDataImage(pack.atlas)) return DEFAULT_PET;
  const raw = JSON.parse(pack.manifest) as Record<string, unknown>;
  const manifest = parseImportedCollectionRef(raw.collection) ? parseStoredSingleManifest(raw) : parsePetManifest(raw);
  if (isCollectionManifest(manifest) || manifest.id !== petId) return DEFAULT_PET;
  return { manifest, atlas: pack.atlas, sleepingFrame: manifest.sleepingFrame };
}
