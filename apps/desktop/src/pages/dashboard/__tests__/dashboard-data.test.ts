import { describe, expect, it } from "vitest";
import { deriveDueReviewKind, type ReviewDueFacts } from "../dashboard-data";

const facts: ReviewDueFacts = {
  dailyMinute: 1080,
  weeklyWeekday: 6,
  weeklyMinute: 1080,
  dailyCompleted: false,
  weeklyCompleted: false,
  dailyHasActivity: true,
  weeklyHasActivity: true,
};

describe("Now review attention", () => {
  it("derives a due review from schedule, activity, and completion facts", () => {
    expect(deriveDueReviewKind({ weekday: 6, minuteOfDay: 1080 }, facts)).toBe("weekly");
    expect(deriveDueReviewKind({ weekday: 4, minuteOfDay: 1080 }, facts)).toBe("daily");
    expect(deriveDueReviewKind({ weekday: 4, minuteOfDay: 1079 }, facts)).toBeNull();
    expect(deriveDueReviewKind(
      { weekday: 4, minuteOfDay: 1080 },
      { ...facts, dailyCompleted: true },
    )).toBeNull();
    expect(deriveDueReviewKind(
      { weekday: 4, minuteOfDay: 1080 },
      { ...facts, dailyHasActivity: false },
    )).toBeNull();
  });
});
