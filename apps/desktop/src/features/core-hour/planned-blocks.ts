import { dbExecute, dbSelect } from "../../lib/db";
import { layoutTimelineInterval, type TimelineInterval, type TimelineIntervalLayout } from "./timeline-layout";

export type PlanStatus = "planned" | "completed" | "skipped";
export type PlanRangeError = "invalid-range" | "cross-day";

export interface PlannedBlock extends TimelineInterval {
  id: string;
  title: string;
  tag_id: string | null;
  tag_name: string | null;
  tag_color: string | null;
  status: PlanStatus;
  session_id: string | null;
}

export interface PlannedBlockInput {
  id?: string;
  userId: string;
  title: string;
  tagId: string | null;
  startedAt: string;
  endedAt: string;
}

export interface PlannedBlockRangeInput {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string;
}

export function validatePlanRange(startedAt: string, endedAt: string): PlanRangeError | null {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return "invalid-range";
  return startedAt.slice(0, 10) === endedAt.slice(0, 10) ? null : "cross-day";
}

export function layoutPlannedBlock(
  plan: TimelineInterval,
  date: string,
  hourHeight: number,
): TimelineIntervalLayout {
  return layoutTimelineInterval(plan, date, hourHeight);
}

export interface PlannedBlockLane<T extends TimelineInterval & { id: string }> extends TimelineIntervalLayout {
  plan: T;
  lane: number;
  laneCount: number;
}

export function layoutPlannedBlocks<T extends TimelineInterval & { id: string }>(
  plans: T[],
  date: string,
  hourHeight: number,
): PlannedBlockLane<T>[] {
  const items = plans
    .map((plan) => ({ plan, ...layoutPlannedBlock(plan, date, hourHeight), lane: 0, laneCount: 1 }))
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
  let clusterStart = 0;
  let clusterEnd = -1;
  let active: Array<{ lane: number; endMinute: number }> = [];

  function finishCluster(end: number) {
    const count = Math.max(1, ...items.slice(clusterStart, end).map((item) => item.lane + 1));
    for (const item of items.slice(clusterStart, end)) item.laneCount = count;
  }

  items.forEach((item, index) => {
    if (index > clusterStart && item.startMinute >= clusterEnd) {
      finishCluster(index);
      clusterStart = index;
      active = [];
    }
    active = active.filter((lane) => lane.endMinute > item.startMinute);
    const used = new Set(active.map((lane) => lane.lane));
    while (used.has(item.lane)) item.lane += 1;
    active.push({ lane: item.lane, endMinute: item.endMinute });
    clusterEnd = Math.max(clusterEnd, item.endMinute);
  });
  finishCluster(items.length);
  return items;
}

export async function loadPlansForRange(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<PlannedBlock[]> {
  return dbSelect<PlannedBlock>(
    "SELECT p.id, p.title, p.tag_id, p.started_at, p.ended_at, p.status, p.session_id, t.name AS tag_name, t.color AS tag_color FROM ch_plans p LEFT JOIN ch_tags t ON t.id = p.tag_id WHERE p.user_id = $1 AND p.started_at < $3 AND p.ended_at > $2 ORDER BY p.started_at",
    [userId, rangeStart.toISOString(), rangeEnd.toISOString()],
  );
}

export async function savePlannedBlock(input: PlannedBlockInput): Promise<string> {
  const error = validatePlanRange(input.startedAt, input.endedAt);
  if (error) throw new Error(error);
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const startedAt = new Date(input.startedAt).toISOString();
  const endedAt = new Date(input.endedAt).toISOString();
  await dbExecute(
    "INSERT INTO ch_plans (id, user_id, title, tag_id, started_at, ended_at, status, session_id, created_at, updated_at, synced) VALUES ($1, $2, $3, $4, $5, $6, 'planned', NULL, $7, $7, 0) ON CONFLICT(id) DO UPDATE SET title = excluded.title, tag_id = excluded.tag_id, started_at = excluded.started_at, ended_at = excluded.ended_at, updated_at = excluded.updated_at, synced = 0 WHERE ch_plans.user_id = excluded.user_id AND ch_plans.status = 'planned'",
    [id, input.userId, input.title.trim(), input.tagId, startedAt, endedAt, now],
  );
  if (!input.id) return id;
  const [saved] = await dbSelect<Pick<PlannedBlock, "started_at" | "ended_at" | "status">>(
    "SELECT started_at, ended_at, status FROM ch_plans WHERE id = $1 AND user_id = $2",
    [id, input.userId],
  );
  if (!saved || saved.status !== "planned"
    || saved.started_at !== startedAt || saved.ended_at !== endedAt) {
    throw new Error("plan-not-available");
  }
  return id;
}

export async function updatePlannedBlockRange(input: PlannedBlockRangeInput): Promise<void> {
  const error = validatePlanRange(input.startedAt, input.endedAt);
  if (error) throw new Error(error);
  const startedAt = new Date(input.startedAt).toISOString();
  const endedAt = new Date(input.endedAt).toISOString();
  await dbExecute(
    "UPDATE ch_plans SET started_at = $1, ended_at = $2, updated_at = $3, synced = 0 WHERE id = $4 AND user_id = $5 AND status = 'planned'",
    [startedAt, endedAt, new Date().toISOString(), input.id, input.userId],
  );
  const [saved] = await dbSelect<Pick<PlannedBlock, "started_at" | "ended_at" | "status">>(
    "SELECT started_at, ended_at, status FROM ch_plans WHERE id = $1 AND user_id = $2",
    [input.id, input.userId],
  );
  if (!saved || saved.status !== "planned"
    || saved.started_at !== startedAt || saved.ended_at !== endedAt) {
    throw new Error("plan-not-available");
  }
}

export async function skipPlannedBlock(userId: string, planId: string): Promise<void> {
  await dbExecute(
    "UPDATE ch_plans SET status = 'skipped', updated_at = $1, synced = 0 WHERE id = $2 AND user_id = $3 AND status = 'planned'",
    [new Date().toISOString(), planId, userId],
  );
}
