import { describe, expect, it } from "vitest";
import {
  formatLocalPlanTime,
  transformPlanRange,
} from "../plan-interaction";

const RANGE = {
  startedAt: "2026-08-28T09:00:00+08:00",
  endedAt: "2026-08-28T10:00:00+08:00",
};

describe("direct plan manipulation", () => {
  it("moves a plan while preserving duration and clamping to the day", () => {
    const moved = transformPlanRange(RANGE, "move", "2026-08-28", 1410);
    expect(formatLocalPlanTime(moved.startedAt)).toBe("2026-08-28T22:45");
    expect(formatLocalPlanTime(moved.endedAt)).toBe("2026-08-28T23:45");
  });

  it("moves a plan to another local day", () => {
    const moved = transformPlanRange(RANGE, "move", "2026-08-31", 615);
    expect(formatLocalPlanTime(moved.startedAt)).toBe("2026-08-31T10:15");
    expect(formatLocalPlanTime(moved.endedAt)).toBe("2026-08-31T11:15");
  });

  it("resizes either edge on a 15-minute grid with a minimum duration", () => {
    const start = transformPlanRange(RANGE, "resize-start", "2026-08-28", 585);
    const end = transformPlanRange(RANGE, "resize-end", "2026-08-28", 540);
    expect(formatLocalPlanTime(start.startedAt)).toBe("2026-08-28T09:45");
    expect(formatLocalPlanTime(start.endedAt)).toBe("2026-08-28T10:00");
    expect(formatLocalPlanTime(end.startedAt)).toBe("2026-08-28T09:00");
    expect(formatLocalPlanTime(end.endedAt)).toBe("2026-08-28T09:15");
  });

  it("keeps directly changed edges on the grid for an off-grid source", () => {
    const offGrid = {
      startedAt: "2026-08-28T09:07:00+08:00",
      endedAt: "2026-08-28T10:07:00+08:00",
    };
    const start = transformPlanRange(offGrid, "resize-start", "2026-08-28", 1000);
    const end = transformPlanRange(offGrid, "resize-end", "2026-08-28", 0);
    expect(formatLocalPlanTime(start.startedAt)).toBe("2026-08-28T09:45");
    expect(formatLocalPlanTime(end.endedAt)).toBe("2026-08-28T09:30");
  });

  it("snaps an irregular duration when moving the whole plan", () => {
    const moved = transformPlanRange({
      startedAt: "2026-08-28T09:07:00+08:00",
      endedAt: "2026-08-28T10:00:00+08:00",
    }, "move", "2026-08-28", 615);
    expect(formatLocalPlanTime(moved.startedAt)).toBe("2026-08-28T10:15");
    expect(formatLocalPlanTime(moved.endedAt)).toBe("2026-08-28T11:15");
  });

  it("does not reverse an end-edge expansion at the day boundary", () => {
    const range = {
      startedAt: "2026-08-28T23:30:00+08:00",
      endedAt: "2026-08-28T23:59:00+08:00",
    };
    const unchanged = transformPlanRange(range, "resize-end", "2026-08-28", 1439);
    const expanded = transformPlanRange(range, "resize-end", "2026-08-28", 1454);
    expect(formatLocalPlanTime(unchanged.endedAt)).toBe("2026-08-28T23:59");
    expect(formatLocalPlanTime(expanded.startedAt)).toBe("2026-08-28T23:30");
    expect(formatLocalPlanTime(expanded.endedAt)).toBe("2026-08-28T23:59");
  });
});
