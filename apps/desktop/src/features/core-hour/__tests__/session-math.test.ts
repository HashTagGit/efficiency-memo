import { describe, expect, it } from "vitest";
import { hasProgressChanged, shouldPromptForCheckIn, unrecordedSeconds } from "../session-math";

describe("CoreHour session timing", () => {
  it("prompts only after a complete check-in interval", () => {
    expect(shouldPromptForCheckIn(29 * 60 + 59, 0, 30)).toBe(false);
    expect(shouldPromptForCheckIn(30 * 60, 0, 30)).toBe(true);
    expect(shouldPromptForCheckIn(45 * 60, 30 * 60, 30)).toBe(false);
  });

  it("keeps an unclassified remainder when a session ends", () => {
    expect(unrecordedSeconds(46 * 60, 30 * 60)).toBe(16 * 60);
    expect(unrecordedSeconds(30 * 60, 30 * 60)).toBe(0);
  });

  it("does not update an unchanged saved progress snapshot", () => {
    expect(hasProgressChanged(1800, 1800, 1800, 1800)).toBe(false);
    expect(hasProgressChanged(1800, 1800, 1801, 1800)).toBe(true);
  });
});
