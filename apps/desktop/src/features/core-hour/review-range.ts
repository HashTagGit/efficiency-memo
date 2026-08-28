import { isoDay } from "./analytics";

function withOffset(value: Date): string {
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, -1);
  return `${local}${sign}${hours}:${minutes}`;
}

function localMidday(date: Date): Date {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  return value;
}

export function localDayRange(date: Date): { localDate: string; startedAt: string; endedAt: string } {
  const selected = localMidday(date);
  const startedAt = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const endedAt = new Date(startedAt);
  endedAt.setDate(endedAt.getDate() + 1);
  return { localDate: isoDay(selected), startedAt: withOffset(startedAt), endedAt: withOffset(endedAt) };
}

export function localWeekRange(date: Date): { weekStartedOn: string; startedAt: string; endedAt: string } {
  const selected = localMidday(date);
  selected.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
  const startedAt = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const endedAt = new Date(startedAt);
  endedAt.setDate(endedAt.getDate() + 7);
  return { weekStartedOn: isoDay(selected), startedAt: withOffset(startedAt), endedAt: withOffset(endedAt) };
}
