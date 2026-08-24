import { describe, expect, it } from "vitest";
import { buildTagSlices, buildTrend, isoDay, rangeDays, summarize } from "../analytics";

const FIXED = new Date(2026, 7, 18); // 2026-08-18, local time

describe("isoDay", () => {
  it("formats in local time without a UTC shift", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    expect(isoDay(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});

describe("rangeDays", () => {
  it("returns 7 days ending today, oldest first", () => {
    const days = rangeDays("7d", FIXED);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-12");
    expect(days[6]).toBe("2026-08-18");
  });

  it("returns 30 days for the 30d range", () => {
    const days = rangeDays("30d", FIXED);
    expect(days).toHaveLength(30);
    expect(days[29]).toBe("2026-08-18");
  });

  it("crosses a month boundary correctly", () => {
    const days = rangeDays("7d", new Date(2026, 8, 2)); // 2026-09-02
    expect(days[0]).toBe("2026-08-27");
    expect(days[6]).toBe("2026-09-02");
  });
});

describe("buildTrend", () => {
  it("zero-fills days with no check-ins", () => {
    const trend = buildTrend([{ day: "2026-08-18", duration_seconds: 3600 }], "7d", FIXED);
    expect(trend).toHaveLength(7);
    expect(trend[6]).toEqual({ day: "2026-08-18", label: "08-18", minutes: 60 });
    expect(trend[0].minutes).toBe(0);
  });

  it("ignores rows outside the range", () => {
    const trend = buildTrend(
      [
        { day: "2026-08-18", duration_seconds: 1800 },
        { day: "2026-01-01", duration_seconds: 9999 },
      ],
      "7d",
      FIXED,
    );
    expect(trend.reduce((sum, p) => sum + p.minutes, 0)).toBe(30);
  });

  it("coerces string durations from SQLite", () => {
    const trend = buildTrend([{ day: "2026-08-18", duration_seconds: "1200" as unknown as number }], "7d", FIXED);
    expect(trend[6].minutes).toBe(20);
  });

  it("rounds seconds to the nearest minute", () => {
    const trend = buildTrend([{ day: "2026-08-18", duration_seconds: 100 }], "7d", FIXED);
    expect(trend[6].minutes).toBe(2);
  });
});

describe("buildTagSlices", () => {
  const rows = [
    { name: "Deep Work", color: "#d5a659", duration_seconds: 3600 },
    { name: "Email", color: "#8fd3a4", duration_seconds: 1200 },
  ];

  it("computes minutes and percentage share", () => {
    const slices = buildTagSlices(rows);
    expect(slices[0]).toEqual({ name: "Deep Work", color: "#d5a659", minutes: 60, percentage: 75 });
    expect(slices[1].percentage).toBe(25);
  });

  it("sorts largest first regardless of input order", () => {
    const slices = buildTagSlices([rows[1], rows[0]]);
    expect(slices.map((s) => s.name)).toEqual(["Deep Work", "Email"]);
  });

  it("returns zero percentages instead of dividing by zero", () => {
    const slices = buildTagSlices([{ name: "Idle", color: "#fff", duration_seconds: 0 }]);
    expect(slices[0].percentage).toBe(0);
  });

  it("returns an empty array for no rows", () => {
    expect(buildTagSlices([])).toEqual([]);
  });
});

describe("summarize", () => {
  it("averages over active days only, not calendar days", () => {
    const trend = buildTrend(
      [
        { day: "2026-08-18", duration_seconds: 3600 },
        { day: "2026-08-17", duration_seconds: 1800 },
      ],
      "7d",
      FIXED,
    );
    expect(summarize(trend)).toEqual({ totalMinutes: 90, activeDays: 2, dailyAverage: 45 });
  });

  it("reports a zero average for an empty period", () => {
    expect(summarize(buildTrend([], "7d", FIXED))).toEqual({ totalMinutes: 0, activeDays: 0, dailyAverage: 0 });
  });
});
