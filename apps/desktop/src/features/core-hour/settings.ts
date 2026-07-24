import { dbExecute, dbSelect } from "../../lib/db";

export const checkInIntervalOptions = [15, 30, 60] as const;

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
