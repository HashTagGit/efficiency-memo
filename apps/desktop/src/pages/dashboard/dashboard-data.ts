import { dbSelect } from "../../lib/db";

export interface DashboardPlanSummary {
  id: string;
  title: string;
  started_at: string;
  ended_at: string;
}

export interface DashboardNowData {
  nextPlan: DashboardPlanSummary | null;
  deviceCount: number;
  deviceAttentionCount: number;
}

interface DeviceCountRow {
  device_count: number | string;
  attention_count: number | string | null;
}

export async function loadDashboardNow(userId: string, now = new Date()): Promise<DashboardNowData> {
  const dayEnd = new Date(now);
  dayEnd.setHours(24, 0, 0, 0);
  const [plans, deviceRows] = await Promise.all([
    dbSelect<DashboardPlanSummary>(
      "SELECT id, title, started_at, ended_at FROM ch_plans WHERE user_id = $1 AND status = 'planned' AND ended_at > $2 AND started_at < $3 ORDER BY started_at LIMIT 1",
      [userId, now.toISOString(), dayEnd.toISOString()],
    ),
    dbSelect<DeviceCountRow>(
      "SELECT COUNT(*) AS device_count, SUM(CASE WHEN s.status IS NULL OR s.status <> 'tracking' THEN 1 ELSE 0 END) AS attention_count FROM cr_devices d LEFT JOIN cr_computed_reminder_states s ON s.device_id = d.id WHERE d.user_id = $1",
      [userId],
    ),
  ]);
  const counts = deviceRows[0];
  return {
    nextPlan: plans[0] ?? null,
    deviceCount: Number(counts?.device_count ?? 0),
    deviceAttentionCount: Number(counts?.attention_count ?? 0),
  };
}
