use crate::local_schedule::minute_in_window;
use chrono::{DateTime, Datelike, Duration, FixedOffset, NaiveDate, SecondsFormat, Timelike, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "efficiency-memo.db";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct ReminderWindow {
    start_minute: i64,
    end_minute: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct WeekdaySchedule {
    work_windows: Vec<ReminderWindow>,
    quiet_windows: Vec<ReminderWindow>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct HolidayCalendar {
    year: i64,
    holidays: Vec<String>,
    workdays: Vec<String>,
}

fn default_weekday_schedules() -> Vec<WeekdaySchedule> {
    (0..7)
        .map(|_| WeekdaySchedule {
            work_windows: vec![ReminderWindow { start_minute: 540, end_minute: 1080 }],
            quiet_windows: Vec::new(),
        })
        .collect()
}

#[derive(Deserialize)]
pub(crate) struct ReminderPreferenceInput {
    kind: String,
    enabled: bool,
    interval_minutes: i64,
    next_due_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct SchedulePolicyInput {
    active_weekdays_mask: i64,
    #[serde(default = "default_weekday_schedules")]
    weekday_schedules: Vec<WeekdaySchedule>,
    #[serde(default)]
    calendar_year: i64,
    #[serde(default)]
    timezone_offset_minutes: i64,
    #[serde(default = "default_calendar_enabled")]
    calendar_enabled: bool,
    #[serde(skip)]
    calendar: Option<HolidayCalendar>,
    work_start_minute: i64,
    work_end_minute: i64,
    quiet_enabled: bool,
    quiet_start_minute: i64,
    quiet_end_minute: i64,
    natural_break_enabled: bool,
    natural_break_minutes: i64,
    system_deferral_enabled: bool,
    deferral_grace_minutes: i64,
    #[serde(default)]
    system_deferred: bool,
    #[serde(default)]
    system_deferral_until: Option<String>,
}

impl Default for SchedulePolicyInput {
    fn default() -> Self {
        Self {
            active_weekdays_mask: 31,
            weekday_schedules: default_weekday_schedules(),
            calendar_year: 0,
            timezone_offset_minutes: 0,
            calendar_enabled: true,
            calendar: None,
            work_start_minute: 540,
            work_end_minute: 1080,
            quiet_enabled: false,
            quiet_start_minute: 1320,
            quiet_end_minute: 420,
            natural_break_enabled: false,
            natural_break_minutes: 5,
            system_deferral_enabled: true,
            deferral_grace_minutes: 5,
            system_deferred: false,
            system_deferral_until: None,
        }
    }
}

fn default_calendar_enabled() -> bool {
    true
}

#[derive(Deserialize)]
pub(crate) struct SavePreferencesInput {
    user_id: String,
    updated_at: String,
    preferences: Vec<ReminderPreferenceInput>,
    policy: SchedulePolicyInput,
}

#[derive(Deserialize)]
pub(crate) struct ReminderActionInput {
    user_id: String,
    kind: String,
    action: String,
    event_id: String,
    occurred_at: String,
    next_due_at: String,
    muted_until: Option<String>,
    #[serde(default)]
    timezone_offset_minutes: i64,
}

#[derive(Deserialize)]
pub(crate) struct NaturalBreakInput {
    user_id: String,
    event_id: String,
    occurred_at: String,
    idle_started_at: String,
    idle_seconds: u64,
    weekday: i64,
    minute_of_day: i64,
    #[serde(default)]
    timezone_offset_minutes: i64,
}

fn valid_kind(kind: &str) -> bool {
    matches!(kind, "break" | "hydration")
}

fn schedule_policy_changed(previous: &SchedulePolicyInput, next: &SchedulePolicyInput) -> bool {
    previous.active_weekdays_mask != next.active_weekdays_mask
        || previous.weekday_schedules != next.weekday_schedules
        || previous.calendar_year != next.calendar_year
        || previous.calendar_enabled != next.calendar_enabled
        || previous.timezone_offset_minutes != next.timezone_offset_minutes
        || previous.work_start_minute != next.work_start_minute
        || previous.work_end_minute != next.work_end_minute
        || previous.quiet_enabled != next.quiet_enabled
        || previous.quiet_start_minute != next.quiet_start_minute
        || previous.quiet_end_minute != next.quiet_end_minute
}

fn work_minute_in_window(minute: i64, start: i64, end: i64) -> bool {
    if start < end {
        minute > start && minute < end
    } else {
        minute > start || minute < end
    }
}

fn quiet_boundary_at(
    policy: &SchedulePolicyInput,
    weekday: i64,
    minute_of_day: i64,
) -> bool {
    let current = &policy.weekday_schedules[weekday as usize].quiet_windows;
    let previous = &policy.weekday_schedules[((weekday + 6) % 7) as usize].quiet_windows;
    current
        .iter()
        .any(|window| {
            minute_of_day == window.start_minute
                || (window.start_minute < window.end_minute && minute_of_day == window.end_minute)
        })
        || previous
            .iter()
            .any(|window| window.start_minute > window.end_minute && minute_of_day == window.end_minute)
}

fn scheduled_minute_allows(
    policy: &SchedulePolicyInput,
    weekday: i64,
    minute_of_day: i64,
) -> bool {
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return false;
    }
    let configured_schedules = policy.weekday_schedules.len() == 7;
    if !configured_schedules {
        return work_minute_in_window(
            minute_of_day,
            policy.work_start_minute,
            policy.work_end_minute,
        ) && !(policy.quiet_enabled
            && minute_in_window(
                minute_of_day,
                policy.quiet_start_minute,
                policy.quiet_end_minute,
            ))
            && !(policy.quiet_enabled
                && (minute_of_day == policy.quiet_start_minute
                    || minute_of_day == policy.quiet_end_minute));
    }
    let schedule = &policy.weekday_schedules[weekday as usize];
    let previous = &policy.weekday_schedules[((weekday + 6) % 7) as usize];
    let working = schedule.work_windows.iter().any(|window| {
        work_minute_in_window(minute_of_day, window.start_minute, window.end_minute)
    });
    let quiet = schedule.quiet_windows.iter().any(|window| {
        if window.start_minute < window.end_minute {
            minute_in_window(minute_of_day, window.start_minute, window.end_minute)
        } else {
            minute_of_day >= window.start_minute
        }
    }) || previous.quiet_windows.iter().any(|window| {
        window.start_minute > window.end_minute && minute_of_day < window.end_minute
    });
    working && !quiet && !quiet_boundary_at(policy, weekday, minute_of_day)
}

fn valid_policy(policy: &SchedulePolicyInput) -> bool {
    let valid_windows = |windows: &[ReminderWindow], allow_overnight: bool| {
        windows.iter().all(|window| {
            (0..=1439).contains(&window.start_minute)
                && (0..=1439).contains(&window.end_minute)
                && window.start_minute != window.end_minute
                && (allow_overnight || window.start_minute < window.end_minute)
        })
    };
    let has_available_time = (0..7).any(|weekday| {
        policy.active_weekdays_mask & (1 << weekday) != 0
            && (0..1440).any(|minute| scheduled_minute_allows(policy, weekday, minute))
    });
    (1..=127).contains(&policy.active_weekdays_mask)
        && (policy.weekday_schedules.is_empty() || policy.weekday_schedules.len() == 7)
        && policy.weekday_schedules.iter().all(|schedule| {
            valid_windows(&schedule.work_windows, false) && valid_windows(&schedule.quiet_windows, true)
                && !schedule.work_windows.is_empty()
        })
        && (policy.calendar_year == 0 || (2000..=9999).contains(&policy.calendar_year))
        && (-840..=840).contains(&policy.timezone_offset_minutes)
        && (0..=1438).contains(&policy.work_start_minute)
        && (1..=1439).contains(&policy.work_end_minute)
        && policy.work_start_minute < policy.work_end_minute
        && (0..=1439).contains(&policy.quiet_start_minute)
        && (0..=1439).contains(&policy.quiet_end_minute)
        && policy.quiet_start_minute != policy.quiet_end_minute
        && (2..=30).contains(&policy.natural_break_minutes)
        && (1..=30).contains(&policy.deferral_grace_minutes)
        && has_available_time
}

fn normalize_due_at(
    policy: &SchedulePolicyInput,
    due: DateTime<chrono::FixedOffset>,
    timezone_offset_minutes: i64,
) -> DateTime<chrono::FixedOffset> {
    let timezone = FixedOffset::east_opt((timezone_offset_minutes * 60) as i32)
        .unwrap_or_else(|| *due.offset());
    for offset in 0..=14 * 24 * 60 {
        let candidate = due + Duration::minutes(offset);
        let local = candidate.with_timezone(&timezone);
        let local_date = local.date_naive().to_string();
        let weekday = local.weekday().num_days_from_monday() as i64;
        let minute = (local.hour() * 60 + local.minute()) as i64;
        if schedule_allows(policy, &local_date, weekday, minute) {
            return candidate;
        }
    }
    due
}

const CHINA_HOLIDAYS_2026: &[&str] = &[
    "2026-01-01", "2026-01-02", "2026-01-03",
    "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19",
    "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
    "2026-04-04", "2026-04-05", "2026-04-06",
    "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-06-19", "2026-06-20", "2026-06-21",
    "2026-09-25", "2026-09-26", "2026-09-27",
    "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05",
    "2026-10-06", "2026-10-07",
];

const CHINA_WORKDAYS_2026: &[&str] = &[
    "2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10",
];

fn builtin_calendar(year: i64) -> Option<HolidayCalendar> {
    (year == 2026).then(|| HolidayCalendar {
        year,
        holidays: CHINA_HOLIDAYS_2026.iter().map(|value| (*value).to_string()).collect(),
        workdays: CHINA_WORKDAYS_2026.iter().map(|value| (*value).to_string()).collect(),
    })
}

fn schedule_allows(
    policy: &SchedulePolicyInput,
    local_date: &str,
    weekday: i64,
    minute_of_day: i64,
) -> bool {
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return false;
    }
    let calendar_active = policy.calendar_enabled && policy.calendar_year > 0
        && local_date.starts_with(&format!("{}-", policy.calendar_year));
    let holiday = policy
        .calendar
        .as_ref()
        .is_some_and(|calendar| calendar.holidays.iter().any(|date| date == local_date))
        || (calendar_active && policy.calendar_year == 2026 && CHINA_HOLIDAYS_2026.contains(&local_date));
    if calendar_active && holiday {
        return false;
    }
    let workday = calendar_active
        && policy
            .calendar
            .as_ref()
            .is_some_and(|calendar| calendar.workdays.iter().any(|date| date == local_date))
        || (calendar_active && policy.calendar_year == 2026 && CHINA_WORKDAYS_2026.contains(&local_date));
    let active_day = workday || policy.active_weekdays_mask & (1 << weekday) != 0;
    active_day && scheduled_minute_allows(policy, weekday, minute_of_day)
}

pub(crate) fn schedule_quiet_at(
    connection: &Connection,
    user_id: &str,
    weekday: i64,
    minute_of_day: i64,
) -> Result<bool, String> {
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return Err("invalid-local-time".to_string());
    }
    let settings = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.weekday_schedules'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| serde_json::from_str::<Vec<WeekdaySchedule>>(&value).ok())
        .filter(|value| value.len() == 7);
    if let Some(schedules) = settings {
        let current = schedules[weekday as usize].quiet_windows.as_slice();
        let previous = schedules[((weekday + 6) % 7) as usize].quiet_windows.as_slice();
        return Ok(current.iter().any(|window| if window.start_minute < window.end_minute {
            minute_in_window(minute_of_day, window.start_minute, window.end_minute)
        } else {
            minute_of_day >= window.start_minute
        }) || previous.iter().any(|window| {
            window.start_minute > window.end_minute && minute_of_day < window.end_minute
        }));
    }
    let legacy = connection
        .query_row(
            "SELECT quiet_enabled, quiet_start_minute, quiet_end_minute FROM ph_schedule_policies WHERE user_id = ?1",
            [user_id],
            |row| Ok((row.get::<_, bool>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    Ok(legacy.is_some_and(|(enabled, start, end)| {
        enabled && minute_in_window(minute_of_day, start, end)
    }))
}

fn load_policy(connection: &Connection, user_id: &str) -> Result<SchedulePolicyInput, String> {
    let calendar_year = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.calendar_year'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or_else(|| Utc::now().year() as i64);
    let calendar_enabled = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.calendar_enabled'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .map(|value| value == "1")
        .or_else(|| {
            connection
                .query_row(
                    "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.china_calendar_2026'",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .ok()
                .flatten()
                .map(|value| value == "1")
        })
        .unwrap_or(true);
    let timezone_offset_minutes = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.timezone_offset_minutes'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(0);
    let weekday_schedules = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'pause_hydrate.weekday_schedules'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| serde_json::from_str::<Vec<WeekdaySchedule>>(&value).ok())
        .filter(|value| value.len() == 7)
        .unwrap_or_default();
    let calendar = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = ?1",
            [format!("pause_hydrate.calendar.{calendar_year}")],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| serde_json::from_str::<HolidayCalendar>(&value).ok())
        .or_else(|| builtin_calendar(calendar_year));
    connection
        .query_row(
            "SELECT active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, natural_break_enabled, natural_break_minutes, system_deferral_enabled, deferral_grace_minutes, system_deferred, system_deferral_until FROM ph_schedule_policies WHERE user_id = ?1",
            [user_id],
            |row| {
                Ok(SchedulePolicyInput {
                    active_weekdays_mask: row.get(0)?,
                    weekday_schedules,
                    calendar_year,
                    calendar_enabled,
                    timezone_offset_minutes,
                    calendar,
                    work_start_minute: row.get(1)?,
                    work_end_minute: row.get(2)?,
                    quiet_enabled: row.get(3)?,
                    quiet_start_minute: row.get(4)?,
                    quiet_end_minute: row.get(5)?,
                    natural_break_enabled: row.get(6)?,
                    natural_break_minutes: row.get(7)?,
                    system_deferral_enabled: row.get(8)?,
                    deferral_grace_minutes: row.get(9)?,
                    system_deferred: row.get(10)?,
                    system_deferral_until: row.get(11)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())
        .map(|policy| policy.unwrap_or_default())
}

fn save_preferences(input: SavePreferencesInput, connection: &mut Connection) -> Result<bool, String> {
    if !valid_policy(&input.policy) {
        return Err("invalid-policy".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let previous_policy = load_policy(&transaction, &input.user_id)?;
    let schedule_changed = schedule_policy_changed(&previous_policy, &input.policy);
    let mut newly_enabled = false;
    for preference in input.preferences {
        if !valid_kind(&preference.kind)
            || preference.interval_minutes < 15
            || preference.interval_minutes > 240
            || preference.interval_minutes % 15 != 0
        {
            return Err("invalid-preference".to_string());
        }
        let existing = transaction
            .query_row(
                "SELECT enabled, interval_minutes FROM ph_reminders WHERE user_id = ?1 AND kind = ?2",
                params![input.user_id, preference.kind],
                |row| Ok((row.get::<_, bool>(0)?, row.get::<_, i64>(1)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        if existing == Some((preference.enabled, preference.interval_minutes)) && !schedule_changed {
            continue;
        }
        if existing == Some((preference.enabled, preference.interval_minutes)) {
            transaction
                .execute(
                    "UPDATE ph_reminders SET next_due_at = ?1, updated_at = ?2 WHERE user_id = ?3 AND kind = ?4",
                    params![preference.next_due_at, input.updated_at, input.user_id, preference.kind],
                )
                .map_err(|error| error.to_string())?;
            continue;
        }
        newly_enabled |= preference.enabled && !existing.map(|value| value.0).unwrap_or(false);
        transaction
            .execute(
                "INSERT INTO ph_reminders (user_id, kind, enabled, interval_minutes, next_due_at, pending_at, muted_until, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, ?6) ON CONFLICT(user_id, kind) DO UPDATE SET enabled = excluded.enabled, interval_minutes = excluded.interval_minutes, next_due_at = excluded.next_due_at, pending_at = NULL, muted_until = NULL, updated_at = excluded.updated_at",
                params![
                    input.user_id,
                    preference.kind,
                    preference.enabled,
                    preference.interval_minutes,
                    if preference.enabled { preference.next_due_at } else { None },
                    input.updated_at,
                ],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction
        .execute(
            "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at, natural_break_enabled, natural_break_minutes, system_deferral_enabled, deferral_grace_minutes, system_deferred, system_deferral_until) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, NULL) ON CONFLICT(user_id) DO UPDATE SET active_weekdays_mask = excluded.active_weekdays_mask, work_start_minute = excluded.work_start_minute, work_end_minute = excluded.work_end_minute, quiet_enabled = excluded.quiet_enabled, quiet_start_minute = excluded.quiet_start_minute, quiet_end_minute = excluded.quiet_end_minute, updated_at = excluded.updated_at, natural_break_enabled = excluded.natural_break_enabled, natural_break_minutes = excluded.natural_break_minutes, system_deferral_enabled = excluded.system_deferral_enabled, deferral_grace_minutes = excluded.deferral_grace_minutes, system_deferred = CASE WHEN excluded.system_deferral_enabled = 0 THEN 0 ELSE ph_schedule_policies.system_deferred END, system_deferral_until = CASE WHEN excluded.system_deferral_enabled = 0 THEN NULL ELSE ph_schedule_policies.system_deferral_until END",
            params![
                input.user_id,
                input.policy.active_weekdays_mask,
                input.policy.work_start_minute,
                input.policy.work_end_minute,
                input.policy.quiet_enabled,
                input.policy.quiet_start_minute,
                input.policy.quiet_end_minute,
                input.updated_at,
                input.policy.natural_break_enabled,
                input.policy.natural_break_minutes,
                input.policy.system_deferral_enabled,
                input.policy.deferral_grace_minutes,
            ],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.weekday_schedules', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [serde_json::to_string(&input.policy.weekday_schedules).map_err(|error| error.to_string())?],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.calendar_enabled', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [if input.policy.calendar_enabled { "1" } else { "0" }],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.calendar_year', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [input.policy.calendar_year.to_string()],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.timezone_offset_minutes', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [input.policy.timezone_offset_minutes.to_string()],
        )
        .map_err(|error| error.to_string())?;
    let policy = load_policy(&transaction, &input.user_id)?;
    let due_rows: Vec<(String, String)> = transaction
        .prepare("SELECT kind, next_due_at FROM ph_reminders WHERE user_id = ?1 AND enabled = 1 AND next_due_at IS NOT NULL")
        .map_err(|error| error.to_string())?
        .query_map([&input.user_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    for (kind, due) in due_rows {
        let parsed = DateTime::parse_from_rfc3339(&due).map_err(|_| "invalid-reminder".to_string())?;
        let normalized = normalize_due_at(&policy, parsed, policy.timezone_offset_minutes)
            .with_timezone(&Utc)
            .to_rfc3339_opts(SecondsFormat::Millis, true);
        transaction
            .execute(
                "UPDATE ph_reminders SET next_due_at = ?1 WHERE user_id = ?2 AND kind = ?3",
                params![normalized, input.user_id, kind],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(newly_enabled)
}

fn begin_system_deferral(
    transaction: &rusqlite::Transaction<'_>,
    user_id: &str,
    now: &str,
) -> Result<(), String> {
    transaction
        .execute(
            "UPDATE ph_reminders SET pending_at = NULL, updated_at = ?1 WHERE user_id = ?2 AND pending_at IS NOT NULL",
            params![now, user_id],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE ph_schedule_policies SET system_deferred = 1, system_deferral_until = NULL, updated_at = ?1 WHERE user_id = ?2 AND system_deferral_enabled = 1",
            params![now, user_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn end_system_deferral(
    transaction: &rusqlite::Transaction<'_>,
    user_id: &str,
    now: DateTime<chrono::FixedOffset>,
    policy: &SchedulePolicyInput,
    local_date: &str,
    weekday: i64,
    minute_of_day: i64,
) -> Result<bool, String> {
    let grace_minutes = policy.deferral_grace_minutes;
    let now_text = now
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let grace_end = now + Duration::minutes(grace_minutes);
    let grace_end_text = grace_end
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let candidates: Vec<String> = {
        let mut statement = transaction
            .prepare(
                "SELECT kind FROM ph_reminders WHERE user_id = ?1 AND enabled = 1 AND pending_at IS NULL AND next_due_at IS NOT NULL AND next_due_at <= ?2 AND (muted_until IS NULL OR muted_until <= ?3) ORDER BY CASE kind WHEN 'break' THEN 0 ELSE 1 END",
            )
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map(params![user_id, grace_end_text, now_text], |row| row.get(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        rows
    };
    for index in 0..candidates.len() {
        let due_minute = minute_of_day + grace_minutes + index as i64 * 5;
        if due_minute >= 1440 || !schedule_allows(policy, local_date, weekday, due_minute) {
            return Ok(false);
        }
    }
    let deferral_until = (!candidates.is_empty()).then_some(grace_end_text.clone());
    for (index, kind) in candidates.into_iter().enumerate() {
        let next_due_at = (grace_end + Duration::minutes(index as i64 * 5))
            .with_timezone(&Utc)
            .to_rfc3339_opts(SecondsFormat::Millis, true);
        transaction
            .execute(
                "UPDATE ph_reminders SET next_due_at = ?1, updated_at = ?2 WHERE user_id = ?3 AND kind = ?4 AND enabled = 1 AND pending_at IS NULL",
                params![next_due_at, now_text, user_id, kind],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction
        .execute(
            "UPDATE ph_schedule_policies SET system_deferred = 0, system_deferral_until = ?1, updated_at = ?2 WHERE user_id = ?3",
            params![deferral_until, now_text, user_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(true)
}

fn claim_pending_at_date(
    user_id: &str,
    now: &str,
    local_date: &str,
    weekday: i64,
    minute_of_day: i64,
    notifications_allowed: Option<bool>,
    connection: &mut Connection,
) -> Result<Vec<String>, String> {
    if NaiveDate::parse_from_str(local_date, "%Y-%m-%d").is_err() {
        return Err("invalid-local-time".to_string());
    }
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return Err("invalid-local-time".to_string());
    }
    let parsed_now = DateTime::parse_from_rfc3339(now)
        .map_err(|_| "invalid-local-time".to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let policy = load_policy(&transaction, user_id)?;
    let active: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NULL)",
            [user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if policy.system_deferral_enabled {
        match notifications_allowed {
            Some(false) => {
                begin_system_deferral(&transaction, user_id, now)?;
                transaction.commit().map_err(|error| error.to_string())?;
                return Ok(Vec::new());
            }
            Some(true) if policy.system_deferred => {
                if active || !schedule_allows(&policy, local_date, weekday, minute_of_day) {
                    transaction.commit().map_err(|error| error.to_string())?;
                    return Ok(Vec::new());
                }
                if !end_system_deferral(
                    &transaction,
                    user_id,
                    parsed_now,
                    &policy,
                    local_date,
                    weekday,
                    minute_of_day,
                )? {
                    transaction.commit().map_err(|error| error.to_string())?;
                    return Ok(Vec::new());
                }
                transaction.commit().map_err(|error| error.to_string())?;
                return Ok(Vec::new());
            }
            None if policy.system_deferred => {
                transaction.commit().map_err(|error| error.to_string())?;
                return Ok(Vec::new());
            }
            _ => {}
        }
    }
    if policy
        .system_deferral_until
        .as_deref()
        .is_some_and(|until| until <= now)
    {
        transaction
            .execute(
                "UPDATE ph_schedule_policies SET system_deferral_until = NULL, updated_at = ?1 WHERE user_id = ?2",
                params![now, user_id],
            )
            .map_err(|error| error.to_string())?;
    }
    if !schedule_allows(&policy, local_date, weekday, minute_of_day) {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Vec::new());
    }
    if active {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Vec::new());
    }
    let candidates: Vec<String> = {
        let mut statement = transaction
            .prepare("SELECT kind FROM ph_reminders WHERE user_id = ?1 AND enabled = 1 AND pending_at IS NULL AND next_due_at IS NOT NULL AND next_due_at <= ?2 AND (muted_until IS NULL OR muted_until <= ?2)")
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map(params![user_id, now], |row| row.get(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        rows
    };
    let mut claimed = Vec::new();
    for kind in candidates {
        let changed = transaction
            .execute(
                "UPDATE ph_reminders SET pending_at = ?1, updated_at = ?1 WHERE user_id = ?2 AND kind = ?3 AND enabled = 1 AND pending_at IS NULL AND next_due_at IS NOT NULL AND next_due_at <= ?1 AND (muted_until IS NULL OR muted_until <= ?1)",
                params![now, user_id, kind],
            )
            .map_err(|error| error.to_string())?;
        if changed == 1 {
            claimed.push(kind);
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(claimed)
}

#[cfg(test)]
fn claim_pending(
    user_id: &str,
    now: &str,
    weekday: i64,
    minute_of_day: i64,
    notifications_allowed: Option<bool>,
    connection: &mut Connection,
) -> Result<Vec<String>, String> {
    let local_date = DateTime::parse_from_rfc3339(now)
        .map_err(|_| "invalid-local-time".to_string())?
        .date_naive()
        .to_string();
    claim_pending_at_date(
        user_id,
        now,
        &local_date,
        weekday,
        minute_of_day,
        notifications_allowed,
        connection,
    )
}

fn apply_action(input: ReminderActionInput, connection: &mut Connection) -> Result<(), String> {
    if !valid_kind(&input.kind) || !matches!(input.action.as_str(), "completed" | "snoozed" | "muted") {
        return Err("invalid-action".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let policy = load_policy(&transaction, &input.user_id)?;
    if !(-840..=840).contains(&input.timezone_offset_minutes) {
        return Err("invalid-action".to_string());
    }
    let next_due_at = normalize_due_at(
        &policy,
        DateTime::parse_from_rfc3339(&input.next_due_at)
            .map_err(|_| "invalid-action".to_string())?,
        input.timezone_offset_minutes,
    )
    .with_timezone(&Utc)
    .to_rfc3339_opts(SecondsFormat::Millis, true);
    let changed = transaction
        .execute(
            "UPDATE ph_reminders SET next_due_at = ?1, pending_at = NULL, muted_until = ?2, updated_at = ?3 WHERE user_id = ?4 AND kind = ?5 AND enabled = 1 AND pending_at IS NOT NULL",
            params![next_due_at, input.muted_until, input.occurred_at, input.user_id, input.kind],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("not-pending".to_string());
    }
    transaction
        .execute(
            "INSERT INTO ph_reminder_events (id, user_id, kind, action, occurred_at, source) VALUES (?1, ?2, ?3, ?4, ?5, 'manual')",
            params![input.event_id, input.user_id, input.kind, input.action, input.occurred_at],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(())
}

fn complete_natural_break_record_at_date(
    input: NaturalBreakInput,
    local_date: &str,
    connection: &mut Connection,
) -> Result<bool, String> {
    if NaiveDate::parse_from_str(local_date, "%Y-%m-%d").is_err() {
        return Err("invalid-natural-break".to_string());
    }
    if input.event_id.trim().is_empty()
        || !(0..=6).contains(&input.weekday)
        || !(0..=1439).contains(&input.minute_of_day)
        || !(-840..=840).contains(&input.timezone_offset_minutes)
    {
        return Err("invalid-natural-break".to_string());
    }
    let occurred = DateTime::parse_from_rfc3339(&input.occurred_at)
        .map_err(|_| "invalid-natural-break".to_string())?;
    let idle_started = DateTime::parse_from_rfc3339(&input.idle_started_at)
        .map_err(|_| "invalid-natural-break".to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let policy = load_policy(&transaction, &input.user_id)?;
    let threshold_seconds = u64::try_from(policy.natural_break_minutes)
        .map_err(|_| "invalid-policy".to_string())?
        * 60;
    if !policy.natural_break_enabled
        || !schedule_allows(&policy, local_date, input.weekday, input.minute_of_day)
        || input.idle_seconds < threshold_seconds
        || occurred.signed_duration_since(idle_started).num_seconds()
            < i64::try_from(threshold_seconds).map_err(|_| "invalid-natural-break".to_string())?
    {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(false);
    }
    let active: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NULL)",
            [&input.user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let reminder = transaction
        .query_row(
            "SELECT enabled, interval_minutes FROM ph_reminders WHERE user_id = ?1 AND kind = 'break'",
            [&input.user_id],
            |row| Ok((row.get::<_, bool>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((reminder_enabled, interval_minutes)) = reminder else {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(false);
    };
    if active || !reminder_enabled {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(false);
    }
    let duplicate: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ph_reminder_events WHERE user_id = ?1 AND kind = 'break' AND action = 'completed' AND occurred_at >= ?2)",
            params![input.user_id, idle_started.with_timezone(&Utc).to_rfc3339_opts(SecondsFormat::Millis, true)],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if duplicate {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(false);
    }
    let occurred_at = occurred
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let next_due_at = normalize_due_at(
        &policy,
        occurred + Duration::minutes(interval_minutes),
        input.timezone_offset_minutes,
    )
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let changed = transaction
        .execute(
            "UPDATE ph_reminders SET next_due_at = ?1, pending_at = NULL, updated_at = ?2 WHERE user_id = ?3 AND kind = 'break' AND enabled = 1",
            params![next_due_at, occurred_at, input.user_id],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("natural-break-not-available".to_string());
    }
    transaction
        .execute(
            "INSERT INTO ph_reminder_events (id, user_id, kind, action, occurred_at, source) VALUES (?1, ?2, 'break', 'completed', ?3, 'natural')",
            params![input.event_id, input.user_id, occurred_at],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(true)
}

#[cfg(test)]
fn complete_natural_break_record(
    input: NaturalBreakInput,
    connection: &mut Connection,
) -> Result<bool, String> {
    let local_date = DateTime::parse_from_rfc3339(&input.occurred_at)
        .map_err(|_| "invalid-natural-break".to_string())?
        .date_naive()
        .to_string();
    complete_natural_break_record_at_date(input, &local_date, connection)
}

fn connection(app: &AppHandle) -> Result<Connection, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    Connection::open(path).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn save_pause_hydrate_preferences(input: SavePreferencesInput, app: AppHandle) -> Result<bool, String> {
    save_preferences(input, &mut connection(&app)?)
}

#[tauri::command]
pub(crate) fn claim_pause_hydrate_reminders(
    user_id: String,
    now: String,
    local_date: String,
    weekday: i64,
    minute_of_day: i64,
    notifications_allowed: Option<bool>,
    app: AppHandle,
) -> Result<Vec<String>, String> {
    claim_pending_at_date(
        &user_id,
        &now,
        &local_date,
        weekday,
        minute_of_day,
        notifications_allowed,
        &mut connection(&app)?,
    )
}

#[tauri::command]
pub(crate) fn act_on_pause_hydrate_reminder(input: ReminderActionInput, app: AppHandle) -> Result<(), String> {
    apply_action(input, &mut connection(&app)?)
}

#[tauri::command]
pub(crate) fn complete_natural_break(input: NaturalBreakInput, local_date: String, app: AppHandle) -> Result<bool, String> {
    complete_natural_break_record_at_date(input, &local_date, &mut connection(&app)?)
}

#[cfg(test)]
mod tests {
    use super::{
        apply_action, claim_pending, claim_pending_at_date, complete_natural_break_record, normalize_due_at, save_preferences,
        schedule_allows, valid_policy, NaturalBreakInput, ReminderActionInput, ReminderPreferenceInput, SavePreferencesInput,
        ReminderWindow, SchedulePolicyInput,
    };
    use chrono::DateTime;
    use rusqlite::{params, Connection};

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "
                CREATE TABLE ch_sessions (user_id TEXT NOT NULL, ended_at TEXT);
                CREATE TABLE ch_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE ph_reminders (
                    user_id TEXT NOT NULL, kind TEXT NOT NULL, enabled INTEGER NOT NULL,
                    interval_minutes INTEGER NOT NULL, next_due_at TEXT, pending_at TEXT,
                    muted_until TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, kind)
                );
                CREATE TABLE ph_reminder_events (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL,
                    action TEXT NOT NULL, occurred_at TEXT NOT NULL,
                    source TEXT NOT NULL DEFAULT 'manual'
                );
                CREATE TABLE ph_schedule_policies (
                    user_id TEXT PRIMARY KEY, active_weekdays_mask INTEGER NOT NULL,
                    work_start_minute INTEGER NOT NULL, work_end_minute INTEGER NOT NULL,
                    quiet_enabled INTEGER NOT NULL, quiet_start_minute INTEGER NOT NULL,
                    quiet_end_minute INTEGER NOT NULL, updated_at TEXT NOT NULL,
                    natural_break_enabled INTEGER NOT NULL DEFAULT 0,
                    natural_break_minutes INTEGER NOT NULL DEFAULT 5,
                    system_deferral_enabled INTEGER NOT NULL DEFAULT 1,
                    deferral_grace_minutes INTEGER NOT NULL DEFAULT 5,
                    system_deferred INTEGER NOT NULL DEFAULT 0,
                    system_deferral_until TEXT
                );
                ",
            )
            .unwrap();
        connection
    }

    fn insert_pending(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, ?3, NULL, ?3)",
                params!["local-user", "2026-08-27T09:00:00Z", "2026-08-27T10:00:00Z"],
            )
            .unwrap();
    }

    #[test]
    fn unchanged_preferences_preserve_pending_state() {
        let mut connection = database();
        insert_pending(&connection);

        let newly_enabled = save_preferences(
            SavePreferencesInput {
                user_id: "local-user".into(),
                updated_at: "2026-08-27T11:00:00Z".into(),
                preferences: vec![ReminderPreferenceInput {
                    kind: "break".into(),
                    enabled: true,
                    interval_minutes: 60,
                    next_due_at: Some("2026-08-27T12:00:00Z".into()),
                }],
                policy: SchedulePolicyInput::default(),
            },
            &mut connection,
        )
        .unwrap();

        let pending: Option<String> = connection
            .query_row(
                "SELECT pending_at FROM ph_reminders WHERE kind = 'break'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(!newly_enabled);
        assert_eq!(pending.as_deref(), Some("2026-08-27T10:00:00Z"));
    }

    #[test]
    fn pending_claim_succeeds_only_once() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();

        assert_eq!(
            claim_pending("local-user", "2026-08-27T10:00:00Z", 3, 600, None, &mut connection).unwrap(),
            vec!["break"]
        );
        assert!(claim_pending("local-user", "2026-08-27T10:00:01Z", 3, 600, None, &mut connection)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn schedule_policy_blocks_inactive_days_off_hours_and_overnight_quiet_time() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES (?1, 8, 540, 1080, 1, 1320, 600, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();

        assert!(claim_pending("local-user", "2026-08-28T10:01:00Z", 4, 601, None, &mut connection)
            .unwrap()
            .is_empty());
        assert!(claim_pending("local-user", "2026-08-27T08:59:00Z", 3, 539, None, &mut connection)
            .unwrap()
            .is_empty());
        assert!(claim_pending("local-user", "2026-08-27T09:30:00Z", 3, 570, None, &mut connection)
            .unwrap()
            .is_empty());
        connection
            .execute("UPDATE ph_schedule_policies SET quiet_enabled = 0", [])
            .unwrap();
        assert_eq!(
            claim_pending("local-user", "2026-08-27T10:01:00Z", 3, 601, None, &mut connection)
                .unwrap(),
            vec!["break"]
        );
    }

    #[test]
    fn china_calendar_overrides_holidays_and_make_up_workdays() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-10-01T01:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES (?1, 31, 540, 1080, 0, 1320, 420, ?2)",
                params!["local-user", "2026-10-01T01:00:00Z"],
            )
            .unwrap();

        assert!(claim_pending_at_date(
            "local-user", "2026-10-01T10:00:00Z", "2026-10-01", 3, 600, None, &mut connection,
        )
        .unwrap()
        .is_empty());
        connection
            .execute("UPDATE ph_reminders SET next_due_at = '2026-01-04T01:00:00Z', pending_at = NULL", [])
            .unwrap();
        assert_eq!(
            claim_pending_at_date(
                "local-user", "2026-01-04T10:00:00Z", "2026-01-04", 6, 600, None, &mut connection,
            )
            .unwrap(),
            vec!["break"]
        );
    }

    #[test]
    fn next_due_skips_quiet_window() {
        let mut policy = SchedulePolicyInput::default();
        policy.active_weekdays_mask = 8;
        policy.weekday_schedules[3].quiet_windows = vec![ReminderWindow {
            start_minute: 660,
            end_minute: 780,
        }];
        let due = DateTime::parse_from_rfc3339("2026-08-27T11:30:00+08:00").unwrap();
        let normalized = normalize_due_at(&policy, due, 480);
        assert_eq!(normalized.format("%H:%M").to_string(), "13:01");
    }

    #[test]
    fn next_due_keeps_local_time_when_timestamp_is_utc() {
        let mut policy = SchedulePolicyInput::default();
        policy.active_weekdays_mask = 8;
        policy.weekday_schedules[3].work_windows = vec![ReminderWindow {
            start_minute: 570,
            end_minute: 1050,
        }];
        let due = DateTime::parse_from_rfc3339("2026-09-03T06:48:00Z").unwrap();
        let normalized = normalize_due_at(&policy, due, 480);
        assert_eq!(normalized.to_rfc3339(), "2026-09-03T06:48:00+00:00");
    }

    #[test]
    fn empty_configured_work_windows_do_not_fall_back_to_legacy_hours() {
        let mut policy = SchedulePolicyInput::default();
        policy.weekday_schedules[3].work_windows.clear();
        assert!(!schedule_allows(&policy, "2026-09-03", 3, 600));
        assert!(!valid_policy(&policy));
    }

    #[test]
    fn work_window_boundaries_do_not_trigger_reminders() {
        let mut policy = SchedulePolicyInput::default();
        policy.active_weekdays_mask = 8;
        policy.weekday_schedules[3].work_windows = vec![
            ReminderWindow { start_minute: 570, end_minute: 1050 },
            ReminderWindow { start_minute: 1140, end_minute: 1260 },
        ];
        policy.weekday_schedules[3].quiet_windows = vec![
            ReminderWindow { start_minute: 690, end_minute: 810 },
            ReminderWindow { start_minute: 1140, end_minute: 1200 },
        ];
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 570));
        assert!(schedule_allows(&policy, "2026-08-27", 3, 571));
        assert!(schedule_allows(&policy, "2026-08-27", 3, 1049));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 1050));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 1140));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 1141));
        assert!(schedule_allows(&policy, "2026-08-27", 3, 1259));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 1260));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 810));
        assert!(schedule_allows(&policy, "2026-08-27", 3, 811));
        assert!(!schedule_allows(&policy, "2026-08-27", 3, 1200));
        assert!(schedule_allows(&policy, "2026-08-27", 3, 1201));
    }

    #[test]
    fn changed_schedule_refreshes_an_unchanged_reminder() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES (?1, 8, 540, 1080, 0, 1320, 420, ?2)",
                params!["local-user", "2026-08-27T08:00:00Z"],
            )
            .unwrap();
        let mut policy = SchedulePolicyInput::default();
        policy.active_weekdays_mask = 8;
        policy.weekday_schedules[3].work_windows = vec![ReminderWindow {
            start_minute: 720,
            end_minute: 1080,
        }];
        let _ = save_preferences(
            SavePreferencesInput {
                user_id: "local-user".into(),
                updated_at: "2026-08-27T08:00:00Z".into(),
                preferences: vec![ReminderPreferenceInput {
                    kind: "break".into(),
                    enabled: true,
                    interval_minutes: 60,
                    next_due_at: Some("2026-08-27T13:00:00Z".into()),
                }],
                policy,
            },
            &mut connection,
        )
        .unwrap();
        let next_due: String = connection
            .query_row(
                "SELECT next_due_at FROM ph_reminders WHERE kind = 'break'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(next_due, "2026-08-27T13:00:00.000Z");
    }

    #[test]
    fn fully_quiet_active_week_is_not_a_valid_policy() {
        let mut policy = SchedulePolicyInput::default();
        policy.active_weekdays_mask = 1;
        policy.weekday_schedules[0].work_windows = vec![ReminderWindow {
            start_minute: 540,
            end_minute: 1080,
        }];
        policy.weekday_schedules[0].quiet_windows = vec![ReminderWindow {
            start_minute: 540,
            end_minute: 1080,
        }];
        assert!(!valid_policy(&policy));
    }

    #[test]
    fn disabled_calendar_does_not_activate_make_up_workday() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-01-04T01:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES (?1, 31, 540, 1080, 0, 1320, 420, ?2)",
                params!["local-user", "2026-01-04T01:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.calendar_enabled', '0')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ch_settings (key, value) VALUES ('pause_hydrate.calendar_year', '2026')",
                [],
            )
            .unwrap();
        assert!(claim_pending_at_date(
            "local-user", "2026-01-04T10:00:00Z", "2026-01-04", 6, 600, None, &mut connection,
        )
        .unwrap()
        .is_empty());
    }

    #[test]
    fn overnight_quiet_window_starts_on_its_configured_weekday() {
        let mut policy = SchedulePolicyInput::default();
        policy.weekday_schedules[0].work_windows = vec![ReminderWindow {
            start_minute: 0,
            end_minute: 1439,
        }];
        policy.weekday_schedules[0].quiet_windows = vec![ReminderWindow {
            start_minute: 1320,
            end_minute: 420,
        }];
        policy.weekday_schedules[1].work_windows = vec![ReminderWindow {
            start_minute: 0,
            end_minute: 1439,
        }];
        assert!(schedule_allows(&policy, "2026-08-31", 0, 360));
        assert!(!schedule_allows(&policy, "2026-08-31", 0, 1380));
        assert!(!schedule_allows(&policy, "2026-09-01", 1, 360));
    }

    #[test]
    fn system_deferral_withdraws_pending_and_staggers_resume() {
        let mut connection = database();
        for kind in ["break", "hydration"] {
            connection
                .execute(
                    "INSERT INTO ph_reminders VALUES (?1, ?2, 1, 60, ?3, ?3, NULL, ?3)",
                    params!["local-user", kind, "2026-08-27T09:00:00Z"],
                )
                .unwrap();
        }
        connection
            .execute(
                "INSERT INTO ph_schedule_policies VALUES (?1, 24, 540, 1080, 0, 1320, 420, ?2, 0, 5, 1, 5, 0, NULL)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();

        assert!(claim_pending(
            "local-user",
            "2026-08-27T10:00:00Z",
            3,
            600,
            Some(false),
            &mut connection,
        )
        .unwrap()
        .is_empty());
        let pending: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM ph_reminders WHERE pending_at IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let deferred: bool = connection
            .query_row(
                "SELECT system_deferred FROM ph_schedule_policies",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(pending, 0);
        assert!(deferred);
        assert!(claim_pending(
            "local-user",
            "2026-08-27T10:00:30Z",
            3,
            600,
            None,
            &mut connection,
        )
        .unwrap()
        .is_empty());
        assert!(claim_pending(
            "local-user",
            "2026-08-27T17:50:00Z",
            3,
            1070,
            Some(true),
            &mut connection,
        )
        .unwrap()
        .is_empty());
        assert!(claim_pending(
            "local-user",
            "2026-08-28T08:59:00Z",
            4,
            539,
            Some(true),
            &mut connection,
        )
        .unwrap()
        .is_empty());
        connection
            .execute("INSERT INTO ch_sessions VALUES ('local-user', NULL)", [])
            .unwrap();
        assert!(claim_pending(
            "local-user",
            "2026-08-28T10:01:00Z",
            4,
            601,
            Some(true),
            &mut connection,
        )
        .unwrap()
        .is_empty());
        let deferred: bool = connection
            .query_row(
                "SELECT system_deferred FROM ph_schedule_policies",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(deferred);
        connection.execute("DELETE FROM ch_sessions", []).unwrap();

        assert!(claim_pending(
            "local-user",
            "2026-08-28T10:02:00Z",
            4,
            602,
            Some(true),
            &mut connection,
        )
        .unwrap()
        .is_empty());
        let due: Vec<(String, String)> = connection
            .prepare("SELECT kind, next_due_at FROM ph_reminders ORDER BY CASE kind WHEN 'break' THEN 0 ELSE 1 END")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            due,
            vec![
                ("break".into(), "2026-08-28T10:07:00.000Z".into()),
                ("hydration".into(), "2026-08-28T10:12:00.000Z".into()),
            ]
        );
        let deferral_until: Option<String> = connection
            .query_row(
                "SELECT system_deferral_until FROM ph_schedule_policies",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(deferral_until.as_deref(), Some("2026-08-28T10:07:00.000Z"));

        assert_eq!(
            claim_pending(
                "local-user",
                "2026-08-28T10:07:01Z",
                4,
                607,
                Some(true),
                &mut connection,
            )
            .unwrap(),
            vec!["break"]
        );
    }

    #[test]
    fn natural_idle_completes_only_one_movement_break() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'break', 1, 60, ?2, ?2, NULL, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'hydration', 1, 45, ?2, ?2, NULL, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ph_schedule_policies VALUES (?1, 8, 540, 1080, 0, 1320, 420, ?2, 1, 5, 1, 5, 0, NULL)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();

        let input = |event_id: &str| NaturalBreakInput {
            user_id: "local-user".into(),
            event_id: event_id.into(),
            occurred_at: "2026-08-27T10:00:00Z".into(),
            idle_started_at: "2026-08-27T09:54:00Z".into(),
            idle_seconds: 360,
            weekday: 3,
            minute_of_day: 600,
            timezone_offset_minutes: 0,
        };
        connection
            .execute(
                "INSERT INTO ch_sessions VALUES ('local-user', NULL)",
                [],
            )
            .unwrap();
        assert!(!complete_natural_break_record(input("blocked"), &mut connection).unwrap());
        connection.execute("DELETE FROM ch_sessions", []).unwrap();
        assert!(complete_natural_break_record(input("natural-1"), &mut connection).unwrap());
        assert!(!complete_natural_break_record(input("natural-2"), &mut connection).unwrap());

        let events: Vec<(String, String)> = connection
            .prepare("SELECT kind, source FROM ph_reminder_events ORDER BY occurred_at")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let break_state: (Option<String>, String) = connection
            .query_row(
                "SELECT pending_at, next_due_at FROM ph_reminders WHERE kind = 'break'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let hydration_pending: Option<String> = connection
            .query_row(
                "SELECT pending_at FROM ph_reminders WHERE kind = 'hydration'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(events, vec![("break".into(), "natural".into())]);
        assert!(break_state.0.is_none());
        assert_eq!(break_state.1, "2026-08-27T11:00:00.000Z");
        assert_eq!(hydration_pending.as_deref(), Some("2026-08-27T09:00:00Z"));
    }

    #[test]
    fn reminder_action_updates_state_and_event_together() {
        let mut connection = database();
        insert_pending(&connection);
        connection
            .execute(
                "INSERT INTO ph_reminders VALUES (?1, 'hydration', 1, 45, ?2, NULL, NULL, ?2)",
                params!["local-user", "2026-08-27T11:45:00Z"],
            )
            .unwrap();

        apply_action(
            ReminderActionInput {
                user_id: "local-user".into(),
                kind: "break".into(),
                action: "completed".into(),
                event_id: "event-1".into(),
                occurred_at: "2026-08-27T10:05:00Z".into(),
                next_due_at: "2026-08-27T11:05:00Z".into(),
                muted_until: None,
                timezone_offset_minutes: 0,
            },
            &mut connection,
        )
        .unwrap();

        let break_pending: Option<String> = connection
            .query_row("SELECT pending_at FROM ph_reminders WHERE kind = 'break'", [], |row| row.get(0))
            .unwrap();
        let hydration_state: (Option<String>, String) = connection
            .query_row(
                "SELECT pending_at, next_due_at FROM ph_reminders WHERE kind = 'hydration'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let events: i64 = connection
            .query_row("SELECT COUNT(*) FROM ph_reminder_events", [], |row| row.get(0))
            .unwrap();
        assert!(break_pending.is_none());
        assert!(hydration_state.0.is_none());
        assert_eq!(hydration_state.1, "2026-08-27T11:45:00Z");
        assert_eq!(events, 1);
    }
}
