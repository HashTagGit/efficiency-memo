import codexPetAtlas from "./codex-pet-atlas.json";
import { openPetZip } from "./pet-zip";

export const PET_FRAME_WIDTH = codexPetAtlas.frameWidth;
export const PET_FRAME_HEIGHT = codexPetAtlas.frameHeight;
export const PET_COLUMNS = codexPetAtlas.columns;
export const PET_TRACKS: readonly (readonly number[])[] = codexPetAtlas.tracks.map((track) => track.durations);

export interface PetSleepingFrame {
  row: number;
  column: number;
}

export interface CodexPetSingleManifest {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 1 | 2;
  spritesheetPath: string;
  sleepingFrame?: PetSleepingFrame;
}

export interface CodexPetVariant {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 1 | 2;
  spritesheetPath: string;
  sleepingFrame?: PetSleepingFrame;
}

export interface CodexPetCollectionManifest {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 3;
  defaultVariant: string;
  variants: CodexPetVariant[];
}

export type CodexPetManifest = CodexPetSingleManifest | CodexPetCollectionManifest;

export class PetPackError extends Error {
  constructor(readonly reason: "files" | "manifest" | "image" | "layout" | "duplicate" | "zip" | "variant") {
    super(reason);
  }
}

const PET_ID = /^[\p{L}\p{N}_-]{1,100}$/u;
const VARIANT_ID = /^[A-Za-z0-9_-]{1,64}$/;
// eslint-disable-next-line no-control-regex -- Control characters are invalid in imported filenames.
const SINGLE_SPRITE_PATH = /^[^/\\\x00-\x1f]+\.(png|webp)$/i;
const VARIANT_SPRITE_PATH = /^[A-Za-z0-9_][A-Za-z0-9._/-]*\.(png|webp)$/i;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 120;

export function petAtlasRows(version: 1 | 2): number {
  return PET_TRACKS.length + (version === 2 ? codexPetAtlas.lookFrames / PET_COLUMNS : 0);
}

export function parseSleepingFrame(value: unknown, version: 1 | 2): PetSleepingFrame | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const { row, column } = value as Record<string, unknown>;
  if (!Number.isInteger(row) || !Number.isInteger(column)
    || (row as number) < 0 || (row as number) >= petAtlasRows(version)
    || (column as number) < 0 || (column as number) >= PET_COLUMNS) {
    throw new PetPackError("manifest");
  }
  const activeColumns = (row as number) < PET_TRACKS.length ? PET_TRACKS[row as number].length : PET_COLUMNS;
  if ((column as number) >= activeColumns) throw new PetPackError("manifest");
  return { row: row as number, column: column as number };
}

function parseHeader(value: Record<string, unknown>, idPattern: RegExp): { id: string; displayName: string; description: string } {
  const { id, displayName, description } = value;
  if (typeof id !== "string" || !idPattern.test(id)
    || typeof displayName !== "string" || !displayName.trim() || displayName.length > MAX_DISPLAY_NAME_LENGTH
    || typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new PetPackError("manifest");
  }
  return { id, displayName, description };
}

function parseSpritesheetPath(value: unknown, allowDirectories: boolean): string {
  if (typeof value !== "string" || value.length > 200) throw new PetPackError("manifest");
  if (allowDirectories) {
    if (!VARIANT_SPRITE_PATH.test(value) || value.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
      throw new PetPackError("manifest");
    }
    return value;
  }
  if (!SINGLE_SPRITE_PATH.test(value)) throw new PetPackError("manifest");
  return value;
}

function parseSingleManifest(value: unknown, variant: boolean): CodexPetSingleManifest | CodexPetVariant {
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const record = value as Record<string, unknown>;
  const header = parseHeader(record, variant ? VARIANT_ID : PET_ID);
  const { spriteVersionNumber = 1, spritesheetPath = "spritesheet.webp", sleepingFrame } = record;
  if (spriteVersionNumber !== 1 && spriteVersionNumber !== 2) throw new PetPackError("manifest");
  const manifest: CodexPetSingleManifest = {
    id: header.id,
    displayName: header.displayName,
    description: header.description,
    spriteVersionNumber,
    spritesheetPath: parseSpritesheetPath(spritesheetPath, variant),
    sleepingFrame: parseSleepingFrame(sleepingFrame, spriteVersionNumber),
  };
  return variant ? { ...manifest, id: header.id } : manifest;
}

function parseCollectionManifest(value: unknown): CodexPetCollectionManifest {
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const record = value as Record<string, unknown>;
  const header = parseHeader(record, PET_ID);
  const { defaultVariant, variants } = record;
  if (!Array.isArray(variants) || variants.length < 2 || variants.length > 64) throw new PetPackError("manifest");
  const parsed = variants.map((variant) => parseSingleManifest(variant, true) as CodexPetVariant);
  const ids = new Set<string>();
  for (const variant of parsed) {
    if (ids.has(variant.id)) throw new PetPackError("manifest");
    ids.add(variant.id);
  }
  if (typeof defaultVariant !== "string" || !ids.has(defaultVariant)) throw new PetPackError("manifest");
  return {
    id: header.id,
    displayName: header.displayName,
    description: header.description,
    spriteVersionNumber: 3,
    defaultVariant,
    variants: parsed,
  };
}

export function isCollectionManifest(manifest: CodexPetManifest): manifest is CodexPetCollectionManifest {
  return manifest.spriteVersionNumber === 3;
}

export function parseSinglePetManifest(value: unknown): CodexPetSingleManifest {
  return parseSingleManifest(value, false) as CodexPetSingleManifest;
}

/** Parse a single-sheet manifest stored for an imported variant row. The id is the
 * collection id and the sheet path may point into the package's variant directory. */
export function parseStoredSingleManifest(value: unknown): CodexPetSingleManifest {
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const record = value as Record<string, unknown>;
  const header = parseHeader(record, PET_ID);
  const { spriteVersionNumber = 1, spritesheetPath = "spritesheet.webp", sleepingFrame } = record;
  if (spriteVersionNumber !== 1 && spriteVersionNumber !== 2) throw new PetPackError("manifest");
  return {
    id: header.id,
    displayName: header.displayName,
    description: header.description,
    spriteVersionNumber,
    spritesheetPath: parseSpritesheetPath(spritesheetPath, true),
    sleepingFrame: parseSleepingFrame(sleepingFrame, spriteVersionNumber),
  };
}

export function parsePetManifest(value: unknown): CodexPetManifest {
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const { spriteVersionNumber = 1 } = value as Record<string, unknown>;
  if (spriteVersionNumber === 3) return parseCollectionManifest(value);
  if (spriteVersionNumber !== 1 && spriteVersionNumber !== 2) throw new PetPackError("manifest");
  return parseSingleManifest(value, false) as CodexPetSingleManifest;
}

export function validatePetAtlas(version: 1 | 2, image: ImageData): void {
  const rows = petAtlasRows(version);
  if (image.width !== PET_COLUMNS * PET_FRAME_WIDTH || image.height !== rows * PET_FRAME_HEIGHT) {
    throw new PetPackError("layout");
  }

  const alphas = new Uint32Array(rows * PET_COLUMNS);
  for (let y = 0; y < image.height; y++) {
    const firstCell = Math.floor(y / PET_FRAME_HEIGHT) * PET_COLUMNS;
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] !== 0) {
        alphas[firstCell + Math.floor(x / PET_FRAME_WIDTH)]++;
      }
    }
  }
  const cellArea = PET_FRAME_WIDTH * PET_FRAME_HEIGHT;
  alphas.forEach((count, index) => {
    const row = Math.floor(index / PET_COLUMNS);
    const active = index % PET_COLUMNS < (PET_TRACKS[row]?.length ?? PET_COLUMNS);
    if (active ? count === 0 || count === cellArea : count !== 0) throw new PetPackError("layout");
  });
}

export interface ImportedPetSprite {
  manifest: CodexPetSingleManifest;
  atlas: string;
  thumbnail: string;
}

export type ImportedPetPack = ImportedPetSprite;

export interface ImportedPetVariant extends ImportedPetSprite {
  id: string;
  displayName: string;
  description: string;
}

export interface ImportedPetCollection {
  manifest: CodexPetCollectionManifest;
  variants: ImportedPetVariant[];
}

export type ImportedPetBundle = ImportedPetPack | ImportedPetCollection;

export interface ImportedCollectionRef {
  id: string;
  displayName: string;
  description: string;
  defaultVariant: string;
  variantId: string;
  variantDisplayName: string;
  variantDescription: string;
  order: number;
}

export function parseImportedCollectionRef(value: unknown): ImportedCollectionRef | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const {
    id, displayName, description, defaultVariant,
    variantId, variantDisplayName, variantDescription, order,
  } = record;
  if (typeof id !== "string" || !PET_ID.test(id)
    || typeof displayName !== "string" || !displayName.trim() || displayName.length > MAX_DISPLAY_NAME_LENGTH
    || typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH
    || typeof defaultVariant !== "string" || !VARIANT_ID.test(defaultVariant)
    || typeof variantId !== "string" || !VARIANT_ID.test(variantId)
    || typeof variantDisplayName !== "string" || !variantDisplayName.trim() || variantDisplayName.length > MAX_DISPLAY_NAME_LENGTH
    || typeof variantDescription !== "string" || variantDescription.length > MAX_DESCRIPTION_LENGTH
    || !Number.isInteger(order) || (order as number) < 0 || (order as number) > 63) {
    return null;
  }
  return {
    id, displayName, description, defaultVariant,
    variantId, variantDisplayName, variantDescription, order: order as number,
  };
}


const MAX_MANIFEST_BYTES = 128 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

async function decodeSprite(file: File, manifest: CodexPetSingleManifest): Promise<Pick<ImportedPetSprite, "atlas" | "thumbnail">> {
  if (file.size > MAX_IMAGE_BYTES) throw new PetPackError("image");
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hasBytes = (expected: number[], offset = 0) => expected.every((byte, i) => signature[offset + i] === byte);
  const png = hasBytes([137, 80, 78, 71, 13, 10, 26, 10]);
  const webp = hasBytes([82, 73, 70, 70]) && hasBytes([87, 69, 66, 80], 8);
  if (!(file.name.toLowerCase().endsWith(".png") ? png : webp)) throw new PetPackError("image");

  const bitmap = await createImageBitmap(file).catch(() => { throw new PetPackError("image"); });
  try {
    if (bitmap.width !== PET_COLUMNS * PET_FRAME_WIDTH
      || bitmap.height !== petAtlasRows(manifest.spriteVersionNumber) * PET_FRAME_HEIGHT) {
      throw new PetPackError("layout");
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new PetPackError("image");
    context.drawImage(bitmap, 0, 0);
    validatePetAtlas(manifest.spriteVersionNumber, context.getImageData(0, 0, canvas.width, canvas.height));

    canvas.width = PET_FRAME_WIDTH;
    canvas.height = PET_FRAME_HEIGHT;
    context.drawImage(bitmap, 0, 0);
    const atlas = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new PetPackError("image"));
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new PetPackError("image"));
      reader.readAsDataURL(new Blob([file], { type: png ? "image/png" : "image/webp" }));
    });
    return { atlas, thumbnail: canvas.toDataURL("image/png") };
  } finally {
    bitmap.close();
  }
}

export async function readPetPack(files: readonly File[]): Promise<ImportedPetBundle> {
  if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
    try {
      const archive = await openPetZip(files[0]);
      const manifests = archive.paths.filter((path) => path === "pet.json" || path.endsWith("/pet.json"));
      if (manifests.length !== 1) throw new PetPackError("zip");
      const path = manifests[0];
      const prefix = path.slice(0, path.lastIndexOf("/") + 1);
      const file = await archive.read(path, MAX_MANIFEST_BYTES);
      const manifest = parsePetManifest(JSON.parse(await file.text()));
      if (isCollectionManifest(manifest)) {
        const variants: ImportedPetVariant[] = [];
        for (const variant of manifest.variants) {
          const sprite = await archive.read(prefix + variant.spritesheetPath, MAX_IMAGE_BYTES).catch(() => {
            throw new PetPackError("variant");
          });
          const decoded = await decodeSprite(sprite, { ...variant, id: manifest.id });
          variants.push({
            id: variant.id,
            displayName: variant.displayName,
            description: variant.description,
            manifest: { ...variant, id: manifest.id },
            ...decoded,
          });
        }
        return { manifest, variants };
      }
      const sprite = await archive.read(prefix + manifest.spritesheetPath, MAX_IMAGE_BYTES);
      return { manifest, ...await decodeSprite(sprite, manifest) };
    } catch (error) {
      if (error instanceof PetPackError) throw error;
      throw new PetPackError("zip");
    }
  }

  const manifestFile = files.find((file) => file.name === "pet.json");
  if (!manifestFile || manifestFile.size > MAX_MANIFEST_BYTES) throw new PetPackError("files");
  let manifest: CodexPetManifest;
  try {
    manifest = parsePetManifest(JSON.parse(await manifestFile.text()));
  } catch {
    throw new PetPackError("manifest");
  }
  if (isCollectionManifest(manifest)) {
    throw new PetPackError("files");
  }
  if (files.length !== 2) throw new PetPackError("files");
  const spriteFile = files.find((file) => file.name === manifest.spritesheetPath);
  if (!spriteFile) throw new PetPackError("files");
  return { manifest, ...await decodeSprite(spriteFile, manifest) };
}
