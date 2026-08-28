use crate::data_control::DB_FILENAME;
use chrono::{DateTime, NaiveDate, NaiveTime, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const DEFAULT_DAILY_GOAL_MINUTES: i64 = 120;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DailyReviewQuery {
    user_id: String,
    local_date: String,
    started_at: String,
    ended_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveDailyReviewInput {
    id: String,
    user_id: String,
    local_date: String,
    outcome: String,
    next_goal_minutes: i64,
    started_at: String,
    ended_at: String,
    saved_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DailyReviewRecord {
    id: String,
    local_date: String,
    outcome: String,
    next_goal_minutes: i64,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DailyReviewState {
    local_date: String,
    started_at: String,
    ended_at: String,
    planned_minutes: i64,
    actual_minutes: i64,
    plan_count: i64,
    completed_plan_count: i64,
    skipped_plan_count: i64,
    pending_plan_count: i64,
    pending_suggestion_count: i64,
    break_count: i64,
    hydration_count: i64,
    current_goal_minutes: i64,
    review: Option<DailyReviewRecord>,
}

fn database(app: &AppHandle) -> Result<Connection, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    Connection::open(path).map_err(|error| error.to_string())
}

fn day_bounds(input: &DailyReviewQuery) -> Result<(DateTime<Utc>, DateTime<Utc>), String> {
    let local_date = NaiveDate::parse_from_str(&input.local_date, "%Y-%m-%d")
        .map_err(|_| "invalid-date".to_string())?;
    let started_at = DateTime::parse_from_rfc3339(&input.started_at)
        .map_err(|_| "invalid-date".to_string())?;
    let ended_at = DateTime::parse_from_rfc3339(&input.ended_at)
        .map_err(|_| "invalid-date".to_string())?;
    let next_date = local_date.succ_opt().ok_or_else(|| "invalid-date".to_string())?;
    let duration_seconds = (ended_at - started_at).num_seconds();
    if started_at.date_naive() != local_date
        || ended_at.date_naive() != next_date
        || started_at.time() != NaiveTime::MIN
        || ended_at.time() != NaiveTime::MIN
        || !(22 * 3600..=26 * 3600).contains(&duration_seconds)
    {
        return Err("invalid-date".to_string());
    }
    Ok((started_at.with_timezone(&Utc), ended_at.with_timezone(&Utc)))
}

fn overlap_milliseconds(
    started_at: DateTime<Utc>,
    ended_at: DateTime<Utc>,
    day_started_at: DateTime<Utc>,
    day_ended_at: DateTime<Utc>,
) -> i64 {
    let start = started_at.timestamp_millis().max(day_started_at.timestamp_millis());
    let end = ended_at.timestamp_millis().min(day_ended_at.timestamp_millis());
    (end - start).max(0)
}

fn load_state(connection: &Connection, input: &DailyReviewQuery) -> Result<DailyReviewState, String> {
    let (day_started_at, day_ended_at) = day_bounds(input)?;
    let started_at = day_started_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    let ended_at = day_ended_at.to_rfc3339_opts(SecondsFormat::Millis, true);
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
        let start = DateTime::parse_from_rfc3339(start)
            .map_err(|_| "invalid-date".to_string())?
            .with_timezone(&Utc);
        let end = DateTime::parse_from_rfc3339(end)
            .map_err(|_| "invalid-date".to_string())?
            .with_timezone(&Utc);
        Ok::<_, String>(
            total + overlap_milliseconds(start, end, day_started_at, day_ended_at) / 60_000,
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
    let actual_seconds = sessions.iter().try_fold(0_i64, |total, (start, end, elapsed)| {
        let start = DateTime::parse_from_rfc3339(start)
            .map_err(|_| "invalid-date".to_string())?
            .with_timezone(&Utc);
        let end = DateTime::parse_from_rfc3339(end)
            .map_err(|_| "invalid-date".to_string())?
            .with_timezone(&Utc);
        let wall_milliseconds = (end - start).num_milliseconds().max(1);
        let overlap = overlap_milliseconds(start, end, day_started_at, day_ended_at);
        Ok::<_, String>(total + (*elapsed as f64 * overlap as f64 / wall_milliseconds as f64).round() as i64)
    })?;
    let completed_plan_count = plans.iter().filter(|(_, _, status)| status == "completed").count() as i64;
    let skipped_plan_count = plans.iter().filter(|(_, _, status)| status == "skipped").count() as i64;
    let pending_plan_count = plans.iter().filter(|(_, _, status)| status == "planned").count() as i64;
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
            "SELECT id, local_date, outcome, next_goal_minutes, created_at, updated_at FROM ch_daily_reviews WHERE user_id = ?1 AND local_date = ?2",
            params![input.user_id, input.local_date],
            |row| {
                Ok(DailyReviewRecord {
                    id: row.get(0)?,
                    local_date: row.get(1)?,
                    outcome: row.get(2)?,
                    next_goal_minutes: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    Ok(DailyReviewState {
        local_date: input.local_date.clone(),
        started_at: input.started_at.clone(),
        ended_at: input.ended_at.clone(),
        planned_minutes,
        actual_minutes: (actual_seconds + 30) / 60,
        plan_count: plans.len() as i64,
        completed_plan_count,
        skipped_plan_count,
        pending_plan_count,
        pending_suggestion_count,
        break_count: reminder_counts.0,
        hydration_count: reminder_counts.1,
        current_goal_minutes,
        review,
    })
}

fn save_review(
    connection: &mut Connection,
    input: &SaveDailyReviewInput,
) -> Result<DailyReviewRecord, String> {
    let (day_started_at, day_ended_at) = day_bounds(&DailyReviewQuery {
        user_id: input.user_id.clone(),
        local_date: input.local_date.clone(),
        started_at: input.started_at.clone(),
        ended_at: input.ended_at.clone(),
    })
    .map_err(|_| "invalid-review".to_string())?;
    let started_at = day_started_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    let ended_at = day_ended_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    DateTime::parse_from_rfc3339(&input.saved_at)
        .map_err(|_| "invalid-review".to_string())?;
    if !matches!(input.outcome.as_str(), "on-track" | "overcommitted" | "underplanned" | "interrupted")
        || !(15..=720).contains(&input.next_goal_minutes)
        || input.id.trim().is_empty()
    {
        return Err("invalid-review".to_string());
    }
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
            "INSERT INTO ch_daily_reviews (id, user_id, local_date, outcome, next_goal_minutes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(user_id, local_date) DO UPDATE SET outcome = excluded.outcome, next_goal_minutes = excluded.next_goal_minutes, updated_at = excluded.updated_at",
            params![input.id, input.user_id, input.local_date, input.outcome, input.next_goal_minutes, input.saved_at],
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
            "SELECT id, local_date, outcome, next_goal_minutes, created_at, updated_at FROM ch_daily_reviews WHERE user_id = ?1 AND local_date = ?2",
            params![input.user_id, input.local_date],
            |row| {
                Ok(DailyReviewRecord {
                    id: row.get(0)?,
                    local_date: row.get(1)?,
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
pub(crate) fn load_daily_review(
    input: DailyReviewQuery,
    app: AppHandle,
) -> Result<DailyReviewState, String> {
    load_state(&database(&app)?, &input)
}

#[tauri::command]
pub(crate) fn save_daily_review(
    input: SaveDailyReviewInput,
    app: AppHandle,
) -> Result<DailyReviewRecord, String> {
    save_review(&mut database(&app)?, &input)
}

#[cfg(test)]
mod tests {
    use super::{load_state, save_review, DailyReviewQuery, SaveDailyReviewInput};
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
            include_str!("../migrations/0009_pause_hydrate_natural_rest.sql"),
            include_str!("../migrations/0012_activity_assist.sql"),
            include_str!("../migrations/0013_activity_assist_suggestions.sql"),
            include_str!("../migrations/0015_ch_daily_reviews.sql"),
        ] {
            connection.execute_batch(migration).unwrap();
        }
        connection
            .execute("INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated')", [])
            .unwrap();
        connection
    }

    #[test]
    fn aggregates_the_day_and_applies_the_next_goal_atomically() {
        let mut connection = database();
        connection
            .execute_batch(
                "INSERT INTO ch_plans VALUES ('plan-1', 'local-user', 'Plan', NULL, '2026-08-28T08:00:00Z', '2026-08-28T09:00:00Z', 'completed', NULL, 'created', 'updated', 0);
                 INSERT INTO ch_plans VALUES ('plan-2', 'local-user', 'Late plan', NULL, '2026-08-28T23:30:00Z', '2026-08-29T00:30:00Z', 'completed', NULL, 'created', 'updated', 0);
                 INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('session-1', 'local-user', '2026-08-28T08:00:00Z', '2026-08-28T08:45:00Z', 30, 2700, 'Work', NULL, 0, 0);
                 INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('session-2', 'local-user', '2026-08-28T23:30:00Z', '2026-08-29T00:30:00Z', 30, 3600, 'Late work', NULL, 0, 0);
                 INSERT INTO ph_reminder_events VALUES ('break-1', 'local-user', 'break', 'completed', '2026-08-28T10:00:00Z', 'manual');
                 INSERT INTO ph_reminder_events VALUES ('water-1', 'local-user', 'hydration', 'completed', '2026-08-28T11:00:00Z', 'manual');
                 INSERT INTO aa_activity_samples VALUES ('sample-1', 'local-user', 'code.exe', '2026-08-28T12:00:00Z', '2026-08-28T12:03:00Z');
                 INSERT INTO aa_activity_samples VALUES ('sample-2', 'local-user', 'terminal.exe', '2026-08-28T23:55:00Z', '2026-08-29T00:05:00Z');
                 INSERT INTO aa_activity_suggestions VALUES ('suggestion-1', 'local-user', 'sample-1', 'code.exe', '2026-08-28T12:00:00Z', '2026-08-28T12:03:00Z', 'pending', NULL, 'created', 'updated');
                 INSERT INTO aa_activity_suggestions VALUES ('suggestion-2', 'local-user', 'sample-2', 'terminal.exe', '2026-08-28T23:55:00Z', '2026-08-29T00:05:00Z', 'pending', NULL, 'created', 'updated');",
            )
            .unwrap();
        let query = DailyReviewQuery {
            user_id: "local-user".into(),
            local_date: "2026-08-28".into(),
            started_at: "2026-08-28T00:00:00Z".into(),
            ended_at: "2026-08-29T00:00:00Z".into(),
        };
        assert_eq!(
            load_state(
                &connection,
                &DailyReviewQuery {
                    user_id: "local-user".into(),
                    local_date: "2026-08-28".into(),
                    started_at: "2026-08-27T00:00:00Z".into(),
                    ended_at: "2026-08-28T00:00:00Z".into(),
                },
            )
            .unwrap_err(),
            "invalid-date",
        );
        let state = load_state(&connection, &query).unwrap();
        assert_eq!((state.planned_minutes, state.actual_minutes), (90, 75));
        assert_eq!((state.break_count, state.hydration_count), (1, 1));
        assert_eq!(state.pending_suggestion_count, 2);
        let offset_day = load_state(
            &connection,
            &DailyReviewQuery {
                user_id: "local-user".into(),
                local_date: "2026-08-28".into(),
                started_at: "2026-08-28T00:00:00+08:00".into(),
                ended_at: "2026-08-29T00:00:00+08:00".into(),
            },
        )
        .unwrap();
        assert_eq!((offset_day.planned_minutes, offset_day.actual_minutes), (60, 45));
        assert_eq!(offset_day.pending_suggestion_count, 1);
        let next_day = load_state(
            &connection,
            &DailyReviewQuery {
                user_id: "local-user".into(),
                local_date: "2026-08-29".into(),
                started_at: "2026-08-29T00:00:00Z".into(),
                ended_at: "2026-08-30T00:00:00Z".into(),
            },
        )
        .unwrap();
        assert_eq!((next_day.planned_minutes, next_day.actual_minutes), (30, 30));
        assert_eq!(next_day.pending_suggestion_count, 1);

        let input = || SaveDailyReviewInput {
            id: "review-1".into(),
            user_id: "local-user".into(),
            local_date: "2026-08-28".into(),
            outcome: "on-track".into(),
            next_goal_minutes: 90,
            started_at: "2026-08-28T00:00:00Z".into(),
            ended_at: "2026-08-29T00:00:00Z".into(),
            saved_at: "2026-08-28T18:00:00Z".into(),
        };
        assert_eq!(save_review(&mut connection, &input()).unwrap_err(), "open-items");
        connection
            .execute("UPDATE aa_activity_suggestions SET status = 'dismissed'", [])
            .unwrap();
        connection
            .execute_batch(
                "CREATE TRIGGER fail_daily_goal BEFORE INSERT ON ch_settings
                 WHEN NEW.key = 'daily_focus_goal_minutes'
                 BEGIN SELECT RAISE(ABORT, 'goal-fail'); END;",
            )
            .unwrap();
        assert!(save_review(&mut connection, &input()).is_err());
        let review_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM ch_daily_reviews", [], |row| row.get(0))
            .unwrap();
        assert_eq!(review_count, 0);
        connection.execute("DROP TRIGGER fail_daily_goal", []).unwrap();

        let review = save_review(&mut connection, &input()).unwrap();
        assert_eq!(review.next_goal_minutes, 90);
        let goal: String = connection
            .query_row("SELECT value FROM ch_settings WHERE key = 'daily_focus_goal_minutes'", [], |row| row.get(0))
            .unwrap();
        assert_eq!(goal, "90");
    }
}
