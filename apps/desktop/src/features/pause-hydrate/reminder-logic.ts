import type {
  HolidayCalendar,
  ReminderKind,
  ReminderState,
  SchedulePolicy,
  WeekdaySchedule,
} from "./types";

export const DEFAULT_INTERVALS: Record<ReminderKind, number> = {
  break: 60,
  hydration: 45,
};

export const DEFAULT_WEEKDAY_SCHEDULES: WeekdaySchedule[] = Array.from({ length: 7 }, () => ({
  workWindows: [{ startMinute: 9 * 60, endMinute: 18 * 60 }],
  quietWindows: [],
}));

export const BUILTIN_CHINA_CALENDAR_2026: HolidayCalendar = {
  year: 2026,
  holidays: [
    "2026-01-01", "2026-01-02", "2026-01-03",
    "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19",
    "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
    "2026-04-04", "2026-04-05", "2026-04-06",
    "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-06-19", "2026-06-20", "2026-06-21",
    "2026-09-25", "2026-09-26", "2026-09-27",
    "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05",
    "2026-10-06", "2026-10-07",
  ],
  workdays: ["2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10"],
};

export function normalizeReminderInterval(kind: ReminderKind, value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 15 && minutes <= 240 && minutes % 15 === 0
    ? minutes
    : DEFAULT_INTERVALS[kind];
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function inWindow(minute: number, start: number, end: number): boolean {
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

function scheduleFor(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
): WeekdaySchedule {
  return policy.weekdaySchedules[day] ?? DEFAULT_WEEKDAY_SCHEDULES[day];
}

function quietAt(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
  minute: number,
): boolean {
  const current = scheduleFor(policy, day).quietWindows;
  const previous = scheduleFor(policy, (day + 6) % 7).quietWindows;
  return current.some((window) => window.startMinute < window.endMinute
    ? inWindow(minute, window.startMinute, window.endMinute)
    : minute >= window.startMinute)
    || previous.some((window) => window.startMinute > window.endMinute && minute < window.endMinute);
}

function scheduleAllowsMinute(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
  minute: number,
): boolean {
  return scheduleFor(policy, day).workWindows.some((window) => inWindow(
    minute, window.startMinute, window.endMinute,
  )) && !quietAt(policy, day, minute);
}

export function scheduleHasAvailableTime(
  policy: Pick<SchedulePolicy, "activeWeekdays" | "weekdaySchedules">,
): boolean {
  return policy.activeWeekdays.some((day) => {
    for (let minute = 0; minute < 1440; minute += 1) {
      if (scheduleAllowsMinute(policy, day, minute)) return true;
    }
    return false;
  });
}

export function reminderAllowedAt(policy: SchedulePolicy, date: Date): boolean {
  const dateText = localDate(date);
  const calendarActive = policy.calendarEnabled && policy.calendarAvailable && policy.calendarData?.year === date.getFullYear();
  if (calendarActive && policy.calendarData?.holidays.includes(dateText)) return false;
  const calendarWorkday = calendarActive && policy.calendarData?.workdays.includes(dateText);
  const day = weekday(date);
  const active = calendarWorkday || policy.activeWeekdays.includes(day);
  return active && scheduleAllowsMinute(policy, day, date.getHours() * 60 + date.getMinutes());
}

export function nextDueAt(now: Date, intervalMinutes: number, policy?: SchedulePolicy): Date {
  const candidate = new Date(now.getTime() + intervalMinutes * 60_000);
  if (!policy) return candidate;
  for (let offset = 0; offset <= 14 * 24 * 60; offset += 1) {
    const next = new Date(candidate.getTime() + offset * 60_000);
    if (reminderAllowedAt(policy, next)) return next;
  }
  return candidate;
}

type ReminderLike = Pick<ReminderState, "enabled" | "intervalMinutes" | "nextDueAt"> & Partial<Pick<ReminderState, "kind">>;

export function nextDistinctDueAt(
  reminder: ReminderLike,
  otherReminder: ReminderLike,
  floor: Date,
  policy: SchedulePolicy,
): Date {
  const reminderComesFirst = reminder.kind && otherReminder.kind
    ? reminder.kind === "break"
    : reminder.intervalMinutes <= otherReminder.intervalMinutes;
  const firstDue = nextDueAt(
    floor,
    reminderComesFirst ? reminder.intervalMinutes : otherReminder.intervalMinutes,
    policy,
  );
  return reminderComesFirst ? firstDue : nextDueAt(firstDue, reminder.intervalMinutes, policy);
}

export function effectiveReminderDueAt(
  reminder: ReminderLike,
  policy: SchedulePolicy,
  now = new Date(),
  otherReminder?: ReminderLike,
  blockedUntil?: Date | null,
): Date | null {
  if (!reminder.enabled || !scheduleHasAvailableTime(policy)) return null;
  const stored = reminder.nextDueAt ? new Date(reminder.nextDueAt) : null;
  const collision = Boolean(
    stored
      && otherReminder?.enabled
      && otherReminder.nextDueAt === reminder.nextDueAt
      && otherReminder.intervalMinutes !== reminder.intervalMinutes,
  );
  const floor = blockedUntil && blockedUntil > now ? blockedUntil : now;
  if (collision && otherReminder) {
    return nextDistinctDueAt(reminder, otherReminder, floor, policy);
  }
  if (stored && Number.isFinite(stored.getTime()) && !collision && reminderAllowedAt(policy, stored)
    && (!blockedUntil || stored > blockedUntil)) {
    return stored;
  }
  return nextDueAt(floor, reminder.intervalMinutes, policy);
}

export function hasDueCollision(
  reminders: Record<ReminderKind, ReminderLike>,
): boolean {
  const movement = reminders.break;
  const hydration = reminders.hydration;
  return movement.enabled
    && hydration.enabled
    && movement.nextDueAt !== null
    && movement.nextDueAt === hydration.nextDueAt
    && movement.intervalMinutes !== hydration.intervalMinutes;
}

export function tomorrowStart(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
