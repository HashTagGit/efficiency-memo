import { describe, expect, it } from "vitest";
import {
  nextDueAt,
  normalizeReminderInterval,
  tomorrowStart,
} from "../reminder-logic";

const NOW = new Date("2026-08-27T10:00:00+08:00");

describe("Pause & Hydrate reminder logic", () => {
  it("schedules intervals and the start of the next local day", () => {
    expect(nextDueAt(NOW, 45).getTime() - NOW.getTime()).toBe(45 * 60_000);
    const tomorrow = tomorrowStart(NOW);
    expect(tomorrow.getDate()).toBe(NOW.getDate() + 1);
    expect([tomorrow.getHours(), tomorrow.getMinutes(), tomorrow.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("accepts only 15-minute intervals from 15 to 240 minutes", () => {
    expect(normalizeReminderInterval("break", 90)).toBe(90);
    expect(normalizeReminderInterval("break", 22)).toBe(60);
    expect(normalizeReminderInterval("hydration", 300)).toBe(45);
  });
});
