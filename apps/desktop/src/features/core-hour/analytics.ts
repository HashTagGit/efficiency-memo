/**
 * CoreHour analytics — pure TypeScript, no Tauri and no charting deps.
 * All data shaping lives here so it stays testable in Vitest and the
 * charting library can be swapped without touching this logic (ADR-0002).
 */

export type TrendRange = "7d" | "30d";

/** One day's total, as returned by the grouped SQL query. */
export interface DailyRow {
  day: string;
  duration_seconds: number;
}

/** One tag's total, as returned by the grouped SQL query. */
export interface TagRow {
  id: string;
  name: string;
  color: string;
  duration_seconds: number;
}

export interface ActivityRow {
  name: string;
  duration_seconds: number;
}

export interface TrendPoint {
  day: string;
  label: string;
  minutes: number;
}

export interface TagSlice {
  id: string;
  name: string;
  color: string;
  minutes: number;
  percentage: number;
}

export interface ActivityRank {
  name: string;
  minutes: number;
}

export interface WeekSummary {
  days: TrendPoint[];
  totalMinutes: number;
  previousTotalMinutes: number;
  changePercent: number | null;
  goalDays: number;
  elapsedDays: number;
}

export interface PlanReviewRow {
  started_at: string;
  ended_at: string;
  status: "planned" | "completed" | "skipped";
}

export interface PlanActualSummary {
  plannedMinutes: number;
  actualMinutes: number;
  completionRate: number | null;
  varianceMinutes: number;
  completedPlans: number;
  reviewedPlans: number;
}

export const RANGE_DAYS: Record<TrendRange, number> = { "7d": 7, "30d": 30 };

/** Local-time ISO date (YYYY-MM-DD) — avoids the UTC shift of toISOString(). */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Every day in the range, oldest first, ending today. */
export function rangeDays(range: TrendRange, today = new Date()): string[] {
  const days: string[] = [];
  for (let i = RANGE_DAYS[range] - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(isoDay(d));
  }
  return days;
}

export function weekDays(today = new Date(), offset = 0): string[] {
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + index);
    return isoDay(day);
  });
}

/**
 * Zero-fills the daily series so the chart shows gaps as zero rather than
 * interpolating a straight line across days with no check-ins.
 */
export function buildTrend(rows: DailyRow[], range: TrendRange, today = new Date()): TrendPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.duration_seconds)]));
  return rangeDays(range, today).map((day) => ({
    day,
    label: day.slice(5),
    minutes: Math.round((byDay.get(day) ?? 0) / 60),
  }));
}

/** Tag totals as minutes plus share of the period, largest first. */
export function buildTagSlices(rows: TagRow[]): TagSlice[] {
  const totals = rows.map((r) => ({ ...r, seconds: Number(r.duration_seconds) }));
  const grandTotal = totals.reduce((sum, r) => sum + r.seconds, 0);
  return totals
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      minutes: Math.round(r.seconds / 60),
      percentage: grandTotal === 0 ? 0 : Math.round((r.seconds / grandTotal) * 100),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Headline numbers for the summary row. */
export function summarize(trend: TrendPoint[]): { totalMinutes: number; activeDays: number; dailyAverage: number } {
  const totalMinutes = trend.reduce((sum, p) => sum + p.minutes, 0);
  const activeDays = trend.filter((p) => p.minutes > 0).length;
  return {
    totalMinutes,
    activeDays,
    dailyAverage: activeDays === 0 ? 0 : Math.round(totalMinutes / activeDays),
  };
}

export function buildWeekSummary(
  rows: DailyRow[],
  goalMinutes: number,
  today = new Date(),
): WeekSummary {
  const byDay = new Map(rows.map((row) => [row.day, Number(row.duration_seconds)]));
  const makeTrend = (days: string[]) => days.map((day) => ({
    day,
    label: day.slice(5),
    minutes: Math.round((byDay.get(day) ?? 0) / 60),
  }));
  const days = makeTrend(weekDays(today));
  const previous = makeTrend(weekDays(today, -1));
  const totalMinutes = days.reduce((sum, point) => sum + point.minutes, 0);
  const previousTotalMinutes = previous.reduce((sum, point) => sum + point.minutes, 0);
  const elapsedDays = (today.getDay() + 6) % 7 + 1;
  return {
    days,
    totalMinutes,
    previousTotalMinutes,
    changePercent: previousTotalMinutes === 0
      ? null
      : Math.round((totalMinutes - previousTotalMinutes) / previousTotalMinutes * 100),
    goalDays: days.slice(0, elapsedDays).filter((point) => point.minutes >= goalMinutes).length,
    elapsedDays,
  };
}

export function buildPlanActualSummary(
  plans: PlanReviewRow[],
  actualSeconds: number,
  now = new Date(),
): PlanActualSummary {
  const plannedMinutes = plans.reduce((total, plan) => {
    const start = new Date(plan.started_at);
    const end = new Date(plan.ended_at);
    const startMinute = start.getHours() * 60 + start.getMinutes();
    const endMinute = end.getHours() * 60 + end.getMinutes();
    return total + Math.max(0, endMinute - startMinute);
  }, 0);
  const reviewed = plans.filter((plan) => (
    plan.status !== "planned" || new Date(plan.ended_at) <= now
  ));
  const completedPlans = reviewed.filter((plan) => plan.status === "completed").length;
  const actualMinutes = Math.round(Number(actualSeconds) / 60);
  return {
    plannedMinutes,
    actualMinutes,
    completionRate: reviewed.length === 0
      ? null
      : Math.round(completedPlans / reviewed.length * 100),
    varianceMinutes: actualMinutes - plannedMinutes,
    completedPlans,
    reviewedPlans: reviewed.length,
  };
}

export function buildActivityRanking(rows: ActivityRow[], limit = 5): ActivityRank[] {
  return rows
    .map((row) => ({ name: row.name, minutes: Math.round(Number(row.duration_seconds) / 60) }))
    .sort((left, right) => right.minutes - left.minutes)
    .slice(0, limit);
}
