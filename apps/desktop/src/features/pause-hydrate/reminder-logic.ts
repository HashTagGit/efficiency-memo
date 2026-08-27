import type { ReminderKind } from "./types";

export const DEFAULT_INTERVALS: Record<ReminderKind, number> = {
  break: 60,
  hydration: 45,
};

export function normalizeReminderInterval(kind: ReminderKind, value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 15 && minutes <= 240 && minutes % 15 === 0
    ? minutes
    : DEFAULT_INTERVALS[kind];
}

export function nextDueAt(now: Date, intervalMinutes: number): Date {
  return new Date(now.getTime() + intervalMinutes * 60_000);
}

export function tomorrowStart(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
