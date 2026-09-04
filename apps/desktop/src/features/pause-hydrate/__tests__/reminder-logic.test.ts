import { describe, expect, it } from "vitest";
import {
  effectiveReminderDueAt,
  hasDueCollision,
  nextDueAt,
  normalizeReminderInterval,
  reminderAllowedAt,
  scheduleHasAvailableTime,
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

  it("moves the next reminder beyond a quiet window", () => {
    const next = nextDueAt(new Date("2026-08-27T09:30:00+08:00"), 120, {
      activeWeekdays: [3],
      weekdaySchedules: Array.from({ length: 7 }, (_, weekday) => ({
        workWindows: weekday === 3 ? [{ startMinute: 540, endMinute: 1080 }] : [],
        quietWindows: weekday === 3 ? [{ startMinute: 660, endMinute: 780 }] : [],
      })),
      calendarEnabled: true,
      calendarYear: 2026,
      calendarAvailable: false,
      calendarData: null,
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    });
    expect(next.getHours()).toBe(15);
    expect(next.getMinutes()).toBe(0);
  });

  it("does not trigger reminders at work-window boundaries", () => {
    const policy = {
      activeWeekdays: [3],
      weekdaySchedules: Array.from({ length: 7 }, (_, weekday) => ({
        workWindows: weekday === 3
          ? [{ startMinute: 570, endMinute: 1050 }, { startMinute: 1140, endMinute: 1260 }]
          : [],
        quietWindows: weekday === 3
          ? [{ startMinute: 690, endMinute: 810 }, { startMinute: 1140, endMinute: 1200 }]
          : [],
      })),
      calendarEnabled: false,
      calendarYear: 0,
      calendarAvailable: false,
      calendarData: null,
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    };
    expect(reminderAllowedAt(policy, new Date("2026-08-27T09:30:00+08:00"))).toBe(false);
    expect(reminderAllowedAt(policy, new Date("2026-08-27T17:30:00+08:00"))).toBe(false);
    expect(reminderAllowedAt(policy, new Date("2026-08-27T19:00:00+08:00"))).toBe(false);
    expect(reminderAllowedAt(policy, new Date("2026-08-27T13:30:00+08:00"))).toBe(false);
    expect(reminderAllowedAt(policy, new Date("2026-08-27T13:31:00+08:00"))).toBe(true);
    expect(nextDueAt(new Date("2026-08-27T09:00:00+08:00"), 30, policy).toISOString())
      .toBe("2026-08-27T02:00:00.000Z");
    expect(nextDueAt(new Date("2026-08-27T08:31:00+08:00"), 60, policy).toISOString())
      .toBe("2026-08-27T02:30:00.000Z");
    expect(nextDueAt(new Date("2026-08-27T18:30:00+08:00"), 30, policy).toISOString())
      .toBe("2026-08-27T12:30:00.000Z");
  });

  it("keeps legitimate same-interval reminders together", () => {
    const policy = {
      activeWeekdays: [3],
      weekdaySchedules: Array.from({ length: 7 }, (_, weekday) => ({
        workWindows: weekday === 3 ? [{ startMinute: 540, endMinute: 1080 }] : [],
        quietWindows: [],
      })),
      calendarEnabled: false,
      calendarYear: 0,
      calendarAvailable: false,
      calendarData: null,
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    };
    const stored = "2026-08-27T10:00:00+08:00";
    expect(effectiveReminderDueAt(
      { enabled: true, intervalMinutes: 60, nextDueAt: stored },
      policy,
      NOW,
      { enabled: true, intervalMinutes: 60, nextDueAt: stored },
    )?.toISOString()).toBe(new Date(stored).toISOString());
  });

  it("does not activate an imported make-up day when the calendar is disabled", () => {
    const policy = {
      activeWeekdays: [0],
      weekdaySchedules: Array.from({ length: 7 }, () => ({
        workWindows: [{ startMinute: 540, endMinute: 1080 }],
        quietWindows: [],
      })),
      calendarEnabled: false,
      calendarYear: 2026,
      calendarAvailable: true,
      calendarData: { year: 2026, holidays: [], workdays: ["2026-01-04"] },
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    };
    expect(reminderAllowedAt(policy, new Date("2026-01-04T10:00:00+08:00"))).toBe(false);
  });

  it("detects differing-interval collisions", () => {
    const reminders = {
      break: { enabled: true, intervalMinutes: 60, nextDueAt: "2026-09-04T01:30:58Z" },
      hydration: { enabled: true, intervalMinutes: 45, nextDueAt: "2026-09-04T01:30:02Z" },
    };
    expect(hasDueCollision(reminders)).toBe(true);
    expect(hasDueCollision({
      ...reminders,
      hydration: { ...reminders.hydration, intervalMinutes: 60 },
    })).toBe(false);
  });

  it("staggers differing intervals when both fall on the next work window", () => {
    const policy = {
      activeWeekdays: [3, 4],
      weekdaySchedules: Array.from({ length: 7 }, () => ({
        workWindows: [{ startMinute: 570, endMinute: 1050 }],
        quietWindows: [],
      })),
      calendarEnabled: false,
      calendarYear: 0,
      calendarAvailable: false,
      calendarData: null,
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    };
    const now = new Date("2026-09-03T18:00:00+08:00");
    const breakStored = "2026-09-04T01:30:58Z";
    const hydrationStored = "2026-09-04T01:30:02Z";
    const breakNext = effectiveReminderDueAt(
      { kind: "break", enabled: true, intervalMinutes: 60, nextDueAt: breakStored },
      policy,
      now,
      { kind: "hydration", enabled: true, intervalMinutes: 45, nextDueAt: hydrationStored },
      null,
    );
    const hydrationNext = effectiveReminderDueAt(
      { kind: "hydration", enabled: true, intervalMinutes: 45, nextDueAt: hydrationStored },
      policy,
      now,
      { kind: "break", enabled: true, intervalMinutes: 60, nextDueAt: breakStored },
      null,
    );
    expect(breakNext?.toISOString()).toBe("2026-09-04T02:30:00.000Z");
    expect(hydrationNext?.toISOString()).toBe("2026-09-04T03:15:00.000Z");
  });

  it("applies an overnight quiet window from its start day into the next day", () => {
    const policy = {
      activeWeekdays: [0, 1],
      weekdaySchedules: Array.from({ length: 7 }, (_, weekday) => ({
        workWindows: [{ startMinute: 0, endMinute: 1439 }],
        quietWindows: weekday === 0 ? [{ startMinute: 1320, endMinute: 420 }] : [],
      })),
      calendarEnabled: false,
      calendarYear: 0,
      calendarAvailable: false,
      calendarData: null,
      naturalBreakEnabled: false,
      naturalBreakMinutes: 5,
      systemDeferralEnabled: true,
      deferralGraceMinutes: 5,
    };
    expect(reminderAllowedAt(policy, new Date("2026-08-31T06:00:00+08:00"))).toBe(true);
    expect(reminderAllowedAt(policy, new Date("2026-08-31T23:00:00+08:00"))).toBe(false);
    expect(reminderAllowedAt(policy, new Date("2026-09-01T06:00:00+08:00"))).toBe(false);
  });

  it("rejects a weekly schedule whose quiet hours cover every work minute", () => {
    const policy = {
      activeWeekdays: [0],
      weekdaySchedules: Array.from({ length: 7 }, (_, weekday) => ({
        workWindows: weekday === 0 ? [{ startMinute: 540, endMinute: 1080 }] : [],
        quietWindows: weekday === 0 ? [{ startMinute: 540, endMinute: 1080 }] : [],
      })),
    };
    expect(scheduleHasAvailableTime(policy)).toBe(false);
  });
});
