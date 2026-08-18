import { describe, it, expect } from "vitest";
import { recordsToCsv, rangeToFromDate, exportFilename, type ExportRecord } from "../export";

const SAMPLE: ExportRecord[] = [
  { checked_at: "2026-08-18T09:00:00.000Z", duration_seconds: 900, tag_name: "Deep work", note: "", skipped: false },
  { checked_at: "2026-08-18T10:00:00.000Z", duration_seconds: 1800, tag_name: null, note: "had a call", skipped: true },
  { checked_at: "2026-08-17T14:00:00.000Z", duration_seconds: 600, tag_name: 'Review, "urgent"', note: "", skipped: false },
];

describe("recordsToCsv", () => {
  it("produces a header row", () => {
    const csv = recordsToCsv([]);
    expect(csv).toBe("date,checked_at,duration_min,tag,note,skipped");
  });

  it("rounds duration to minutes", () => {
    const csv = recordsToCsv([SAMPLE[0]]);
    expect(csv).toContain(",15,");
  });

  it("empty tag_name becomes empty string", () => {
    const csv = recordsToCsv([SAMPLE[1]]);
    const lines = csv.split("\n");
    const fields = lines[1].split(",");
    expect(fields[3]).toBe("");
  });

  it("skipped=true becomes 1", () => {
    const csv = recordsToCsv([SAMPLE[1]]);
    expect(csv.endsWith(",1")).toBe(true);
  });

  it("skipped=false becomes 0", () => {
    const csv = recordsToCsv([SAMPLE[0]]);
    expect(csv.endsWith(",0")).toBe(true);
  });

  it("quotes fields containing commas or double-quotes", () => {
    const csv = recordsToCsv([SAMPLE[2]]);
    // CSV standard: double-quotes inside quoted field are escaped as ""
    expect(csv).toMatch(/"Review, ""urgent"""/);
  });

  it("extracts date from checked_at", () => {
    const csv = recordsToCsv([SAMPLE[0]]);
    expect(csv).toContain("2026-08-18,");
  });
});

describe("rangeToFromDate", () => {
  it("returns null for all", () => {
    expect(rangeToFromDate("all")).toBeNull();
  });

  it("returns a date string for 7d", () => {
    const result = rangeToFromDate("7d");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("30d date is earlier than 7d date", () => {
    const d30 = rangeToFromDate("30d")!;
    const d7 = rangeToFromDate("7d")!;
    expect(d30 < d7).toBe(true);
  });
});

describe("exportFilename", () => {
  it("includes today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(exportFilename("7d")).toContain(today);
  });

  it("includes the range label", () => {
    expect(exportFilename("all")).toContain("all-time");
    expect(exportFilename("30d")).toContain("30d");
  });

  it("ends with .csv", () => {
    expect(exportFilename("7d").endsWith(".csv")).toBe(true);
  });
});
