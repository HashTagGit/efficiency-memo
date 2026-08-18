/**
 * CoreHour data export — pure TypeScript, no Tauri deps.
 * Keeps CSV logic fully testable in Vitest (no mocking required).
 */

export type ExportRange = "all" | "30d" | "7d";

export interface ExportRecord {
  checked_at: string;
  duration_seconds: number;
  tag_name: string | null;
  note: string;
  skipped: boolean;
}

/** Returns the ISO date (YYYY-MM-DD) of the earliest day to include, or null for all-time. */
export function rangeToFromDate(range: ExportRange): string | null {
  if (range === "all") return null;
  const days = range === "30d" ? 30 : 7;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Escapes a single CSV field value. */
function csvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Converts export records to a UTF-8 CSV string. */
export function recordsToCsv(records: ExportRecord[]): string {
  const header = "date,checked_at,duration_min,tag,note,skipped";
  const rows = records.map((r) => {
    const date = r.checked_at.slice(0, 10);
    const duration_min = Math.round(r.duration_seconds / 60);
    const tag = csvField(r.tag_name ?? "");
    const note = csvField(r.note ?? "");
    const skipped = r.skipped ? "1" : "0";
    return [date, r.checked_at, duration_min, tag, note, skipped].join(",");
  });
  return [header, ...rows].join("\n");
}

/** Suggests a default filename for the export. */
export function exportFilename(range: ExportRange): string {
  const today = new Date().toISOString().slice(0, 10);
  const suffix = range === "all" ? "all-time" : range;
  return `corehour-export-${suffix}-${today}.csv`;
}
