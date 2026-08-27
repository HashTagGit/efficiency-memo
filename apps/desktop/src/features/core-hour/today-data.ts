import { dbExecute, dbSelect } from "../../lib/db";

export interface RecentActivity {
  activity: string;
  default_tag_id: string | null;
  tag_name: string | null;
  tag_color: string | null;
  is_favorite: boolean;
  last_used_at: string;
}

export interface TodaySession {
  id: string;
  activity: string;
  started_at: string;
  ended_at: string;
  elapsed_seconds: number;
  default_tag_id: string | null;
  tag_name: string | null;
  tag_color: string | null;
  is_favorite: boolean;
}

export function elapsedSecondsForDay(
  startedAt: string,
  endedAt: string | Date,
  elapsedSeconds: number,
  day: Date,
): number {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const wallSeconds = Math.max(1, (end - start) / 1000);
  const overlapSeconds = Math.max(0, (Math.min(end, dayEnd.getTime()) - Math.max(start, dayStart.getTime())) / 1000);
  // ponytail: elapsed time has no pause slices; prorate until interval slices exist.
  return Math.round(elapsedSeconds * Math.min(1, overlapSeconds / wallSeconds));
}

export async function loadRecentActivities(userId: string): Promise<RecentActivity[]> {
  const rows = await dbSelect<Omit<RecentActivity, "is_favorite"> & { is_favorite: number }>(
    "SELECT s.activity, s.default_tag_id, t.name AS tag_name, t.color AS tag_color, MAX(s.is_favorite) AS is_favorite, MAX(s.started_at) AS last_used_at FROM ch_sessions s LEFT JOIN ch_tags t ON t.id = s.default_tag_id WHERE s.user_id = $1 AND s.ended_at IS NOT NULL AND trim(s.activity) <> '' AND (s.default_tag_id IS NULL OR t.is_archived = 0) GROUP BY s.activity, s.default_tag_id, t.name, t.color ORDER BY is_favorite DESC, last_used_at DESC LIMIT 8",
    [userId],
  );
  return rows.map((row) => ({ ...row, is_favorite: Boolean(row.is_favorite) }));
}

export async function loadSessionsForDay(userId: string, now: Date): Promise<TodaySession[]> {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const rows = await dbSelect<Omit<TodaySession, "is_favorite" | "elapsed_seconds"> & { is_favorite: number; elapsed_seconds: number | string }>(
    "SELECT s.id, s.activity, s.started_at, s.ended_at, s.elapsed_seconds, s.default_tag_id, t.name AS tag_name, t.color AS tag_color, (SELECT MAX(f.is_favorite) FROM ch_sessions f WHERE f.user_id = s.user_id AND f.activity = s.activity AND f.default_tag_id IS s.default_tag_id) AS is_favorite FROM ch_sessions s LEFT JOIN ch_tags t ON t.id = s.default_tag_id WHERE s.user_id = $1 AND s.ended_at IS NOT NULL AND s.started_at < $3 AND s.ended_at > $2 ORDER BY s.started_at DESC",
    [userId, dayStart.toISOString(), dayEnd.toISOString()],
  );
  return rows.map((row) => ({
    ...row,
    elapsed_seconds: elapsedSecondsForDay(row.started_at, row.ended_at, Number(row.elapsed_seconds), now),
    is_favorite: Boolean(row.is_favorite),
  }));
}

export function loadTodaySessions(userId: string, now = new Date()): Promise<TodaySession[]> {
  return loadSessionsForDay(userId, now);
}

export async function setActivityFavorite(
  userId: string,
  activity: string,
  tagId: string | null,
  favorite: boolean,
): Promise<void> {
  await dbExecute(
    "UPDATE ch_sessions SET is_favorite = $1, synced = 0 WHERE user_id = $2 AND activity = $3 AND default_tag_id IS $4",
    [favorite ? 1 : 0, userId, activity, tagId],
  );
}
