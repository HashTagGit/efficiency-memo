import { invoke } from "@tauri-apps/api/core";
import { localReviewClock } from "./review-range";

export interface ReviewReminderPreferences {
  dailyEnabled: boolean;
  dailyMinute: number;
  weeklyEnabled: boolean;
  weeklyWeekday: number;
  weeklyMinute: number;
  lastDailyLocalDate: string | null;
  lastWeeklyStartedOn: string | null;
  pendingDailyLocalDate: string | null;
  pendingWeekStartedOn: string | null;
}

export interface SaveReviewReminderResult {
  preferences: ReviewReminderPreferences;
  newlyEnabled: boolean;
}

export type ReviewReminderKind = "daily" | "weekly";

export interface ReviewReminderClaim {
  kind: ReviewReminderKind;
  acknowledgeKinds: ReviewReminderKind[];
}

export function loadReviewReminderPreferences(userId: string): Promise<ReviewReminderPreferences> {
  return invoke("load_review_reminder_preferences", { userId });
}

export function saveReviewReminderPreferences(
  userId: string,
  preferences: Pick<ReviewReminderPreferences, "dailyEnabled" | "dailyMinute" | "weeklyEnabled" | "weeklyWeekday" | "weeklyMinute">,
): Promise<SaveReviewReminderResult> {
  return invoke("save_review_reminder_preferences", {
    input: {
      userId,
      dailyEnabled: preferences.dailyEnabled,
      dailyMinute: preferences.dailyMinute,
      weeklyEnabled: preferences.weeklyEnabled,
      weeklyWeekday: preferences.weeklyWeekday,
      weeklyMinute: preferences.weeklyMinute,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function claimReviewReminders(
  userId: string,
  notificationsAllowed: boolean | null,
  date = new Date(),
): Promise<ReviewReminderClaim[]> {
  return invoke("claim_review_reminders", {
    input: { userId, ...localReviewClock(date), notificationsAllowed },
  });
}

export function acknowledgeReviewReminders(
  userId: string,
  kinds: ReviewReminderKind[],
): Promise<void> {
  return invoke("acknowledge_review_reminders", {
    input: { userId, kinds, acknowledgedAt: new Date().toISOString() },
  });
}
