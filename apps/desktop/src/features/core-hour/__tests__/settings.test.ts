import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAILY_FOCUS_GOAL,
  normalizeDailyFocusGoal,
} from "../settings";

describe("daily focus goal", () => {
  it("defaults values outside 15-minute increments", () => {
    expect(normalizeDailyFocusGoal(undefined)).toBe(DEFAULT_DAILY_FOCUS_GOAL);
    expect(normalizeDailyFocusGoal("invalid")).toBe(DEFAULT_DAILY_FOCUS_GOAL);
    expect(normalizeDailyFocusGoal(62)).toBe(DEFAULT_DAILY_FOCUS_GOAL);
  });

  it("keeps the goal within a practical daily range", () => {
    expect(normalizeDailyFocusGoal(0)).toBe(DEFAULT_DAILY_FOCUS_GOAL);
    expect(normalizeDailyFocusGoal(900)).toBe(DEFAULT_DAILY_FOCUS_GOAL);
    expect(normalizeDailyFocusGoal(180)).toBe(180);
  });
});
