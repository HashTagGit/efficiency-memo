import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { dbSelect } from "./db";

export type HumanExportScope = "core-hour" | "pause-hydrate";

interface SessionExportRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  interval_minutes: number;
  elapsed_seconds: number;
  activity: string;
  default_tag_id: string | null;
  is_favorite: number;
}

interface PlanExportRow {
  id: string;
  title: string;
  tag_id: string | null;
  started_at: string;
  ended_at: string;
  status: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TagExportRow {
  id: string;
  name: string;
  color: string;
  is_archived: number;
  created_at: string;
}

interface CheckInExportRow {
  id: string;
  session_id: string;
  checked_at: string;
  skipped: number;
  note: string;
  duration_seconds: number;
}

interface CheckInEntryExportRow {
  id: string;
  check_in_id: string;
  tag_id: string;
  percentage: number;
}

interface SettingExportRow {
  key: string;
  value: string;
}

interface ActivityAssistPreferencesExportRow {
  enabled: number;
  paused: number;
  retention_hours: number;
  updated_at: string;
}

interface ActivityExclusionExportRow {
  application_id: string;
  created_at: string;
}

interface ActivityRuleExportRow {
  application_id: string;
  activity: string;
  default_tag_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyReviewExportRow {
  id: string;
  local_date: string;
  outcome: string;
  next_goal_minutes: number;
  created_at: string;
  updated_at: string;
}

interface WeeklyReviewExportRow {
  id: string;
  week_started_on: string;
  outcome: string;
  next_goal_minutes: number;
  created_at: string;
  updated_at: string;
}

interface ReminderExportRow {
  kind: string;
  enabled: number;
  interval_minutes: number;
  next_due_at: string | null;
  pending_at: string | null;
  muted_until: string | null;
  updated_at: string;
}

interface ReminderEventExportRow {
  id: string;
  kind: string;
  action: string;
  occurred_at: string;
  source: string;
}

interface SchedulePolicyExportRow {
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
  updated_at: string;
}

interface CoreHourExportData {
  sessions: SessionExportRow[];
  plans: PlanExportRow[];
  tags: TagExportRow[];
  checkIns: CheckInExportRow[];
  entries: CheckInEntryExportRow[];
  settings: SettingExportRow[];
  activityAssist: {
    preferences: ActivityAssistPreferencesExportRow | null;
    exclusions: ActivityExclusionExportRow[];
    rules: ActivityRuleExportRow[];
  };
  dailyReviews: DailyReviewExportRow[];
  weeklyReviews: WeeklyReviewExportRow[];
}

interface PauseHydrateExportData {
  reminders: ReminderExportRow[];
  events: ReminderEventExportRow[];
  schedulePolicy: SchedulePolicyExportRow | null;
}

interface HumanExport<TData extends object> {
  format: "efficiency-memo-human-export";
  version: 1;
  module: HumanExportScope;
  exportedAt: string;
  restorable: false;
  data: TData;
}

export function humanExportFilename(scope: HumanExportScope, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return "EfficiencyMemo-" + scope + "-" + day + ".json";
}

export function serializeHumanExport<TData extends object>(
  scope: HumanExportScope,
  data: TData,
  exportedAt = new Date().toISOString(),
): string {
  const document: HumanExport<TData> = {
    format: "efficiency-memo-human-export",
    version: 1,
    module: scope,
    exportedAt,
    restorable: false,
    data,
  };
  return JSON.stringify(document, null, 2);
}

async function loadCoreHourData(userId: string): Promise<CoreHourExportData> {
  const [active] = await dbSelect<{ active: number }>(
    "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = $1 AND ended_at IS NULL) AS active",
    [userId],
  );
  if (Number(active?.active) !== 0) throw new Error("active-session");
  const [sessions, plans, tags, checkIns, entries, settings, assistPreferences, exclusions, rules, dailyReviews, weeklyReviews] = await Promise.all([
    dbSelect<SessionExportRow>("SELECT id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite FROM ch_sessions WHERE user_id = $1 ORDER BY started_at", [userId]),
    dbSelect<PlanExportRow>("SELECT id, title, tag_id, started_at, ended_at, status, session_id, created_at, updated_at FROM ch_plans WHERE user_id = $1 ORDER BY started_at", [userId]),
    dbSelect<TagExportRow>("SELECT id, name, color, is_archived, created_at FROM ch_tags WHERE user_id = $1 ORDER BY created_at", [userId]),
    dbSelect<CheckInExportRow>("SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id WHERE s.user_id = $1 ORDER BY ci.checked_at", [userId]),
    dbSelect<CheckInEntryExportRow>("SELECT e.id, e.check_in_id, e.tag_id, e.percentage FROM ch_check_in_entries e JOIN ch_check_ins ci ON ci.id = e.check_in_id JOIN ch_sessions s ON s.id = ci.session_id WHERE s.user_id = $1 ORDER BY ci.checked_at", [userId]),
    dbSelect<SettingExportRow>("SELECT key, value FROM ch_settings ORDER BY key"),
    dbSelect<ActivityAssistPreferencesExportRow>("SELECT enabled, paused, retention_hours, updated_at FROM aa_preferences WHERE user_id = $1", [userId]),
    dbSelect<ActivityExclusionExportRow>("SELECT application_id, created_at FROM aa_exclusions WHERE user_id = $1 ORDER BY application_id", [userId]),
    dbSelect<ActivityRuleExportRow>("SELECT application_id, activity, default_tag_id, created_at, updated_at FROM aa_activity_rules WHERE user_id = $1 ORDER BY application_id", [userId]),
    dbSelect<DailyReviewExportRow>("SELECT id, local_date, outcome, next_goal_minutes, created_at, updated_at FROM ch_daily_reviews WHERE user_id = $1 ORDER BY local_date", [userId]),
    dbSelect<WeeklyReviewExportRow>("SELECT id, week_started_on, outcome, next_goal_minutes, created_at, updated_at FROM ch_weekly_reviews WHERE user_id = $1 ORDER BY week_started_on", [userId]),
  ]);
  return {
    sessions,
    plans,
    tags,
    checkIns,
    entries,
    settings,
    activityAssist: { preferences: assistPreferences[0] ?? null, exclusions, rules },
    dailyReviews,
    weeklyReviews,
  };
}

async function loadPauseHydrateData(userId: string): Promise<PauseHydrateExportData> {
  const [reminders, events, policies] = await Promise.all([
    dbSelect<ReminderExportRow>("SELECT kind, enabled, interval_minutes, next_due_at, pending_at, muted_until, updated_at FROM ph_reminders WHERE user_id = $1 ORDER BY kind", [userId]),
    dbSelect<ReminderEventExportRow>("SELECT id, kind, action, occurred_at, source FROM ph_reminder_events WHERE user_id = $1 ORDER BY occurred_at", [userId]),
    dbSelect<SchedulePolicyExportRow>("SELECT active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, natural_break_enabled, natural_break_minutes, system_deferral_enabled, deferral_grace_minutes, updated_at FROM ph_schedule_policies WHERE user_id = $1", [userId]),
  ]);
  return { reminders, events, schedulePolicy: policies[0] ?? null };
}

export async function saveHumanExport(scope: HumanExportScope, userId: string): Promise<boolean> {
  const path = await save({
    defaultPath: humanExportFilename(scope),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return false;
  const data = scope === "core-hour"
    ? await loadCoreHourData(userId)
    : await loadPauseHydrateData(userId);
  await writeTextFile(path, serializeHumanExport(scope, data));
  return true;
}
