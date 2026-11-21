import { describe, expect, it } from "vitest";
import { openPetZip } from "../pet-zip";

const deflated = "UEsDBBQAAAAIAAAAIQBDXIh0DwAAAA0AAAANAAAAcGFjay9wZXQuanNvbqtWykxRslJKSc3NV6oFAFBLAQIUABQAAAAIAAAAIQBDXIh0DwAAAA0AAAANAAAAAAAAAAAAAACAAQAAAABwYWNrL3BldC5qc29uUEsFBgAAAAABAAEAOwAAADoAAAAAAA==";
const stored = "UEsDBBQAAAAAAAAAIQBDXIh0DQAAAA0AAAANAAAAcGFjay9wZXQuanNvbnsiaWQiOiJkZW1vIn1QSwECFAAUAAAAAAAAACEAQ1yIdA0AAAANAAAADQAAAAAAAAAAAAAAgAEAAAAAcGFjay9wZXQuanNvblBLBQYAAAAAAQABADsAAAA4AAAAAAA=";
const traversal = "UEsDBBQAAAAAAAAAIQBDXIh0DQAAAA0AAAALAAAALi4vcGV0Lmpzb257ImlkIjoiZGVtbyJ9UEsBAhQAFAAAAAAAAAAhAENciHQNAAAADQAAAAsAAAAAAAAAAAAAAIABAAAAAC4uL3BldC5qc29uUEsFBgAAAAABAAEAOQAAADYAAAAAAA==";
const decode = (value: string) => Uint8Array.from(Buffer.from(value, "base64"));

describe("pet ZIP reader", () => {
  it.each([stored, deflated])("reads a standard pet member from a wrapping folder", async (fixture) => {
    const zip = await openPetZip(new Blob([decode(fixture)]));
    expect(zip.paths).toEqual(["pack/pet.json"]);
    const file = await zip.read("pack/pet.json", 16_384);
    expect(file.name).toBe("pet.json");
    expect(await file.text()).toBe('{"id":"demo"}');
  });

  it("blocks paths leaving the package and rejects payloads that exceed their limits or fail CRC", async () => {
    await expect(openPetZip(new Blob([decode(traversal)]))).rejects.toThrow("Invalid");
    const corrupt = decode(stored);
    corrupt[43] ^= 1;
    const zip = await openPetZip(new Blob([corrupt]));
    await expect(zip.read("pack/pet.json", 12)).rejects.toThrow("Invalid");
    await expect(zip.read("pack/pet.json", 13)).rejects.toThrow("Invalid");
  });
});
