const MAX_ARCHIVE_BYTES = 22 * 1024 * 1024;
const MAX_ENTRIES = 128;
const ZIP_END = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_LOCAL = 0x04034b50;

type ZipEntry = { path: string; flags: number; method: number; crc: number; compressed: number; size: number; offset: number };

function invalidZip(): never {
  throw new Error("Invalid or unsupported pet ZIP");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function openPetZip(archive: Blob) {
  if (archive.size < 22 || archive.size > MAX_ARCHIVE_BYTES) invalidZip();
  const buffer = await archive.arrayBuffer();
  const data = new DataView(buffer);
  const word = (offset: number) => data.getUint16(offset, true);
  const dword = (offset: number) => data.getUint32(offset, true);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let end = -1;
  for (let cursor = archive.size - 22; cursor >= Math.max(0, archive.size - 65_557); cursor--) {
    if (dword(cursor) === ZIP_END && cursor + 22 + word(cursor + 20) === archive.size) {
      end = cursor;
      break;
    }
  }
  if (end < 0 || word(end + 4) !== 0 || word(end + 6) !== 0) invalidZip();
  const count = word(end + 10);
  const central = dword(end + 16);
  if (!count || count > MAX_ENTRIES || word(end + 8) !== count || central + dword(end + 12) !== end) invalidZip();

  const entries = new Map<string, ZipEntry>();
  let cursor = central;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || dword(cursor) !== ZIP_CENTRAL || word(cursor + 34) !== 0) invalidZip();
    const nameLength = word(cursor + 28);
    const next = cursor + 46 + nameLength + word(cursor + 30) + word(cursor + 32);
    if (next > end) invalidZip();
    const path = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    const segments = path.replace(/\/$/, "").split("/");
    // eslint-disable-next-line no-control-regex -- Reject control characters in archive paths.
    if (/[\\:\x00-\x1f]/.test(path) || segments.some((part) => !part || part === "." || part === "..") || entries.has(path)) invalidZip();
    entries.set(path, {
      path, flags: word(cursor + 8), method: word(cursor + 10), crc: dword(cursor + 16),
      compressed: dword(cursor + 20), size: dword(cursor + 24), offset: dword(cursor + 42),
    });
    cursor = next;
  }
  if (cursor !== end) invalidZip();

  async function read(path: string, limit: number): Promise<File> {
    const entry = entries.get(path);
    if (!entry || entry.size > limit || entry.flags & 1 || entry.offset + 30 > central
      || dword(entry.offset) !== ZIP_LOCAL || word(entry.offset + 6) !== entry.flags
      || word(entry.offset + 8) !== entry.method) invalidZip();
    const nameLength = word(entry.offset + 26);
    const start = entry.offset + 30 + nameLength + word(entry.offset + 28);
    if (start + entry.compressed > central || decoder.decode(new Uint8Array(buffer, entry.offset + 30, nameLength)) !== path) invalidZip();
    const compressed = new Uint8Array(buffer, start, entry.compressed);
    let bytes = compressed;
    if (entry.method === 8) {
      const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
      bytes = new Uint8Array(entry.size);
      let written = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          if (written + chunk.value.byteLength > bytes.length) invalidZip();
          bytes.set(chunk.value, written);
          written += chunk.value.byteLength;
        }
        if (written !== bytes.length) invalidZip();
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    } else if (entry.method !== 0) invalidZip();
    if (bytes.byteLength !== entry.size || crc32(bytes) !== entry.crc) invalidZip();
    return new File([bytes], path.slice(path.lastIndexOf("/") + 1));
  }

  return { paths: Array.from(entries.keys()), read };
}
