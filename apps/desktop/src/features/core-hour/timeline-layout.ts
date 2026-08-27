import type { TodaySession } from "./today-data";

export interface TimelineBounds {
  startMinute: number;
  endMinute: number;
}

export interface TimelineSessionLayout {
  session: TodaySession;
  startMinute: number;
  endMinute: number;
  top: number;
  height: number;
}

export interface TimelineInterval {
  started_at: string;
  ended_at: string;
}

export interface TimelineIntervalLayout {
  startMinute: number;
  endMinute: number;
  top: number;
  height: number;
}

export const TIMELINE_BOUNDS: TimelineBounds = {
  startMinute: 0,
  endMinute: 1440,
};

function dayRange(date: string): { start: number; end: number } {
  const startDate = new Date(date + "T00:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  return { start: startDate.getTime(), end: endDate.getTime() };
}

function sessionMinutes(
  session: TimelineInterval,
  date: string,
): { startMinute: number; endMinute: number } {
  const day = dayRange(date);
  const wallMinute = (timestamp: number) => {
    if (timestamp <= day.start) return 0;
    if (timestamp >= day.end) return 1440;
    const value = new Date(timestamp);
    return Math.round(value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60);
  };
  return {
    startMinute: wallMinute(new Date(session.started_at).getTime()),
    endMinute: wallMinute(new Date(session.ended_at).getTime()),
  };
}

export function layoutTimelineInterval(
  interval: TimelineInterval,
  date: string,
  hourHeight: number,
): TimelineIntervalLayout {
  const minutes = sessionMinutes(interval, date);
  return {
    ...minutes,
    top: minutes.startMinute / 60 * hourHeight,
    height: Math.max(24, (minutes.endMinute - minutes.startMinute) / 60 * hourHeight - 2),
  };
}

export function layoutTimelineSessions(
  sessions: TodaySession[],
  date: string,
  hourHeight: number,
): TimelineSessionLayout[] {
  return sessions.map((session) => {
    const layout = layoutTimelineInterval(session, date, hourHeight);
    return {
      session,
      ...layout,
    };
  });
}

export function snapTimelineMinute(
  offsetY: number,
  startMinute: number,
  hourHeight: number,
): number {
  const minute = startMinute + offsetY / hourHeight * 60;
  return Math.min(1395, Math.max(0, Math.round(minute / 15) * 15));
}
