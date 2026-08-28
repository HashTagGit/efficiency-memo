import { dbExecute, dbSelect } from "../../lib/db";

const SNOOZE_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface ChargerNotificationState {
  device_id: string;
  last_notified_due_at: string | null;
  snoozed_until: string | null;
  updated_at: string;
}

export interface ChargerNotificationClaim {
  deviceId: string;
  name: string;
  dueAt: string;
}

interface ChargerNotificationClaimRow {
  device_id: string;
  name: string;
  due_at: string;
}

export function isChargerReminderDue(
  reminderDueAt: string | null,
  snoozedUntil: string | null,
  now = new Date(),
): boolean {
  if (!reminderDueAt) return false;
  const dueAt = Date.parse(reminderDueAt);
  const snoozed = snoozedUntil ? Date.parse(snoozedUntil) : Number.NaN;
  return !Number.isNaN(dueAt)
    && dueAt <= now.getTime()
    && (Number.isNaN(snoozed) || snoozed <= now.getTime());
}

export async function loadChargerNotificationState(
  deviceId: string,
): Promise<ChargerNotificationState | null> {
  const rows = await dbSelect<ChargerNotificationState>(
    "SELECT * FROM cr_notification_states WHERE device_id = $1",
    [deviceId],
  );
  return rows[0] ?? null;
}

export async function claimDueChargerNotifications(
  userId: string,
  now = new Date(),
): Promise<ChargerNotificationClaim[]> {
  const rows = await dbSelect<ChargerNotificationClaimRow>(
    `SELECT d.id AS device_id, d.name, s.reminder_due_at AS due_at
     FROM cr_devices d
     JOIN cr_computed_reminder_states s ON s.device_id = d.id
     LEFT JOIN cr_notification_states n ON n.device_id = d.id
     WHERE d.user_id = $1
       AND s.reminder_due_at IS NOT NULL
       AND julianday(s.reminder_due_at) <= julianday($2)
       AND (n.snoozed_until IS NULL OR julianday(n.snoozed_until) <= julianday($2))
       AND (n.last_notified_due_at IS NULL OR n.last_notified_due_at <> s.reminder_due_at)
     ORDER BY julianday(s.reminder_due_at), d.name
     LIMIT 3`,
    [userId, now.toISOString()],
  );
  return rows.map((row) => ({ deviceId: row.device_id, name: row.name, dueAt: row.due_at }));
}

export async function acknowledgeChargerNotification(
  deviceId: string,
  dueAt: string,
  acknowledgedAt = new Date(),
): Promise<void> {
  await dbExecute(
    `INSERT INTO cr_notification_states (device_id, last_notified_due_at, snoozed_until, updated_at)
     SELECT device_id, reminder_due_at, NULL, $3
     FROM cr_computed_reminder_states
     WHERE device_id = $1 AND reminder_due_at = $2
     ON CONFLICT(device_id) DO UPDATE SET
       last_notified_due_at = excluded.last_notified_due_at,
       snoozed_until = NULL,
       updated_at = excluded.updated_at`,
    [deviceId, dueAt, acknowledgedAt.toISOString()],
  );
}

export async function snoozeChargerNotification(
  deviceId: string,
  dueAt: string,
  now = new Date(),
): Promise<ChargerNotificationState> {
  const snoozedUntil = new Date(now.getTime() + SNOOZE_MILLISECONDS).toISOString();
  await dbExecute(
    `INSERT INTO cr_notification_states (device_id, last_notified_due_at, snoozed_until, updated_at)
     SELECT device_id, NULL, $3, $4
     FROM cr_computed_reminder_states
     WHERE device_id = $1 AND reminder_due_at = $2
     ON CONFLICT(device_id) DO UPDATE SET
       last_notified_due_at = NULL,
       snoozed_until = excluded.snoozed_until,
       updated_at = excluded.updated_at`,
    [deviceId, dueAt, snoozedUntil, now.toISOString()],
  );
  const state = await loadChargerNotificationState(deviceId);
  if (!state || state.snoozed_until !== snoozedUntil) throw new Error("stale-reminder");
  return state;
}
