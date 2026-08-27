import { invoke } from "@tauri-apps/api/core";
import { dbExecute, dbSelect } from "../../lib/db";
import {
  DEFAULT_INTERVALS,
  nextDueAt,
  normalizeReminderInterval,
  tomorrowStart,
} from "./reminder-logic";
import {
  REMINDER_KINDS,
  type PauseHydrateState,
  type ReminderAction,
  type ReminderEvent,
  type ReminderKind,
  type ReminderPreferenceInput,
  type ReminderState,
  type SchedulePolicy,
} from "./types";

export const DEFAULT_SCHEDULE_POLICY: SchedulePolicy = {
  activeWeekdays: [0, 1, 2, 3, 4],
  workStartMinute: 9 * 60,
  workEndMinute: 18 * 60,
  quietEnabled: false,
  quietStartMinute: 22 * 60,
  quietEndMinute: 7 * 60,
};

interface ReminderRow {
  kind: ReminderKind;
  enabled: number;
  interval_minutes: number;
  next_due_at: string | null;
  pending_at: string | null;
  muted_until: string | null;
}

interface SchedulePolicyRow {
  active_weekdays_mask: number;
  work_start_minute: number;
  work_end_minute: number;
  quiet_enabled: number;
  quiet_start_minute: number;
  quiet_end_minute: number;
}

function weekdayMask(activeWeekdays: number[]): number {
  return activeWeekdays.reduce((mask, weekday) => mask | (1 << weekday), 0);
}

function mapSchedulePolicy(row: SchedulePolicyRow | undefined): SchedulePolicy {
  if (!row) return DEFAULT_SCHEDULE_POLICY;
  return {
    activeWeekdays: Array.from({ length: 7 }, (_, weekday) => weekday)
      .filter((weekday) => (row.active_weekdays_mask & (1 << weekday)) !== 0),
    workStartMinute: Number(row.work_start_minute),
    workEndMinute: Number(row.work_end_minute),
    quietEnabled: Boolean(row.quiet_enabled),
    quietStartMinute: Number(row.quiet_start_minute),
    quietEndMinute: Number(row.quiet_end_minute),
  };
}

function mapReminder(row: ReminderRow): ReminderState {
  return {
    kind: row.kind,
    enabled: Boolean(row.enabled),
    intervalMinutes: Number(row.interval_minutes),
    nextDueAt: row.next_due_at,
    pendingAt: row.pending_at,
    mutedUntil: row.muted_until,
  };
}

async function ensureReminderRows(userId: string, now: Date): Promise<void> {
  for (const kind of REMINDER_KINDS) {
    await dbExecute(
      "INSERT OR IGNORE INTO ph_reminders (user_id, kind, enabled, interval_minutes, next_due_at, pending_at, muted_until, updated_at) VALUES ($1, $2, 0, $3, NULL, NULL, NULL, $4)",
      [userId, kind, DEFAULT_INTERVALS[kind], now.toISOString()],
    );
  }
  await dbExecute(
    "INSERT OR IGNORE INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      userId,
      weekdayMask(DEFAULT_SCHEDULE_POLICY.activeWeekdays),
      DEFAULT_SCHEDULE_POLICY.workStartMinute,
      DEFAULT_SCHEDULE_POLICY.workEndMinute,
      DEFAULT_SCHEDULE_POLICY.quietEnabled,
      DEFAULT_SCHEDULE_POLICY.quietStartMinute,
      DEFAULT_SCHEDULE_POLICY.quietEndMinute,
      now.toISOString(),
    ],
  );
}

export async function loadPauseHydrateState(
  userId: string,
  now = new Date(),
): Promise<PauseHydrateState> {
  await ensureReminderRows(userId, now);
  const [reminderRows, countRows, eventRows, activeRows, policyRows] = await Promise.all([
    dbSelect<ReminderRow>(
      "SELECT kind, enabled, interval_minutes, next_due_at, pending_at, muted_until FROM ph_reminders WHERE user_id = $1 ORDER BY kind",
      [userId],
    ),
    dbSelect<{ kind: ReminderKind; total: number | string }>(
      "SELECT kind, COUNT(*) AS total FROM ph_reminder_events WHERE user_id = $1 AND action = 'completed' AND date(occurred_at, 'localtime') = date($2, 'localtime') GROUP BY kind",
      [userId, now.toISOString()],
    ),
    dbSelect<{ id: string; kind: ReminderKind; action: ReminderAction; occurred_at: string }>(
      "SELECT id, kind, action, occurred_at FROM ph_reminder_events WHERE user_id = $1 AND date(occurred_at, 'localtime') = date($2, 'localtime') ORDER BY occurred_at DESC",
      [userId, now.toISOString()],
    ),
    dbSelect<{ active: number }>(
      "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = $1 AND ended_at IS NULL) AS active",
      [userId],
    ),
    dbSelect<SchedulePolicyRow>(
      "SELECT active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute FROM ph_schedule_policies WHERE user_id = $1",
      [userId],
    ),
  ]);
  const reminders = Object.fromEntries(reminderRows.map((row) => [row.kind, mapReminder(row)])) as Record<ReminderKind, ReminderState>;
  const completedToday = { break: 0, hydration: 0 };
  for (const row of countRows) completedToday[row.kind] = Number(row.total);
  const todayEvents: ReminderEvent[] = eventRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    action: row.action,
    occurredAt: row.occurred_at,
  }));
  return {
    reminders,
    completedToday,
    todayEvents,
    coreHourActive: Boolean(activeRows[0]?.active),
    schedulePolicy: mapSchedulePolicy(policyRows[0]),
  };
}

export async function saveReminderPreferences(
  userId: string,
  preferences: ReminderPreferenceInput[],
  policy: SchedulePolicy,
  now = new Date(),
): Promise<boolean> {
  return invoke<boolean>("save_pause_hydrate_preferences", {
    input: {
      user_id: userId,
      updated_at: now.toISOString(),
      policy: {
        active_weekdays_mask: weekdayMask(policy.activeWeekdays),
        work_start_minute: policy.workStartMinute,
        work_end_minute: policy.workEndMinute,
        quiet_enabled: policy.quietEnabled,
        quiet_start_minute: policy.quietStartMinute,
        quiet_end_minute: policy.quietEndMinute,
      },
      preferences: preferences.map((preference) => {
        const interval = normalizeReminderInterval(preference.kind, preference.intervalMinutes);
        return {
          kind: preference.kind,
          enabled: preference.enabled,
          interval_minutes: interval,
          next_due_at: preference.enabled ? nextDueAt(now, interval).toISOString() : null,
        };
      }),
    },
  });
}

export async function actOnReminder(
  userId: string,
  kind: ReminderKind,
  action: ReminderAction,
  now = new Date(),
): Promise<void> {
  const [row] = await dbSelect<ReminderRow>(
    "SELECT kind, enabled, interval_minutes, next_due_at, pending_at, muted_until FROM ph_reminders WHERE user_id = $1 AND kind = $2",
    [userId, kind],
  );
  if (!row || !row.enabled) return;
  const interval = normalizeReminderInterval(kind, row.interval_minutes);
  const next = action === "snoozed"
    ? nextDueAt(now, 10)
    : action === "muted"
      ? nextDueAt(tomorrowStart(now), interval)
      : nextDueAt(now, interval);
  await invoke("act_on_pause_hydrate_reminder", {
    input: {
      user_id: userId,
      kind,
      action,
      event_id: crypto.randomUUID(),
      occurred_at: now.toISOString(),
      next_due_at: next.toISOString(),
      muted_until: action === "muted" ? tomorrowStart(now).toISOString() : null,
    },
  });
}

export async function markNewPendingReminders(
  userId: string,
  now = new Date(),
): Promise<ReminderKind[]> {
  await ensureReminderRows(userId, now);
  const weekday = (now.getDay() + 6) % 7;
  return invoke<ReminderKind[]>("claim_pause_hydrate_reminders", {
    userId,
    now: now.toISOString(),
    weekday,
    minuteOfDay: now.getHours() * 60 + now.getMinutes(),
  });
}
