import { describe, expect, it } from "vitest";
import {
  hasReminderPollGap,
  notificationAllowanceForPoll,
  observeIdleForNaturalRest,
} from "../natural-rest";

describe("natural rest observation", () => {
  it("requires observed activity before an idle stretch can complete a break", () => {
    expect(observeIdleForNaturalRest(false, 600)).toMatchObject({
      available: true,
      armed: false,
      shouldAttempt: false,
    });
    const active = observeIdleForNaturalRest(false, 10);
    expect(active).toMatchObject({ armed: true, shouldAttempt: false });
    expect(observeIdleForNaturalRest(active.armed, 300)).toMatchObject({
      armed: true,
      shouldAttempt: true,
    });
    expect(observeIdleForNaturalRest(true, null)).toMatchObject({
      available: false,
      armed: false,
      shouldAttempt: false,
    });
  });

  it("defers stale reminders after a suspended poll loop", () => {
    expect(hasReminderPollGap(0, 89_999)).toBe(false);
    expect(hasReminderPollGap(0, 90_000)).toBe(true);
    expect(notificationAllowanceForPoll(true, false, true)).toBe(true);
    expect(notificationAllowanceForPoll(null, null, true)).toBeNull();
    expect(notificationAllowanceForPoll(true, true, true)).toBe(false);
    expect(notificationAllowanceForPoll(true, true, false)).toBe(true);
  });
});
