import { dbSelect } from "../../lib/db";
import { localDayRange, localReviewClock, localWeekRange } from "../../features/core-hour/review-range";

export interface DashboardPlanSummary {
  id: string;
  title: string;
  started_at: string;
  ended_at: string;
}

export interface DashboardNowData {
  nextPlan: DashboardPlanSummary | null;
  deviceCount: number;
  deviceAttentionCount: number;
  pendingSuggestionCount: number;
  dueReviewKind: "daily" | "weekly" | null;
}

interface DeviceCountRow {
  device_count: number | string;
  attention_count: number | string | null;
}

interface SuggestionCountRow {
  pending_count: number | string;
}

interface ReviewDueRow {
  daily_minute: number | string;
  weekly_weekday: number | string;
  weekly_minute: number | string;
  daily_completed: number | string;
  weekly_completed: number | string;
  daily_has_activity: number | string;
  weekly_has_activity: number | string;
}

export interface ReviewDueFacts {
  dailyMinute: number;
  weeklyWeekday: number;
  weeklyMinute: number;
  dailyCompleted: boolean;
  weeklyCompleted: boolean;
  dailyHasActivity: boolean;
  weeklyHasActivity: boolean;
}

export function deriveDueReviewKind(
  clock: { weekday: number; minuteOfDay: number },
  facts: ReviewDueFacts,
): "daily" | "weekly" | null {
  if (clock.weekday === facts.weeklyWeekday
    && clock.minuteOfDay >= facts.weeklyMinute
    && facts.weeklyHasActivity
    && !facts.weeklyCompleted) return "weekly";
  if (clock.minuteOfDay >= facts.dailyMinute
    && facts.dailyHasActivity
    && !facts.dailyCompleted) return "daily";
  return null;
}

export async function loadDashboardNow(userId: string, now = new Date()): Promise<DashboardNowData> {
  const dayEnd = new Date(now);
  dayEnd.setHours(24, 0, 0, 0);
  const clock = localReviewClock(now);
  const day = localDayRange(now);
  const week = localWeekRange(now);
  const [plans, deviceRows, suggestionRows, reviewRows] = await Promise.all([
    dbSelect<DashboardPlanSummary>(
      "SELECT id, title, started_at, ended_at FROM ch_plans WHERE user_id = $1 AND status = 'planned' AND ended_at > $2 AND started_at < $3 ORDER BY started_at LIMIT 1",
      [userId, now.toISOString(), dayEnd.toISOString()],
    ),
    dbSelect<DeviceCountRow>(
      "SELECT COUNT(*) AS device_count, SUM(CASE WHEN s.status IS NULL OR s.status <> 'tracking' OR (s.reminder_due_at IS NOT NULL AND julianday(s.reminder_due_at) <= julianday($2)) THEN 1 ELSE 0 END) AS attention_count FROM cr_devices d LEFT JOIN cr_computed_reminder_states s ON s.device_id = d.id WHERE d.user_id = $1",
      [userId, now.toISOString()],
    ),
    dbSelect<SuggestionCountRow>(
      "SELECT COUNT(*) AS pending_count FROM aa_activity_suggestions WHERE user_id = $1 AND status = 'pending'",
      [userId],
    ),
    dbSelect<ReviewDueRow>(
      `SELECT
        COALESCE(p.daily_minute, 1080) AS daily_minute,
        COALESCE(p.weekly_weekday, 6) AS weekly_weekday,
        COALESCE(p.weekly_minute, 1080) AS weekly_minute,
        EXISTS (SELECT 1 FROM ch_daily_reviews WHERE user_id = $1 AND local_date = $2) AS daily_completed,
        EXISTS (SELECT 1 FROM ch_weekly_reviews WHERE user_id = $1 AND week_started_on = $3) AS weekly_completed,
        (EXISTS (SELECT 1 FROM ch_sessions WHERE user_id = $1 AND ended_at IS NOT NULL AND julianday(started_at) < julianday($5) AND julianday(ended_at) > julianday($4))
          OR EXISTS (SELECT 1 FROM ch_plans WHERE user_id = $1 AND julianday(started_at) < julianday($5) AND julianday(ended_at) > julianday($4))) AS daily_has_activity,
        (EXISTS (SELECT 1 FROM ch_sessions WHERE user_id = $1 AND ended_at IS NOT NULL AND julianday(started_at) < julianday($7) AND julianday(ended_at) > julianday($6))
          OR EXISTS (SELECT 1 FROM ch_plans WHERE user_id = $1 AND julianday(started_at) < julianday($7) AND julianday(ended_at) > julianday($6))) AS weekly_has_activity
      FROM (SELECT 1) AS seed
      LEFT JOIN ch_review_reminder_preferences p ON p.user_id = $1`,
      [
        userId,
        clock.localDate,
        clock.weekStartedOn,
        day.startedAt,
        day.endedAt,
        week.startedAt,
        week.endedAt,
      ],
    ),
  ]);
  const counts = deviceRows[0];
  return {
    nextPlan: plans[0] ?? null,
    deviceCount: Number(counts?.device_count ?? 0),
    deviceAttentionCount: Number(counts?.attention_count ?? 0),
    pendingSuggestionCount: Number(suggestionRows[0]?.pending_count ?? 0),
    dueReviewKind: reviewRows[0] ? deriveDueReviewKind(clock, {
      dailyMinute: Number(reviewRows[0].daily_minute),
      weeklyWeekday: Number(reviewRows[0].weekly_weekday),
      weeklyMinute: Number(reviewRows[0].weekly_minute),
      dailyCompleted: Number(reviewRows[0].daily_completed) !== 0,
      weeklyCompleted: Number(reviewRows[0].weekly_completed) !== 0,
      dailyHasActivity: Number(reviewRows[0].daily_has_activity) !== 0,
      weeklyHasActivity: Number(reviewRows[0].weekly_has_activity) !== 0,
    }) : null,
  };
}
