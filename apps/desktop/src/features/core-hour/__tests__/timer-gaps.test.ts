import { describe, expect, it } from "vitest";
import {
  detectSchedulerGap,
  detectSystemIdle,
  resolveUncertainElapsed,
} from "../timer-gaps";

const DETECTED_AT = "2026-08-28T10:00:00.000Z";

describe("CoreHour uncertain intervals", () => {
  it("detects a delayed scheduler tick as initially uncounted", () => {
    expect(detectSchedulerGap(1_000, 32_000, DETECTED_AT)).toEqual({
      reason: "scheduler-gap",
      durationSeconds: 31,
      countedSeconds: 0,
      detectedAt: DETECTED_AT,
    });
    expect(detectSchedulerGap(0, 29_999, DETECTED_AT)).toBeNull();
    expect(detectSchedulerGap(0, 30_000, DETECTED_AT)?.durationSeconds).toBe(30);
    expect(detectSchedulerGap(1_000, 2_000, DETECTED_AT)).toBeNull();
  });

  it("only detects system idle already counted inside the session", () => {
    expect(detectSystemIdle(305, 600, DETECTED_AT)).toEqual({
      reason: "system-idle",
      durationSeconds: 305,
      countedSeconds: 305,
      detectedAt: DETECTED_AT,
    });
    expect(detectSystemIdle(600, 120, DETECTED_AT)).toBeNull();
  });

  it("resolves counted and uncounted intervals by their accounting delta", () => {
    const scheduler = detectSchedulerGap(1_000, 301_000, DETECTED_AT)!;
    const idle = detectSystemIdle(300, 1_000, DETECTED_AT)!;
    expect(resolveUncertainElapsed(1_000, scheduler, 300)).toBe(1_300);
    expect(resolveUncertainElapsed(1_000, scheduler, 0)).toBe(1_000);
    expect(resolveUncertainElapsed(1_000, idle, 0)).toBe(700);
    expect(resolveUncertainElapsed(1_000, idle, 120)).toBe(820);
    expect(resolveUncertainElapsed(100, idle, 999)).toBe(100);
  });
});
