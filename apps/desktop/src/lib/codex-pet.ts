import codexPetAtlas from "./codex-pet-atlas.json";
import { openPetZip } from "./pet-zip";

export const PET_FRAME_WIDTH = codexPetAtlas.frameWidth;
export const PET_FRAME_HEIGHT = codexPetAtlas.frameHeight;
export const PET_COLUMNS = codexPetAtlas.columns;
export const PET_TRACKS: readonly (readonly number[])[] = codexPetAtlas.tracks.map((track) => track.durations);

export interface CodexPetManifest {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 1 | 2;
  spritesheetPath: string;
}

export class PetPackError extends Error {
  constructor(readonly reason: "files" | "manifest" | "image" | "layout" | "duplicate" | "zip") {
    super(reason);
  }
}

export function parsePetManifest(value: unknown): CodexPetManifest {
  if (!value || typeof value !== "object") throw new PetPackError("manifest");
  const { id, displayName, description, spriteVersionNumber = 1, spritesheetPath = "spritesheet.webp" } = value as Record<string, unknown>;
  if (typeof id !== "string" || !/^[\p{L}\p{N}_-]{1,100}$/u.test(id)
    || typeof displayName !== "string" || !displayName.trim() || displayName.length > 120
    || typeof description !== "string" || description.length > 500
    || (spriteVersionNumber !== 1 && spriteVersionNumber !== 2)
    || typeof spritesheetPath !== "string" || !/^[^/\\\x00-\x1f]+\.(png|webp)$/i.test(spritesheetPath)) {
    throw new PetPackError("manifest");
  }
  return { id, displayName, description, spriteVersionNumber, spritesheetPath };
}

export function petAtlasRows(version: CodexPetManifest["spriteVersionNumber"]): number {
  return PET_TRACKS.length + (version === 2 ? codexPetAtlas.lookFrames / PET_COLUMNS : 0);
}

export function validatePetAtlas(version: CodexPetManifest["spriteVersionNumber"], image: ImageData): void {
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

export interface ImportedPetPack {
  manifest: CodexPetManifest;
  atlas: string;
  thumbnail: string;
}

export async function readPetPack(files: readonly File[]): Promise<ImportedPetPack> {
  if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
    try {
      const archive = await openPetZip(files[0]);
      const manifests = archive.paths.filter((path) => path === "pet.json" || path.endsWith("/pet.json"));
      if (manifests.length !== 1) throw new PetPackError("zip");
      const path = manifests[0];
      const file = await archive.read(path, 16 * 1024);
      const manifest = parsePetManifest(JSON.parse(await file.text()));
      const sprite = await archive.read(path.slice(0, path.lastIndexOf("/") + 1) + manifest.spritesheetPath, 20 * 1024 * 1024);
      return await readPetPack([file, sprite]);
    } catch (error) {
      if (error instanceof PetPackError) throw error;
      throw new PetPackError("zip");
    }
  }
  const manifestFile = files.find((file) => file.name === "pet.json");
  if (files.length !== 2 || !manifestFile || manifestFile.size > 16 * 1024) throw new PetPackError("files");
  let manifest: CodexPetManifest;
  try {
    manifest = parsePetManifest(JSON.parse(await manifestFile.text()));
  } catch {
    throw new PetPackError("manifest");
  }
  const spriteFile = files.find((file) => file.name === manifest.spritesheetPath);
  if (!spriteFile) throw new PetPackError("files");
  if (spriteFile.size > 20 * 1024 * 1024) throw new PetPackError("image");

  const signature = new Uint8Array(await spriteFile.slice(0, 12).arrayBuffer());
  const hasBytes = (expected: number[], offset = 0) => expected.every((byte, i) => signature[offset + i] === byte);
  const png = hasBytes([137, 80, 78, 71, 13, 10, 26, 10]);
  const webp = hasBytes([82, 73, 70, 70]) && hasBytes([87, 69, 66, 80], 8);
  if (!(spriteFile.name.toLowerCase().endsWith(".png") ? png : webp)) throw new PetPackError("image");

  const bitmap = await createImageBitmap(spriteFile).catch(() => { throw new PetPackError("image"); });
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
      reader.readAsDataURL(new Blob([spriteFile], { type: png ? "image/png" : "image/webp" }));
    });
    return { manifest, atlas, thumbnail: canvas.toDataURL("image/png") };
  } finally {
    bitmap.close();
  }
}
