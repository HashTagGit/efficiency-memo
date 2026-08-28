use crate::data_control::DB_FILENAME;
use crate::local_schedule::minute_in_window;
use chrono::{DateTime, Datelike, Days, NaiveDate, Timelike, Weekday};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReviewReminderPreferences {
    daily_enabled: bool,
    daily_minute: i64,
    weekly_enabled: bool,
    weekly_weekday: i64,
    weekly_minute: i64,
    last_daily_local_date: Option<String>,
    last_weekly_started_on: Option<String>,
    pending_daily_local_date: Option<String>,
    pending_week_started_on: Option<String>,
}

impl Default for ReviewReminderPreferences {
    fn default() -> Self {
        Self {
            daily_enabled: false,
            daily_minute: 1080,
            weekly_enabled: false,
            weekly_weekday: 6,
            weekly_minute: 1080,
            last_daily_local_date: None,
            last_weekly_started_on: None,
            pending_daily_local_date: None,
            pending_week_started_on: None,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveReviewReminderInput {
    user_id: String,
    daily_enabled: bool,
    daily_minute: i64,
    weekly_enabled: bool,
    weekly_weekday: i64,
    weekly_minute: i64,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveReviewReminderResult {
    preferences: ReviewReminderPreferences,
    newly_enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClaimReviewReminderInput {
    user_id: String,
    observed_at: String,
    local_date: String,
    week_started_on: String,
    weekday: i64,
    minute_of_day: i64,
    notifications_allowed: Option<bool>,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReviewReminderClaim {
    kind: String,
    acknowledge_kinds: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AcknowledgeReviewReminderInput {
    user_id: String,
    kinds: Vec<String>,
    acknowledged_at: String,
}

fn database(app: &AppHandle) -> Result<Connection, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    Connection::open(path).map_err(|error| error.to_string())
}

fn load_preferences(
    connection: &Connection,
    user_id: &str,
) -> Result<ReviewReminderPreferences, String> {
    connection
        .query_row(
            "SELECT daily_enabled, daily_minute, weekly_enabled, weekly_weekday, weekly_minute, last_daily_local_date, last_weekly_started_on, pending_daily_local_date, pending_week_started_on FROM ch_review_reminder_preferences WHERE user_id = ?1",
            [user_id],
            |row| {
                Ok(ReviewReminderPreferences {
                    daily_enabled: row.get(0)?,
                    daily_minute: row.get(1)?,
                    weekly_enabled: row.get(2)?,
                    weekly_weekday: row.get(3)?,
                    weekly_minute: row.get(4)?,
                    last_daily_local_date: row.get(5)?,
                    last_weekly_started_on: row.get(6)?,
                    pending_daily_local_date: row.get(7)?,
                    pending_week_started_on: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())
        .map(|value| value.unwrap_or_default())
}

fn save_preferences(
    connection: &mut Connection,
    input: &SaveReviewReminderInput,
) -> Result<SaveReviewReminderResult, String> {
    if !(0..=1439).contains(&input.daily_minute)
        || !(0..=6).contains(&input.weekly_weekday)
        || !(0..=1439).contains(&input.weekly_minute)
        || DateTime::parse_from_rfc3339(&input.updated_at).is_err()
    {
        return Err("invalid-preferences".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let previous = load_preferences(&transaction, &input.user_id)?;
    let newly_enabled = (input.daily_enabled && !previous.daily_enabled)
        || (input.weekly_enabled && !previous.weekly_enabled);
    transaction
        .execute(
            "INSERT INTO ch_review_reminder_preferences (user_id, daily_enabled, daily_minute, weekly_enabled, weekly_weekday, weekly_minute, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(user_id) DO UPDATE SET daily_enabled = excluded.daily_enabled, daily_minute = excluded.daily_minute, weekly_enabled = excluded.weekly_enabled, weekly_weekday = excluded.weekly_weekday, weekly_minute = excluded.weekly_minute, pending_daily_local_date = CASE WHEN excluded.daily_enabled = 0 THEN NULL ELSE ch_review_reminder_preferences.pending_daily_local_date END, pending_week_started_on = CASE WHEN excluded.weekly_enabled = 0 THEN NULL ELSE ch_review_reminder_preferences.pending_week_started_on END, updated_at = excluded.updated_at",
            params![input.user_id, input.daily_enabled, input.daily_minute, input.weekly_enabled, input.weekly_weekday, input.weekly_minute, input.updated_at],
        )
        .map_err(|error| error.to_string())?;
    let preferences = load_preferences(&transaction, &input.user_id)?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(SaveReviewReminderResult { preferences, newly_enabled })
}

fn validate_clock(input: &ClaimReviewReminderInput) -> Result<(), String> {
    let observed_at = DateTime::parse_from_rfc3339(&input.observed_at)
        .map_err(|_| "invalid-local-time".to_string())?;
    let local_date = NaiveDate::parse_from_str(&input.local_date, "%Y-%m-%d")
        .map_err(|_| "invalid-local-time".to_string())?;
    let week_started_on = NaiveDate::parse_from_str(&input.week_started_on, "%Y-%m-%d")
        .map_err(|_| "invalid-local-time".to_string())?;
    let expected_week_start = local_date
        .checked_sub_days(Days::new(observed_at.weekday().num_days_from_monday() as u64))
        .ok_or_else(|| "invalid-local-time".to_string())?;
    if observed_at.date_naive() != local_date
        || observed_at.weekday().num_days_from_monday() as i64 != input.weekday
        || (observed_at.hour() * 60 + observed_at.minute()) as i64 != input.minute_of_day
        || week_started_on.weekday() != Weekday::Mon
        || week_started_on != expected_week_start
    {
        return Err("invalid-local-time".to_string());
    }
    Ok(())
}

fn claim_due(
    connection: &mut Connection,
    input: &ClaimReviewReminderInput,
) -> Result<Vec<ReviewReminderClaim>, String> {
    validate_clock(input)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let preferences = load_preferences(&transaction, &input.user_id)?;
    let daily_due = preferences.daily_enabled
        && input.minute_of_day >= preferences.daily_minute
        && preferences.last_daily_local_date.as_deref() != Some(&input.local_date);
    if daily_due {
        transaction
            .execute(
                "UPDATE ch_review_reminder_preferences SET pending_daily_local_date = ?1, updated_at = ?2 WHERE user_id = ?3 AND daily_enabled = 1 AND pending_daily_local_date IS NULL",
                params![input.local_date, input.observed_at, input.user_id],
            )
            .map_err(|error| error.to_string())?;
    }
    let weekly_due = preferences.weekly_enabled
        && input.weekday == preferences.weekly_weekday
        && input.minute_of_day >= preferences.weekly_minute
        && preferences.last_weekly_started_on.as_deref() != Some(&input.week_started_on);
    if weekly_due {
        transaction
            .execute(
                "UPDATE ch_review_reminder_preferences SET pending_week_started_on = ?1, updated_at = ?2 WHERE user_id = ?3 AND weekly_enabled = 1 AND pending_week_started_on IS NULL",
                params![input.week_started_on, input.observed_at, input.user_id],
            )
            .map_err(|error| error.to_string())?;
    }
    let mut preferences = load_preferences(&transaction, &input.user_id)?;
    if let Some(period) = preferences.pending_daily_local_date.clone() {
        let completed: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM ch_daily_reviews WHERE user_id = ?1 AND local_date = ?2)",
                params![input.user_id, period],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if completed {
            transaction
                .execute(
                    "UPDATE ch_review_reminder_preferences SET last_daily_local_date = pending_daily_local_date, pending_daily_local_date = NULL, updated_at = ?1 WHERE user_id = ?2",
                    params![input.observed_at, input.user_id],
                )
                .map_err(|error| error.to_string())?;
        }
    }
    if let Some(period) = preferences.pending_week_started_on.clone() {
        let completed: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM ch_weekly_reviews WHERE user_id = ?1 AND week_started_on = ?2)",
                params![input.user_id, period],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if completed {
            transaction
                .execute(
                    "UPDATE ch_review_reminder_preferences SET last_weekly_started_on = pending_week_started_on, pending_week_started_on = NULL, updated_at = ?1 WHERE user_id = ?2",
                    params![input.observed_at, input.user_id],
                )
                .map_err(|error| error.to_string())?;
        }
    }
    preferences = load_preferences(&transaction, &input.user_id)?;
    let quiet_policy: Option<(bool, i64, i64)> = transaction
        .query_row(
            "SELECT quiet_enabled, quiet_start_minute, quiet_end_minute FROM ph_schedule_policies WHERE user_id = ?1",
            [&input.user_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let active: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NULL)",
            [&input.user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let quiet = quiet_policy.is_some_and(|(enabled, start, end)| {
        enabled && minute_in_window(input.minute_of_day, start, end)
    });
    if active || quiet || input.notifications_allowed == Some(false) {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Vec::new());
    }
    let claim = if preferences.pending_week_started_on.is_some() {
        let mut acknowledge_kinds = vec!["weekly".to_string()];
        if preferences.pending_daily_local_date.is_some() {
            acknowledge_kinds.push("daily".to_string());
        }
        vec![ReviewReminderClaim { kind: "weekly".to_string(), acknowledge_kinds }]
    } else if preferences.pending_daily_local_date.is_some() {
        vec![ReviewReminderClaim {
            kind: "daily".to_string(),
            acknowledge_kinds: vec!["daily".to_string()],
        }]
    } else {
        Vec::new()
    };
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(claim)
}

fn acknowledge(
    connection: &mut Connection,
    input: &AcknowledgeReviewReminderInput,
) -> Result<(), String> {
    if input.kinds.is_empty()
        || input.kinds.len() > 2
        || input.kinds.iter().any(|kind| !matches!(kind.as_str(), "daily" | "weekly"))
        || DateTime::parse_from_rfc3339(&input.acknowledged_at).is_err()
    {
        return Err("invalid-acknowledgement".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    for kind in &input.kinds {
        let sql = if kind == "daily" {
            "UPDATE ch_review_reminder_preferences SET last_daily_local_date = pending_daily_local_date, pending_daily_local_date = NULL, updated_at = ?1 WHERE user_id = ?2 AND pending_daily_local_date IS NOT NULL"
        } else {
            "UPDATE ch_review_reminder_preferences SET last_weekly_started_on = pending_week_started_on, pending_week_started_on = NULL, updated_at = ?1 WHERE user_id = ?2 AND pending_week_started_on IS NOT NULL"
        };
        transaction
            .execute(sql, params![input.acknowledged_at, input.user_id])
            .map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn load_review_reminder_preferences(
    user_id: String,
    app: AppHandle,
) -> Result<ReviewReminderPreferences, String> {
    load_preferences(&database(&app)?, &user_id)
}

#[tauri::command]
pub(crate) fn save_review_reminder_preferences(
    input: SaveReviewReminderInput,
    app: AppHandle,
) -> Result<SaveReviewReminderResult, String> {
    save_preferences(&mut database(&app)?, &input)
}

#[tauri::command]
pub(crate) fn claim_review_reminders(
    input: ClaimReviewReminderInput,
    app: AppHandle,
) -> Result<Vec<ReviewReminderClaim>, String> {
    claim_due(&mut database(&app)?, &input)
}

#[tauri::command]
pub(crate) fn acknowledge_review_reminders(
    input: AcknowledgeReviewReminderInput,
    app: AppHandle,
) -> Result<(), String> {
    acknowledge(&mut database(&app)?, &input)
}

#[cfg(test)]
mod tests {
    use super::{
        acknowledge, claim_due, load_preferences, AcknowledgeReviewReminderInput,
        ClaimReviewReminderInput, ReviewReminderClaim, SaveReviewReminderInput, save_preferences,
    };
    use rusqlite::Connection;

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        for migration in [
            include_str!("../migrations/0001_cr_device_reminder.sql"),
            include_str!("../migrations/0003_ch_core_hour.sql"),
            include_str!("../migrations/0004_ch_session_durations.sql"),
            include_str!("../migrations/0005_ch_session_activity.sql"),
            include_str!("../migrations/0006_pause_hydrate.sql"),
            include_str!("../migrations/0007_ch_planned_blocks.sql"),
            include_str!("../migrations/0008_pause_hydrate_schedule_policy.sql"),
            include_str!("../migrations/0015_ch_daily_reviews.sql"),
            include_str!("../migrations/0016_ch_weekly_reviews.sql"),
            include_str!("../migrations/0017_ch_review_reminders.sql"),
        ] {
            connection.execute_batch(migration).unwrap();
        }
        connection
            .execute("INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated')", [])
            .unwrap();
        connection
    }

    fn claim(notifications_allowed: Option<bool>) -> ClaimReviewReminderInput {
        ClaimReviewReminderInput {
            user_id: "local-user".into(),
            observed_at: "2026-08-30T18:00:00+08:00".into(),
            local_date: "2026-08-30".into(),
            week_started_on: "2026-08-24".into(),
            weekday: 6,
            minute_of_day: 1080,
            notifications_allowed,
        }
    }

    #[test]
    fn defers_for_quiet_dnd_and_focus_then_claims_once() {
        let mut connection = database();
        save_preferences(
            &mut connection,
            &SaveReviewReminderInput {
                user_id: "local-user".into(),
                daily_enabled: true,
                daily_minute: 1080,
                weekly_enabled: true,
                weekly_weekday: 6,
                weekly_minute: 1080,
                updated_at: "2026-08-30T17:00:00+08:00".into(),
            },
        )
        .unwrap();
        assert!(claim_due(&mut connection, &claim(Some(false))).unwrap().is_empty());
        let pending = load_preferences(&connection, "local-user").unwrap();
        assert_eq!(pending.pending_daily_local_date.as_deref(), Some("2026-08-30"));
        assert_eq!(pending.pending_week_started_on.as_deref(), Some("2026-08-24"));
        connection
            .execute("INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES ('local-user', 127, 540, 1080, 1, 1020, 1140, 'updated')", [])
            .unwrap();
        assert!(claim_due(&mut connection, &claim(Some(true))).unwrap().is_empty());
        connection
            .execute("UPDATE ph_schedule_policies SET quiet_enabled = 0", [])
            .unwrap();
        connection
            .execute("INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('active', 'local-user', '2026-08-30T17:00:00+08:00', NULL, 30, 0, 'Work', NULL, 0, 0)", [])
            .unwrap();
        assert!(claim_due(&mut connection, &claim(Some(true))).unwrap().is_empty());
        connection.execute("DELETE FROM ch_sessions", []).unwrap();
        let expected = vec![ReviewReminderClaim {
            kind: "weekly".into(),
            acknowledge_kinds: vec!["weekly".into(), "daily".into()],
        }];
        assert_eq!(claim_due(&mut connection, &claim(Some(true))).unwrap(), expected);
        assert_eq!(claim_due(&mut connection, &claim(Some(true))).unwrap(), expected);
        acknowledge(
            &mut connection,
            &AcknowledgeReviewReminderInput {
                user_id: "local-user".into(),
                kinds: vec!["weekly".into(), "daily".into()],
                acknowledged_at: "2026-08-30T18:00:01+08:00".into(),
            },
        )
        .unwrap();
        assert!(claim_due(&mut connection, &claim(Some(true))).unwrap().is_empty());
        connection
            .execute("INSERT INTO ch_daily_reviews VALUES ('daily-complete', 'local-user', '2026-08-31', 'on-track', 90, 'created', 'updated')", [])
            .unwrap();
        let completed_day = ClaimReviewReminderInput {
            user_id: "local-user".into(),
            observed_at: "2026-08-31T18:00:00+08:00".into(),
            local_date: "2026-08-31".into(),
            week_started_on: "2026-08-31".into(),
            weekday: 0,
            minute_of_day: 1080,
            notifications_allowed: Some(true),
        };
        assert!(claim_due(&mut connection, &completed_day).unwrap().is_empty());
        let completed = load_preferences(&connection, "local-user").unwrap();
        assert_eq!(completed.last_daily_local_date.as_deref(), Some("2026-08-31"));
        assert!(completed.pending_daily_local_date.is_none());
    }

    #[test]
    fn carries_quiet_reminders_across_the_day_and_week_boundary() {
        let mut connection = database();
        save_preferences(
            &mut connection,
            &SaveReviewReminderInput {
                user_id: "local-user".into(),
                daily_enabled: true,
                daily_minute: 1380,
                weekly_enabled: true,
                weekly_weekday: 6,
                weekly_minute: 1380,
                updated_at: "2026-08-30T22:00:00+08:00".into(),
            },
        )
        .unwrap();
        connection
            .execute("INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES ('local-user', 127, 540, 1080, 1, 1320, 420, 'updated')", [])
            .unwrap();
        let sunday = ClaimReviewReminderInput {
            user_id: "local-user".into(),
            observed_at: "2026-08-30T23:00:00+08:00".into(),
            local_date: "2026-08-30".into(),
            week_started_on: "2026-08-24".into(),
            weekday: 6,
            minute_of_day: 1380,
            notifications_allowed: Some(true),
        };
        assert!(claim_due(&mut connection, &sunday).unwrap().is_empty());
        let following_sunday = ClaimReviewReminderInput {
            user_id: "local-user".into(),
            observed_at: "2026-09-06T23:00:00+08:00".into(),
            local_date: "2026-09-06".into(),
            week_started_on: "2026-08-31".into(),
            weekday: 6,
            minute_of_day: 1380,
            notifications_allowed: Some(true),
        };
        assert!(claim_due(&mut connection, &following_sunday).unwrap().is_empty());
        let pending = load_preferences(&connection, "local-user").unwrap();
        assert_eq!(pending.pending_daily_local_date.as_deref(), Some("2026-08-30"));
        assert_eq!(pending.pending_week_started_on.as_deref(), Some("2026-08-24"));
        let following_monday = ClaimReviewReminderInput {
            user_id: "local-user".into(),
            observed_at: "2026-09-07T07:00:00+08:00".into(),
            local_date: "2026-09-07".into(),
            week_started_on: "2026-09-07".into(),
            weekday: 0,
            minute_of_day: 420,
            notifications_allowed: Some(true),
        };
        assert_eq!(
            claim_due(&mut connection, &following_monday).unwrap(),
            vec![ReviewReminderClaim {
                kind: "weekly".into(),
                acknowledge_kinds: vec!["weekly".into(), "daily".into()],
            }],
        );
    }
}
