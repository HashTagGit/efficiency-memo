use crate::data_control::DB_FILENAME;
use crate::review_time::{
    interval_overlap_milliseconds, prorated_elapsed_seconds, validated_local_range,
};
use chrono::{DateTime, Datelike, Days, NaiveDate, SecondsFormat, Utc, Weekday};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const DEFAULT_DAILY_GOAL_MINUTES: i64 = 120;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WeeklyReviewQuery {
    user_id: String,
    week_started_on: String,
    started_at: String,
    ended_at: String,
    observed_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveWeeklyReviewInput {
    id: String,
    user_id: String,
    week_started_on: String,
    outcome: String,
    next_goal_minutes: i64,
    started_at: String,
    ended_at: String,
    saved_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WeeklyReviewRecord {
    id: String,
    week_started_on: String,
    outcome: String,
    next_goal_minutes: i64,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WeeklyReviewState {
    week_started_on: String,
    started_at: String,
    ended_at: String,
    planned_minutes: i64,
    actual_minutes: i64,
    plan_count: i64,
    completed_plan_count: i64,
    skipped_plan_count: i64,
    pending_plan_count: i64,
    session_count: i64,
    longest_focus_minutes: i64,
    pending_suggestion_count: i64,
    break_count: i64,
    hydration_count: i64,
    daily_review_count: i64,
    device_attention_count: i64,
    current_goal_minutes: i64,
    review: Option<WeeklyReviewRecord>,
}

fn database(app: &AppHandle) -> Result<Connection, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    Connection::open(path).map_err(|error| error.to_string())
}

fn week_bounds(input: &WeeklyReviewQuery) -> Result<(chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>), String> {
    let week_started_on = NaiveDate::parse_from_str(&input.week_started_on, "%Y-%m-%d")
        .map_err(|_| "invalid-date".to_string())?;
    if week_started_on.weekday() != Weekday::Mon {
        return Err("invalid-date".to_string());
    }
    validated_local_range(
        &input.week_started_on,
        &input.started_at,
        &input.ended_at,
        7,
        166,
        170,
    )
}

fn load_state(connection: &Connection, input: &WeeklyReviewQuery) -> Result<WeeklyReviewState, String> {
    let (week_started_at, week_ended_at) = week_bounds(input)?;
    let started_at = week_started_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    let ended_at = week_ended_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    let observed_at = DateTime::parse_from_rfc3339(&input.observed_at)
        .map_err(|_| "invalid-date".to_string())?
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let plans: Vec<(String, String, String)> = {
        let mut statement = connection
            .prepare("SELECT started_at, ended_at, status FROM ch_plans WHERE user_id = ?1 AND started_at < ?3 AND ended_at > ?2")
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![input.user_id, started_at, ended_at], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let planned_minutes = plans.iter().try_fold(0_i64, |total, (start, end, _)| {
        Ok::<_, String>(
            total
                + interval_overlap_milliseconds(start, end, week_started_at, week_ended_at)?
                    / 60_000,
        )
    })?;
    let sessions: Vec<(String, String, i64)> = {
        let mut statement = connection
            .prepare("SELECT started_at, ended_at, elapsed_seconds FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NOT NULL AND started_at < ?3 AND ended_at > ?2")
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![input.user_id, started_at, ended_at], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let prorated_sessions = sessions
        .iter()
        .map(|(start, end, elapsed)| {
            prorated_elapsed_seconds(start, end, *elapsed, week_started_at, week_ended_at)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let actual_seconds: i64 = prorated_sessions.iter().sum();
    let pending_suggestion_count = connection
        .query_row(
            "SELECT COUNT(*) FROM aa_activity_suggestions WHERE user_id = ?1 AND status = 'pending' AND started_at < ?3 AND ended_at > ?2",
            params![input.user_id, started_at, ended_at],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let reminder_counts: (i64, i64) = connection
        .query_row(
            "SELECT COALESCE(SUM(CASE WHEN kind = 'break' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN kind = 'hydration' THEN 1 ELSE 0 END), 0) FROM ph_reminder_events WHERE user_id = ?1 AND action = 'completed' AND occurred_at >= ?2 AND occurred_at < ?3",
            params![input.user_id, started_at, ended_at],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let week_ended_on = NaiveDate::parse_from_str(&input.week_started_on, "%Y-%m-%d")
        .map_err(|_| "invalid-date".to_string())?
        .checked_add_days(Days::new(7))
        .ok_or_else(|| "invalid-date".to_string())?
        .format("%Y-%m-%d")
        .to_string();
    let daily_review_count = connection
        .query_row(
            "SELECT COUNT(*) FROM ch_daily_reviews WHERE user_id = ?1 AND local_date >= ?2 AND local_date < ?3",
            params![input.user_id, input.week_started_on, week_ended_on],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let device_attention_count = connection
        .query_row(
            "SELECT COALESCE(SUM(CASE WHEN s.status IS NULL OR s.status <> 'tracking' OR (s.reminder_due_at IS NOT NULL AND julianday(s.reminder_due_at) <= julianday(?2)) THEN 1 ELSE 0 END), 0) FROM cr_devices d LEFT JOIN cr_computed_reminder_states s ON s.device_id = d.id WHERE d.user_id = ?1",
            params![input.user_id, observed_at],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let current_goal_minutes = connection
        .query_row(
            "SELECT value FROM ch_settings WHERE key = 'daily_focus_goal_minutes'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(DEFAULT_DAILY_GOAL_MINUTES);
    let review = connection
        .query_row(
            "SELECT id, week_started_on, outcome, next_goal_minutes, created_at, updated_at FROM ch_weekly_reviews WHERE user_id = ?1 AND week_started_on = ?2",
            params![input.user_id, input.week_started_on],
            |row| {
                Ok(WeeklyReviewRecord {
                    id: row.get(0)?,
                    week_started_on: row.get(1)?,
                    outcome: row.get(2)?,
                    next_goal_minutes: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    Ok(WeeklyReviewState {
        week_started_on: input.week_started_on.clone(),
        started_at: input.started_at.clone(),
        ended_at: input.ended_at.clone(),
        planned_minutes,
        actual_minutes: (actual_seconds + 30) / 60,
        plan_count: plans.len() as i64,
        completed_plan_count: plans.iter().filter(|(_, _, status)| status == "completed").count() as i64,
        skipped_plan_count: plans.iter().filter(|(_, _, status)| status == "skipped").count() as i64,
        pending_plan_count: plans.iter().filter(|(_, _, status)| status == "planned").count() as i64,
        session_count: sessions.len() as i64,
        longest_focus_minutes: (prorated_sessions.into_iter().max().unwrap_or(0) + 30) / 60,
        pending_suggestion_count,
        break_count: reminder_counts.0,
        hydration_count: reminder_counts.1,
        daily_review_count,
        device_attention_count,
        current_goal_minutes,
        review,
    })
}

fn save_review(
    connection: &mut Connection,
    input: &SaveWeeklyReviewInput,
) -> Result<WeeklyReviewRecord, String> {
    let (week_started_at, week_ended_at) = week_bounds(&WeeklyReviewQuery {
        user_id: input.user_id.clone(),
        week_started_on: input.week_started_on.clone(),
        started_at: input.started_at.clone(),
        ended_at: input.ended_at.clone(),
        observed_at: input.saved_at.clone(),
    })
    .map_err(|_| "invalid-review".to_string())?;
    if !matches!(input.outcome.as_str(), "on-track" | "overcommitted" | "underplanned" | "interrupted")
        || !(15..=720).contains(&input.next_goal_minutes)
        || input.id.trim().is_empty()
        || chrono::DateTime::parse_from_rfc3339(&input.saved_at).is_err()
    {
        return Err("invalid-review".to_string());
    }
    let started_at = week_started_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    let ended_at = week_ended_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let active_session: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NULL)",
            [&input.user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let pending_suggestions: i64 = transaction
        .query_row(
            "SELECT COUNT(*) FROM aa_activity_suggestions WHERE user_id = ?1 AND status = 'pending' AND started_at < ?3 AND ended_at > ?2",
            params![input.user_id, started_at, ended_at],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if active_session || pending_suggestions > 0 {
        return Err("open-items".to_string());
    }
    transaction
        .execute(
            "INSERT INTO ch_weekly_reviews (id, user_id, week_started_on, outcome, next_goal_minutes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(user_id, week_started_on) DO UPDATE SET outcome = excluded.outcome, next_goal_minutes = excluded.next_goal_minutes, updated_at = excluded.updated_at",
            params![input.id, input.user_id, input.week_started_on, input.outcome, input.next_goal_minutes, input.saved_at],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT OR REPLACE INTO ch_settings (key, value) VALUES ('daily_focus_goal_minutes', ?1)",
            [input.next_goal_minutes.to_string()],
        )
        .map_err(|error| error.to_string())?;
    let record = transaction
        .query_row(
            "SELECT id, week_started_on, outcome, next_goal_minutes, created_at, updated_at FROM ch_weekly_reviews WHERE user_id = ?1 AND week_started_on = ?2",
            params![input.user_id, input.week_started_on],
            |row| {
                Ok(WeeklyReviewRecord {
                    id: row.get(0)?,
                    week_started_on: row.get(1)?,
                    outcome: row.get(2)?,
                    next_goal_minutes: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(record)
}

#[tauri::command]
pub(crate) fn load_weekly_review(
    input: WeeklyReviewQuery,
    app: AppHandle,
) -> Result<WeeklyReviewState, String> {
    load_state(&database(&app)?, &input)
}

#[tauri::command]
pub(crate) fn save_weekly_review(
    input: SaveWeeklyReviewInput,
    app: AppHandle,
) -> Result<WeeklyReviewRecord, String> {
    save_review(&mut database(&app)?, &input)
}

#[cfg(test)]
mod tests {
    use super::{load_state, save_review, SaveWeeklyReviewInput, WeeklyReviewQuery};
    use rusqlite::Connection;

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        for migration in [
            include_str!("../migrations/0001_cr_device_reminder.sql"),
            include_str!("../migrations/0002_cr_seed_presets.sql"),
            include_str!("../migrations/0003_ch_core_hour.sql"),
            include_str!("../migrations/0004_ch_session_durations.sql"),
            include_str!("../migrations/0005_ch_session_activity.sql"),
            include_str!("../migrations/0006_pause_hydrate.sql"),
            include_str!("../migrations/0007_ch_planned_blocks.sql"),
            include_str!("../migrations/0008_pause_hydrate_schedule_policy.sql"),
            include_str!("../migrations/0009_pause_hydrate_natural_rest.sql"),
            include_str!("../migrations/0012_activity_assist.sql"),
            include_str!("../migrations/0013_activity_assist_suggestions.sql"),
            include_str!("../migrations/0015_ch_daily_reviews.sql"),
            include_str!("../migrations/0016_ch_weekly_reviews.sql"),
        ] {
            connection.execute_batch(migration).unwrap();
        }
        connection
            .execute("INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated')", [])
            .unwrap();
        connection
    }

    #[test]
    fn aggregates_a_week_and_applies_the_next_goal() {
        let mut connection = database();
        connection
            .execute_batch(
                "INSERT INTO ch_plans VALUES ('plan-1', 'local-user', 'Plan', NULL, '2026-08-24T08:00:00Z', '2026-08-24T10:00:00Z', 'completed', NULL, 'created', 'updated', 0);
                 INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('session-1', 'local-user', '2026-08-24T08:00:00Z', '2026-08-24T09:30:00Z', 30, 5400, 'Work', NULL, 0, 0);
                 INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('session-2', 'local-user', '2026-08-30T23:30:00Z', '2026-08-31T00:30:00Z', 30, 3600, 'Late work', NULL, 0, 0);
                 INSERT INTO ph_reminder_events VALUES ('break-1', 'local-user', 'break', 'completed', '2026-08-25T10:00:00Z', 'manual');
                 INSERT INTO ph_reminder_events VALUES ('water-1', 'local-user', 'hydration', 'completed', '2026-08-26T11:00:00Z', 'manual');
                 INSERT INTO ch_daily_reviews VALUES ('daily-1', 'local-user', '2026-08-24', 'on-track', 90, 'created', 'updated');
                 INSERT INTO ch_daily_reviews VALUES ('daily-2', 'local-user', '2026-08-25', 'interrupted', 90, 'created', 'updated');
                 INSERT INTO ch_daily_reviews VALUES ('daily-3', 'local-user', '2026-08-30', 'on-track', 90, 'created', 'updated');
                 INSERT INTO aa_activity_samples VALUES ('sample-1', 'local-user', 'code.exe', '2026-08-27T12:00:00Z', '2026-08-27T12:03:00Z');
                 INSERT INTO aa_activity_suggestions VALUES ('suggestion-1', 'local-user', 'sample-1', 'code.exe', '2026-08-27T12:00:00Z', '2026-08-27T12:03:00Z', 'pending', NULL, 'created', 'updated');
                 INSERT INTO cr_devices (id, user_id, name, device_type, capacity_mah, notes, threshold_percent, created_at, updated_at) VALUES ('device-1', 'local-user', 'Mouse', 'wireless-mouse', NULL, NULL, 20, 'created', 'updated');
                 INSERT INTO cr_computed_reminder_states (id, device_id, heuristic_version, estimated_battery_percent, estimated_days_until_threshold, reminder_due_at, status, basis, last_charge_event_id, computed_at, created_at, updated_at) VALUES ('state-1', 'device-1', 'v1', 40, 2, '2026-08-29T12:00:00Z', 'tracking', 'basis', NULL, '2026-08-20T12:00:00Z', 'created', 'updated');",
            )
            .unwrap();
        let query = WeeklyReviewQuery {
            user_id: "local-user".into(),
            week_started_on: "2026-08-24".into(),
            started_at: "2026-08-24T00:00:00Z".into(),
            ended_at: "2026-08-31T00:00:00Z".into(),
            observed_at: "2026-08-30T18:00:00Z".into(),
        };
        let state = load_state(&connection, &query).unwrap();
        assert_eq!((state.planned_minutes, state.actual_minutes), (120, 120));
        assert_eq!((state.session_count, state.longest_focus_minutes), (2, 90));
        assert_eq!((state.break_count, state.hydration_count), (1, 1));
        assert_eq!(state.daily_review_count, 3);
        assert_eq!(state.pending_suggestion_count, 1);
        assert_eq!(state.device_attention_count, 1);
        let offset_week = load_state(
            &connection,
            &WeeklyReviewQuery {
                user_id: "local-user".into(),
                week_started_on: "2026-08-24".into(),
                started_at: "2026-08-24T00:00:00+08:00".into(),
                ended_at: "2026-08-31T00:00:00+08:00".into(),
                observed_at: "2026-08-30T18:00:00Z".into(),
            },
        )
        .unwrap();
        assert_eq!(offset_week.daily_review_count, 3);
        assert_eq!(offset_week.actual_minutes, 90);
        assert!(load_state(
            &connection,
            &WeeklyReviewQuery {
                user_id: "local-user".into(),
                week_started_on: "2026-08-25".into(),
                started_at: "2026-08-25T00:00:00Z".into(),
                ended_at: "2026-09-01T00:00:00Z".into(),
                observed_at: "2026-08-30T18:00:00Z".into(),
            },
        )
        .is_err());

        let input = SaveWeeklyReviewInput {
            id: "weekly-1".into(),
            user_id: "local-user".into(),
            week_started_on: "2026-08-24".into(),
            outcome: "on-track".into(),
            next_goal_minutes: 105,
            started_at: "2026-08-24T00:00:00Z".into(),
            ended_at: "2026-08-31T00:00:00Z".into(),
            saved_at: "2026-08-30T18:00:00Z".into(),
        };
        assert_eq!(save_review(&mut connection, &input).unwrap_err(), "open-items");
        connection
            .execute("UPDATE aa_activity_suggestions SET status = 'dismissed'", [])
            .unwrap();
        connection
            .execute_batch(
                "CREATE TRIGGER fail_weekly_goal BEFORE INSERT ON ch_settings
                 WHEN NEW.key = 'daily_focus_goal_minutes'
                 BEGIN SELECT RAISE(ABORT, 'goal-fail'); END;",
            )
            .unwrap();
        assert!(save_review(&mut connection, &input).is_err());
        let review_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM ch_weekly_reviews", [], |row| row.get(0))
            .unwrap();
        assert_eq!(review_count, 0);
        connection.execute("DROP TRIGGER fail_weekly_goal", []).unwrap();
        let record = save_review(&mut connection, &input).unwrap();
        assert_eq!(record.next_goal_minutes, 105);
        let goal: String = connection
            .query_row("SELECT value FROM ch_settings WHERE key = 'daily_focus_goal_minutes'", [], |row| row.get(0))
            .unwrap();
        assert_eq!(goal, "105");
    }
}
