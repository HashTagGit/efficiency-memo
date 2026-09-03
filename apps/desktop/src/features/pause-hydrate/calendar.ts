import type { HolidayCalendar } from "./types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function validDate(value: string, year: number): boolean {
  if (!DATE_PATTERN.test(value) || !value.startsWith(`${year}-`)) return false;
  const [dateYear, month, day] = value.split("-").map(Number);
  const date = new Date(dateYear, month - 1, day);
  return date.getFullYear() === dateYear && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateText(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeCalendar(value: unknown, expectedYear?: number): HolidayCalendar {
  if (!value || typeof value !== "object") throw new Error("invalid-calendar");
  const candidate = value as Partial<HolidayCalendar>;
  const year = Number(candidate.year);
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || (expectedYear && year !== expectedYear)) {
    throw new Error("invalid-calendar-year");
  }
  const holidays = Array.isArray(candidate.holidays) ? candidate.holidays.filter((date): date is string => typeof date === "string") : [];
  const workdays = Array.isArray(candidate.workdays) ? candidate.workdays.filter((date): date is string => typeof date === "string") : [];
  if (holidays.length > 400 || workdays.length > 100 || holidays.some((date) => !validDate(date, year)) || workdays.some((date) => !validDate(date, year))) {
    throw new Error("invalid-calendar-dates");
  }
  const holidaySet = new Set(holidays);
  const workdaySet = new Set(workdays);
  if ([...holidaySet].some((date) => workdaySet.has(date))) throw new Error("invalid-calendar-overlap");
  return { year, holidays: [...holidaySet].sort(), workdays: [...workdaySet].sort() };
}

function parseIcs(text: string): HolidayCalendar {
  const events = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const holidays = new Set<string>();
  const workdays = new Set<string>();
  for (const event of events) {
    const start = event.match(/DTSTART(?:;[^:]*)?:(\d{8})/)?.[1];
    if (!start) continue;
    const end = event.match(/DTEND(?:;[^:]*)?:(\d{8})/)?.[1] ?? start;
    const startDate = new Date(`${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}T00:00:00`);
    const endDate = new Date(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T00:00:00`);
    const isWorkday = /补班|上班|compensateday|workday/i.test(event);
    for (const date = new Date(startDate); date < endDate || (date.getTime() === startDate.getTime() && start === end); date.setDate(date.getDate() + 1)) {
      const value = dateText(date);
      (isWorkday ? workdays : holidays).add(value);
      if (start === end) break;
    }
  }
  const allDates = [...holidays, ...workdays];
  const year = Number(allDates[0]?.slice(0, 4));
  if (!Number.isInteger(year)) throw new Error("invalid-calendar");
  return normalizeCalendar({ year, holidays: [...holidays], workdays: [...workdays] });
}

export function parseHolidayCalendar(text: string, expectedYear?: number): HolidayCalendar {
  if (text.length > 2_000_000) throw new Error("calendar-too-large");
  try {
    return normalizeCalendar(JSON.parse(text), expectedYear);
  } catch (error) {
    if (error instanceof SyntaxError) return normalizeCalendar(parseIcs(text), expectedYear);
    throw error;
  }
}
