export type PlanTransformMode = "move" | "resize-start" | "resize-end";

export interface PlanRangeInput {
  startedAt: string | Date;
  endedAt: string | Date;
}

export interface PlanRange {
  startedAt: Date;
  endedAt: Date;
}

export const PLAN_GRID_MINUTES = 15;
export const LAST_PLAN_MINUTE = 23 * 60 + 45;

function localMinute(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function snapMinute(value: number): number {
  return Math.round(value / PLAN_GRID_MINUTES) * PLAN_GRID_MINUTES;
}

function floorToGrid(value: number): number {
  return Math.floor(value / PLAN_GRID_MINUTES) * PLAN_GRID_MINUTES;
}

function ceilToGrid(value: number): number {
  return Math.ceil(value / PLAN_GRID_MINUTES) * PLAN_GRID_MINUTES;
}

function atLocalMinute(date: string, minute: number): Date {
  const value = new Date(date + "T00:00:00");
  value.setMinutes(minute, 0, 0);
  return value;
}

export function transformPlanRange(
  range: PlanRangeInput,
  mode: PlanTransformMode,
  targetDate: string,
  targetMinute: number,
): PlanRange {
  const originalStart = localMinute(range.startedAt);
  const originalEnd = localMinute(range.endedAt);
  const duration = Math.min(
    LAST_PLAN_MINUTE,
    Math.max(PLAN_GRID_MINUTES, snapMinute(originalEnd - originalStart)),
  );
  const target = snapMinute(targetMinute);

  if (mode === "move") {
    const latestStart = floorToGrid(LAST_PLAN_MINUTE - duration);
    const start = Math.min(
      latestStart,
      Math.max(0, target),
    );
    return {
      startedAt: atLocalMinute(targetDate, start),
      endedAt: atLocalMinute(targetDate, start + duration),
    };
  }

  const date = formatLocalPlanTime(
    range.startedAt instanceof Date ? range.startedAt : new Date(range.startedAt),
  ).slice(0, 10);
  if (mode === "resize-start") {
    const start = Math.min(
      floorToGrid(originalEnd - PLAN_GRID_MINUTES),
      Math.max(0, target),
    );
    return {
      startedAt: atLocalMinute(date, start),
      endedAt: atLocalMinute(date, originalEnd),
    };
  }

  if (targetMinute >= originalEnd && originalEnd > LAST_PLAN_MINUTE) {
    return {
      startedAt: range.startedAt instanceof Date ? range.startedAt : new Date(range.startedAt),
      endedAt: range.endedAt instanceof Date ? range.endedAt : new Date(range.endedAt),
    };
  }
  const end = Math.min(
    LAST_PLAN_MINUTE,
    Math.max(ceilToGrid(originalStart + PLAN_GRID_MINUTES), target),
  );
  return {
    startedAt: atLocalMinute(date, originalStart),
    endedAt: atLocalMinute(date, end),
  };
}

export function formatLocalPlanTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return year + "-" + month + "-" + day + "T" + hour + ":" + minute;
}
