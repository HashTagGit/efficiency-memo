import { invoke } from "@tauri-apps/api/core";
import { localWeekRange } from "./review-range";
import type { ReviewOutcome } from "./review-outcome";

export interface WeeklyReviewRecord {
  id: string;
  weekStartedOn: string;
  outcome: ReviewOutcome;
  nextGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReviewState {
  weekStartedOn: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  actualMinutes: number;
  planCount: number;
  completedPlanCount: number;
  skippedPlanCount: number;
  pendingPlanCount: number;
  sessionCount: number;
  longestFocusMinutes: number;
  pendingSuggestionCount: number;
  breakCount: number;
  hydrationCount: number;
  dailyReviewCount: number;
  deviceAttentionCount: number;
  currentGoalMinutes: number;
  review: WeeklyReviewRecord | null;
}

export function loadWeeklyReview(userId: string, date = new Date()): Promise<WeeklyReviewState> {
  return invoke("load_weekly_review", {
    input: { userId, ...localWeekRange(date), observedAt: new Date().toISOString() },
  });
}

export function saveWeeklyReview(input: {
  userId: string;
  weekStartedOn: string;
  outcome: ReviewOutcome;
  nextGoalMinutes: number;
  startedAt: string;
  endedAt: string;
  existingId?: string;
}): Promise<WeeklyReviewRecord> {
  return invoke("save_weekly_review", {
    input: {
      id: input.existingId ?? crypto.randomUUID(),
      userId: input.userId,
      weekStartedOn: input.weekStartedOn,
      outcome: input.outcome,
      nextGoalMinutes: input.nextGoalMinutes,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      savedAt: new Date().toISOString(),
    },
  });
}
