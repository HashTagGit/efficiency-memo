import type {
  HolidayCalendar,
  ReminderKind,
  ReminderState,
  ReminderWindow,
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

function scheduleFor(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
): WeekdaySchedule {
  return policy.weekdaySchedules[day] ?? DEFAULT_WEEKDAY_SCHEDULES[day];
}

export function effectiveWorkSegments(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
): ReminderWindow[] {
  const schedule = scheduleFor(policy, day);
  const work: ReminderWindow[] = [];
  for (const window of [...schedule.workWindows].sort((a, b) => a.startMinute - b.startMinute)) {
    const previous = work.at(-1);
    if (previous && window.startMinute <= previous.endMinute) {
      previous.endMinute = Math.max(previous.endMinute, window.endMinute);
    } else {
      work.push({ ...window });
    }
  }
  const quiet = schedule.quietWindows.map((window) => ({
    startMinute: window.startMinute,
    endMinute: window.startMinute < window.endMinute ? window.endMinute : 1440,
  }));
  for (const window of scheduleFor(policy, (day + 6) % 7).quietWindows) {
    if (window.startMinute > window.endMinute) quiet.push({ startMinute: 0, endMinute: window.endMinute });
  }
  let segments = work;
  for (const block of quiet) {
    segments = segments.flatMap((segment) => {
      if (block.endMinute <= segment.startMinute || block.startMinute >= segment.endMinute) return [segment];
      const remaining: ReminderWindow[] = [];
      if (block.startMinute > segment.startMinute) remaining.push({ ...segment, endMinute: block.startMinute });
      if (block.endMinute < segment.endMinute) remaining.push({ ...segment, startMinute: block.endMinute });
      return remaining;
    });
  }
  return segments;
}

function scheduleAllowsMinute(
  policy: Pick<SchedulePolicy, "weekdaySchedules">,
  day: number,
  minute: number,
): boolean {
  return effectiveWorkSegments(policy, day).some((segment) => minute > segment.startMinute && minute < segment.endMinute);
}

function activeDay(policy: SchedulePolicy, date: Date): boolean {
  const dateText = localDate(date);
  const calendarActive = policy.calendarEnabled && policy.calendarAvailable && policy.calendarData?.year === date.getFullYear();
  if (calendarActive && policy.calendarData?.holidays.includes(dateText)) return false;
  return Boolean(calendarActive && policy.calendarData?.workdays.includes(dateText))
    || policy.activeWeekdays.includes(weekday(date));
}


export function scheduleHasAvailableTime(
  policy: Pick<SchedulePolicy, "activeWeekdays" | "weekdaySchedules">,
  intervalMinutes = 0,
): boolean {
  return policy.activeWeekdays.some((day) => effectiveWorkSegments(policy, day)
    .some((segment) => segment.endMinute - segment.startMinute > Math.max(1, intervalMinutes)));
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
  if (!policy) return new Date(now.getTime() + intervalMinutes * 60_000);
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= 14; offset += 1, day.setDate(day.getDate() + 1)) {
    if (!activeDay(policy, day)) continue;
    for (const segment of effectiveWorkSegments(policy, weekday(day))) {
      const start = new Date(day);
      const end = new Date(day);
      start.setMinutes(segment.startMinute);
      end.setMinutes(segment.endMinute);
      const candidate = new Date(Math.max(now.getTime(), start.getTime()) + intervalMinutes * 60_000);
      if (candidate < end) return candidate;
    }
  }
  throw new Error("no-reminder-window");
}

type ReminderLike = Pick<ReminderState, "enabled" | "intervalMinutes" | "nextDueAt"> & Partial<Pick<ReminderState, "kind">>;

function sameDueMinute(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime)
    && Number.isFinite(rightTime)
    && Math.floor(leftTime / 60_000) === Math.floor(rightTime / 60_000);
}

export function nextDistinctDueAt(
  reminder: ReminderLike,
  otherReminder: ReminderLike,
  floor: Date,
  policy: SchedulePolicy,
): Date {
  const due = nextDueAt(floor, reminder.intervalMinutes, policy);
  const otherDue = nextDueAt(floor, otherReminder.intervalMinutes, policy);
  return due.getTime() === otherDue.getTime() && reminder.kind === "hydration"
    && reminder.intervalMinutes !== otherReminder.intervalMinutes
    ? nextDueAt(due, reminder.intervalMinutes, policy)
    : due;
}

export function effectiveReminderDueAt(
  reminder: ReminderLike,
  policy: SchedulePolicy,
  now = new Date(),
  otherReminder?: ReminderLike,
  blockedUntil?: Date | null,
): Date | null {
  if (!reminder.enabled || !scheduleHasAvailableTime(policy, reminder.intervalMinutes)) return null;
  const stored = reminder.nextDueAt ? new Date(reminder.nextDueAt) : null;
  const collision = Boolean(
    stored
      && otherReminder?.enabled
      && sameDueMinute(otherReminder.nextDueAt, reminder.nextDueAt)
      && otherReminder.intervalMinutes !== reminder.intervalMinutes,
  );
  const floor = blockedUntil && blockedUntil > now ? blockedUntil : now;
  if (collision && otherReminder) {
    return nextDistinctDueAt(reminder, otherReminder, floor, policy);
  }
  if (stored && Number.isFinite(stored.getTime()) && !collision && reminderAllowedAt(policy, stored)
    && (!blockedUntil || stored > blockedUntil)) {
    const day = new Date(stored < now && localDate(stored) !== localDate(now) ? now : stored);
    day.setHours(0, 0, 0, 0);
    const firstDue = nextDueAt(day, reminder.intervalMinutes, policy);
    return stored < firstDue ? firstDue : stored;
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
    && sameDueMinute(movement.nextDueAt, hydration.nextDueAt)
    && movement.intervalMinutes !== hydration.intervalMinutes;
}

export function tomorrowStart(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
