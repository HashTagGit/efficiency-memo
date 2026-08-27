import { dbExecute, dbSelect } from "../../lib/db";

export const checkInIntervalOptions = [15, 30, 60] as const;
export const DEFAULT_DAILY_FOCUS_GOAL = 120;

export function normalizeDailyFocusGoal(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 15 && minutes <= 720 && minutes % 15 === 0
    ? minutes
    : DEFAULT_DAILY_FOCUS_GOAL;
}

export async function loadCheckInInterval(): Promise<number> {
  const [setting] = await dbSelect<{ value: string }>(
    "SELECT value FROM ch_settings WHERE key = 'interval_minutes'",
  );
  const interval = Number(setting?.value);
  return checkInIntervalOptions.includes(interval as (typeof checkInIntervalOptions)[number])
    ? interval
    : 30;
}

export async function saveCheckInInterval(interval: number): Promise<void> {
  await dbExecute(
    "INSERT OR REPLACE INTO ch_settings (key, value) VALUES ('interval_minutes', $1)",
    [String(interval)],
  );
}

export async function loadDailyFocusGoal(): Promise<number> {
  const [setting] = await dbSelect<{ value: string }>(
    "SELECT value FROM ch_settings WHERE key = 'daily_focus_goal_minutes'",
  );
  return setting ? normalizeDailyFocusGoal(setting.value) : DEFAULT_DAILY_FOCUS_GOAL;
}

export async function saveDailyFocusGoal(minutes: number): Promise<void> {
  await dbExecute(
    "INSERT OR REPLACE INTO ch_settings (key, value) VALUES ('daily_focus_goal_minutes', $1)",
    [String(normalizeDailyFocusGoal(minutes))],
  );
}
