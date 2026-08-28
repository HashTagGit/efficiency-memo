import { invoke } from "@tauri-apps/api/core";
import { localDayRange } from "./review-range";
import type { ReviewOutcome } from "./review-outcome";
export { REVIEW_OUTCOMES, type ReviewOutcome } from "./review-outcome";

export interface DailyReviewRecord {
  id: string;
  localDate: string;
  outcome: ReviewOutcome;
  nextGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReviewState {
  localDate: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  actualMinutes: number;
  planCount: number;
  completedPlanCount: number;
  skippedPlanCount: number;
  pendingPlanCount: number;
  pendingSuggestionCount: number;
  breakCount: number;
  hydrationCount: number;
  currentGoalMinutes: number;
  review: DailyReviewRecord | null;
}

export function loadDailyReview(userId: string, date = new Date()): Promise<DailyReviewState> {
  return invoke("load_daily_review", {
    input: { userId, ...localDayRange(date) },
  });
}

export function saveDailyReview(input: {
  userId: string;
  localDate: string;
  outcome: ReviewOutcome;
  nextGoalMinutes: number;
  startedAt: string;
  endedAt: string;
  existingId?: string;
}): Promise<DailyReviewRecord> {
  return invoke("save_daily_review", {
    input: {
      id: input.existingId ?? crypto.randomUUID(),
      userId: input.userId,
      localDate: input.localDate,
      outcome: input.outcome,
      nextGoalMinutes: input.nextGoalMinutes,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      savedAt: new Date().toISOString(),
    },
  });
}
