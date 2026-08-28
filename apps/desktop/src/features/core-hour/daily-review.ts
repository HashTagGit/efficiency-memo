import { invoke } from "@tauri-apps/api/core";
import { isoDay } from "./analytics";

export const REVIEW_OUTCOMES = ["on-track", "overcommitted", "underplanned", "interrupted"] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

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

function localDayRange(date: Date): { localDate: string; startedAt: string; endedAt: string } {
  const startedAt = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endedAt = new Date(startedAt);
  endedAt.setDate(endedAt.getDate() + 1);
  const withOffset = (value: Date) => {
    const offset = -value.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, -1);
    return `${local}${sign}${hours}:${minutes}`;
  };
  return {
    localDate: isoDay(date),
    startedAt: withOffset(startedAt),
    endedAt: withOffset(endedAt),
  };
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
