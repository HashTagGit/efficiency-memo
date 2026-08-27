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
} from "./types";

interface ReminderRow {
  kind: ReminderKind;
  enabled: number;
  interval_minutes: number;
  next_due_at: string | null;
  pending_at: string | null;
  muted_until: string | null;
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
}

export async function loadPauseHydrateState(
  userId: string,
  now = new Date(),
): Promise<PauseHydrateState> {
  await ensureReminderRows(userId, now);
  const [reminderRows, countRows, eventRows, activeRows] = await Promise.all([
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
  };
}

export async function saveReminderPreferences(
  userId: string,
  preferences: ReminderPreferenceInput[],
  now = new Date(),
): Promise<boolean> {
  return invoke<boolean>("save_pause_hydrate_preferences", {
    input: {
      user_id: userId,
      updated_at: now.toISOString(),
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
  return invoke<ReminderKind[]>("claim_pause_hydrate_reminders", {
    userId,
    now: now.toISOString(),
  });
}
