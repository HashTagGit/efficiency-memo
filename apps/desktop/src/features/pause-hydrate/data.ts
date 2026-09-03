import { invoke } from "@tauri-apps/api/core";
import { dbExecute, dbSelect } from "../../lib/db";
import {
  BUILTIN_CHINA_CALENDAR_2026,
  DEFAULT_INTERVALS,
  DEFAULT_WEEKDAY_SCHEDULES,
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
  type HolidayCalendar,
  type SchedulePolicy,
  type WeekdaySchedule,
} from "./types";

export const DEFAULT_SCHEDULE_POLICY: SchedulePolicy = {
  activeWeekdays: [0, 1, 2, 3, 4],
  weekdaySchedules: DEFAULT_WEEKDAY_SCHEDULES.map((schedule) => ({
    workWindows: schedule.workWindows.map((window) => ({ ...window })),
    quietWindows: schedule.quietWindows.map((window) => ({ ...window })),
  })),
  calendarEnabled: true,
  calendarYear: new Date().getFullYear(),
  calendarAvailable: new Date().getFullYear() === 2026,
  calendarData: new Date().getFullYear() === 2026 ? BUILTIN_CHINA_CALENDAR_2026 : null,
  naturalBreakEnabled: false,
  naturalBreakMinutes: 5,
  systemDeferralEnabled: true,
  deferralGraceMinutes: 5,
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
  natural_break_enabled: number;
  natural_break_minutes: number;
  system_deferral_enabled: number;
  deferral_grace_minutes: number;
  system_deferred: number;
  system_deferral_until: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

function weekdayMask(activeWeekdays: number[]): number {
  return activeWeekdays.reduce((mask, weekday) => mask | (1 << weekday), 0);
}

function parseSchedules(value: string | undefined, row: SchedulePolicyRow | undefined): WeekdaySchedule[] {
  if (value) {
    try {
      const parsed = JSON.parse(value) as WeekdaySchedule[];
      if (Array.isArray(parsed) && parsed.length === 7) return parsed;
    } catch {
      // Legacy rows are mapped below.
    }
  }
  const legacyQuiet = row?.quiet_enabled ? [{
    startMinute: Number(row.quiet_start_minute),
    endMinute: Number(row.quiet_end_minute),
  }] : [];
  return DEFAULT_WEEKDAY_SCHEDULES.map(() => ({
    workWindows: [{ startMinute: Number(row?.work_start_minute ?? 540), endMinute: Number(row?.work_end_minute ?? 1080) }],
    quietWindows: legacyQuiet.map((window) => ({ ...window })),
  }));
}

function mapSchedulePolicy(row: SchedulePolicyRow | undefined, settings: SettingRow[] = []): SchedulePolicy {
  if (!row) return DEFAULT_SCHEDULE_POLICY;
  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const calendarEnabled = settingMap.has("pause_hydrate.calendar_enabled")
    ? settingMap.get("pause_hydrate.calendar_enabled") === "1"
    : settingMap.get("pause_hydrate.china_calendar_2026") !== "0";
  const calendarYear = Number(settingMap.get("pause_hydrate.calendar_year")) || new Date().getFullYear();
  let calendarData: HolidayCalendar | null = null;
  const calendarText = settingMap.get(`pause_hydrate.calendar.${calendarYear}`);
  if (calendarText) {
    try {
      calendarData = JSON.parse(calendarText) as HolidayCalendar;
    } catch {
      calendarData = null;
    }
  } else if (calendarYear === 2026) {
    calendarData = BUILTIN_CHINA_CALENDAR_2026;
  }
  return {
    activeWeekdays: Array.from({ length: 7 }, (_, weekday) => weekday)
      .filter((weekday) => (row.active_weekdays_mask & (1 << weekday)) !== 0),
    weekdaySchedules: parseSchedules(settingMap.get("pause_hydrate.weekday_schedules"), row),
    calendarEnabled,
    calendarYear,
    calendarAvailable: calendarData?.year === calendarYear,
    calendarData,
    naturalBreakEnabled: Boolean(row.natural_break_enabled),
    naturalBreakMinutes: Number(row.natural_break_minutes),
    systemDeferralEnabled: Boolean(row.system_deferral_enabled),
    deferralGraceMinutes: Number(row.deferral_grace_minutes),
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
    "INSERT OR IGNORE INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at, natural_break_enabled, natural_break_minutes, system_deferral_enabled, deferral_grace_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
    [
      userId,
      weekdayMask(DEFAULT_SCHEDULE_POLICY.activeWeekdays),
      DEFAULT_WEEKDAY_SCHEDULES[0].workWindows[0].startMinute,
      DEFAULT_WEEKDAY_SCHEDULES[0].workWindows[0].endMinute,
      false,
      1320,
      420,
      now.toISOString(),
      DEFAULT_SCHEDULE_POLICY.naturalBreakEnabled,
      DEFAULT_SCHEDULE_POLICY.naturalBreakMinutes,
      DEFAULT_SCHEDULE_POLICY.systemDeferralEnabled,
      DEFAULT_SCHEDULE_POLICY.deferralGraceMinutes,
    ],
  );
  await dbExecute(
    "INSERT OR IGNORE INTO ch_settings (key, value) VALUES ('pause_hydrate.calendar_year', $1)",
    [String(now.getFullYear())],
  );
}

export async function loadPauseHydrateState(
  userId: string,
  now = new Date(),
): Promise<PauseHydrateState> {
  await ensureReminderRows(userId, now);
  const [reminderRows, countRows, eventRows, activeRows, policyRows, settings] = await Promise.all([
    dbSelect<ReminderRow>(
      "SELECT kind, enabled, interval_minutes, next_due_at, pending_at, muted_until FROM ph_reminders WHERE user_id = $1 ORDER BY kind",
      [userId],
    ),
    dbSelect<{ kind: ReminderKind; total: number | string }>(
      "SELECT kind, COUNT(*) AS total FROM ph_reminder_events WHERE user_id = $1 AND action = 'completed' AND date(occurred_at, 'localtime') = date($2, 'localtime') GROUP BY kind",
      [userId, now.toISOString()],
    ),
    dbSelect<{ id: string; kind: ReminderKind; action: ReminderAction; source: "manual" | "natural"; occurred_at: string }>(
      "SELECT id, kind, action, source, occurred_at FROM ph_reminder_events WHERE user_id = $1 AND date(occurred_at, 'localtime') = date($2, 'localtime') ORDER BY occurred_at DESC",
      [userId, now.toISOString()],
    ),
    dbSelect<{ active: number }>(
      "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = $1 AND ended_at IS NULL) AS active",
      [userId],
    ),
    dbSelect<SchedulePolicyRow>(
      "SELECT active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, natural_break_enabled, natural_break_minutes, system_deferral_enabled, deferral_grace_minutes, system_deferred, system_deferral_until FROM ph_schedule_policies WHERE user_id = $1",
      [userId],
    ),
    dbSelect<SettingRow>("SELECT key, value FROM ch_settings WHERE key LIKE 'pause_hydrate.%'"),
  ]);
  const reminders = Object.fromEntries(reminderRows.map((row) => [row.kind, mapReminder(row)])) as Record<ReminderKind, ReminderState>;
  const completedToday = { break: 0, hydration: 0 };
  for (const row of countRows) completedToday[row.kind] = Number(row.total);
  const todayEvents: ReminderEvent[] = eventRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    action: row.action,
    source: row.source,
    occurredAt: row.occurred_at,
  }));
  return {
    reminders,
    completedToday,
    todayEvents,
    coreHourActive: Boolean(activeRows[0]?.active),
    systemDeferred: Boolean(policyRows[0]?.system_deferred),
    systemDeferralUntil: policyRows[0]?.system_deferral_until ?? null,
    schedulePolicy: mapSchedulePolicy(policyRows[0], settings),
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
        weekday_schedules: policy.weekdaySchedules,
        calendar_enabled: policy.calendarEnabled,
        calendar_year: policy.calendarYear,
        work_start_minute: policy.weekdaySchedules[0]?.workWindows[0]?.startMinute ?? 540,
        work_end_minute: policy.weekdaySchedules[0]?.workWindows[0]?.endMinute ?? 1080,
        quiet_enabled: policy.weekdaySchedules.some((schedule) => schedule.quietWindows.length > 0),
        quiet_start_minute: policy.weekdaySchedules[0]?.quietWindows[0]?.startMinute ?? 1320,
        quiet_end_minute: policy.weekdaySchedules[0]?.quietWindows[0]?.endMinute ?? 420,
        natural_break_enabled: policy.naturalBreakEnabled,
        natural_break_minutes: policy.naturalBreakMinutes,
        system_deferral_enabled: policy.systemDeferralEnabled,
        deferral_grace_minutes: policy.deferralGraceMinutes,
      },
      preferences: preferences.map((preference) => {
        const interval = normalizeReminderInterval(preference.kind, preference.intervalMinutes);
        return {
          kind: preference.kind,
          enabled: preference.enabled,
          interval_minutes: interval,
          next_due_at: preference.enabled ? nextDueAt(now, interval, policy).toISOString() : null,
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
  const schedule = (await loadPauseHydrateState(userId, now)).schedulePolicy;
  const next = action === "snoozed"
    ? nextDueAt(now, 10, schedule)
    : action === "muted"
      ? nextDueAt(tomorrowStart(now), interval, schedule)
      : nextDueAt(now, interval, schedule);
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
  notificationsAllowed: boolean | null = null,
): Promise<ReminderKind[]> {
  await ensureReminderRows(userId, now);
  const weekday = (now.getDay() + 6) % 7;
  return invoke<ReminderKind[]>("claim_pause_hydrate_reminders", {
    userId,
    now: now.toISOString(),
    localDate: isoLocalDate(now),
    weekday,
    minuteOfDay: now.getHours() * 60 + now.getMinutes(),
    notificationsAllowed,
  });
}

function isoLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function completeNaturalBreak(
  userId: string,
  idleSeconds: number,
  now = new Date(),
): Promise<boolean> {
  const weekday = (now.getDay() + 6) % 7;
  return invoke<boolean>("complete_natural_break", {
    input: {
      user_id: userId,
      event_id: crypto.randomUUID(),
      occurred_at: now.toISOString(),
      idle_started_at: new Date(now.getTime() - idleSeconds * 1000).toISOString(),
      idle_seconds: Math.max(0, Math.floor(idleSeconds)),
      weekday,
      minute_of_day: now.getHours() * 60 + now.getMinutes(),
    },
    localDate: isoLocalDate(now),
  });
}
