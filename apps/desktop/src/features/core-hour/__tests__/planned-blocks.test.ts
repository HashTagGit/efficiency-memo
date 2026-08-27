import { describe, expect, it } from "vitest";
import {
  layoutPlannedBlocks,
  layoutPlannedBlock,
  validatePlanRange,
} from "../planned-blocks";

describe("CoreHour planned blocks", () => {
  it("requires a positive same-day local range", () => {
    expect(validatePlanRange("2026-08-28T09:00", "2026-08-28T10:00")).toBeNull();
    expect(validatePlanRange("2026-08-28T10:00", "2026-08-28T09:00")).toBe("invalid-range");
    expect(validatePlanRange("2026-08-28T23:30", "2026-08-29T00:30")).toBe("cross-day");
  });

  it("assigns overlapping plans to visible lanes", () => {
    const layouts = layoutPlannedBlocks([
      { id: "a", started_at: "2026-08-28T09:00:00+08:00", ended_at: "2026-08-28T10:00:00+08:00" },
      { id: "b", started_at: "2026-08-28T09:30:00+08:00", ended_at: "2026-08-28T10:30:00+08:00" },
      { id: "c", started_at: "2026-08-28T11:00:00+08:00", ended_at: "2026-08-28T12:00:00+08:00" },
    ], "2026-08-28", 60);

    expect(layouts.map(({ plan, lane, laneCount }) => [plan.id, lane, laneCount])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 1],
    ]);
  });

  it("lays a plan onto local wall-clock minutes", () => {
    expect(layoutPlannedBlock({
      started_at: "2026-08-28T09:15:00+08:00",
      ended_at: "2026-08-28T10:45:00+08:00",
    }, "2026-08-28", 60)).toEqual({ top: 555, height: 88, startMinute: 555, endMinute: 645 });
  });

  it("clamps a plan to the selected day", () => {
    expect(layoutPlannedBlock({
      started_at: "2026-08-27T23:30:00+08:00",
      ended_at: "2026-08-28T00:30:00+08:00",
    }, "2026-08-28", 60)).toMatchObject({ top: 0, startMinute: 0, endMinute: 30 });
  });
});
