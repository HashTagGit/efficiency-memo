use crate::core_hour::{save_session_block_in_transaction, SessionBlockInput};
use crate::data_control::DB_FILENAME;
use crate::foreground_application;
use chrono::{DateTime, Duration, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const DEFAULT_RETENTION_HOURS: i64 = 72;
const SAMPLE_CONTINUATION_SECONDS: i64 = 90;
const RECENT_SAMPLE_LIMIT: i64 = 20;
const COLLECTION_INTERVAL_SECONDS: u64 = 30;
const MIN_SUGGESTION_SECONDS: i64 = 120;
const SUGGESTION_STABILITY_SECONDS: i64 = SAMPLE_CONTINUATION_SECONDS + 1;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivityAssistPreferences {
    enabled: bool,
    paused: bool,
    retention_hours: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivitySample {
    id: String,
    application_id: String,
    started_at: String,
    last_seen_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivitySuggestion {
    id: String,
    application_id: String,
    started_at: String,
    ended_at: String,
    suggested_activity: String,
    suggested_tag_id: Option<String>,
    rule_applied: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivityRule {
    application_id: String,
    activity: String,
    default_tag_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivityAssistState {
    preferences: ActivityAssistPreferences,
    exclusions: Vec<String>,
    recent_samples: Vec<ActivitySample>,
    pending_suggestions: Vec<ActivitySuggestion>,
    rules: Vec<ActivityRule>,
    sample_count: i64,
    collector_available: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveActivityAssistInput {
    user_id: String,
    enabled: bool,
    paused: bool,
    retention_hours: i64,
    exclusions: Vec<String>,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AcceptActivitySuggestionInput {
    user_id: String,
    suggestion_id: String,
    activity: String,
    default_tag_id: Option<String>,
    started_at: String,
    ended_at: String,
    start_local_date: String,
    end_local_date: String,
    new_session_id: String,
    new_check_in_id: String,
    new_entry_id: String,
    accepted_at: String,
    remember_rule: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveActivityRuleInput {
    user_id: String,
    application_id: String,
    activity: String,
    default_tag_id: Option<String>,
    updated_at: String,
}

fn database(app: &AppHandle) -> Result<Connection, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    Connection::open(path).map_err(|error| error.to_string())
}

fn normalize_application_id(value: &str) -> Option<String> {
    let normalized = value.trim().to_lowercase();
    (!normalized.is_empty() && normalized.chars().count() <= 128).then_some(normalized)
}

fn parse_time(value: &str) -> Result<DateTime<chrono::FixedOffset>, String> {
    DateTime::parse_from_rfc3339(value).map_err(|_| "invalid-observed-at".to_string())
}

fn load_preferences(connection: &Connection, user_id: &str) -> Result<ActivityAssistPreferences, String> {
    connection
        .query_row(
            "SELECT enabled, paused, retention_hours FROM aa_preferences WHERE user_id = ?1",
            [user_id],
            |row| {
                Ok(ActivityAssistPreferences {
                    enabled: row.get(0)?,
                    paused: row.get(1)?,
                    retention_hours: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())
        .map(|value| {
            value.unwrap_or(ActivityAssistPreferences {
                enabled: false,
                paused: false,
                retention_hours: DEFAULT_RETENTION_HOURS,
            })
        })
}

fn prune_samples(
    connection: &Connection,
    user_id: &str,
    retention_hours: i64,
    now: DateTime<chrono::FixedOffset>,
) -> Result<(), String> {
    let cutoff = (now - Duration::hours(retention_hours))
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    connection
        .execute(
            "DELETE FROM aa_activity_samples WHERE user_id = ?1 AND last_seen_at < ?2",
            params![user_id, cutoff],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn record_sample(
    connection: &Connection,
    user_id: &str,
    application_id: &str,
    observed_at: &str,
) -> Result<bool, String> {
    let observed = parse_time(observed_at)?;
    let preferences = load_preferences(connection, user_id)?;
    prune_samples(connection, user_id, preferences.retention_hours, observed)?;
    if !preferences.enabled || preferences.paused {
        return Ok(false);
    }
    let application_id = normalize_application_id(application_id)
        .ok_or_else(|| "invalid-application-id".to_string())?;
    let excluded: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM aa_exclusions WHERE user_id = ?1 AND application_id = ?2)",
            params![user_id, application_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if excluded {
        return Ok(false);
    }
    let latest: Option<(String, String, String)> = connection
        .query_row(
            "SELECT id, application_id, last_seen_at FROM aa_activity_samples WHERE user_id = ?1 ORDER BY last_seen_at DESC LIMIT 1",
            [user_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((id, latest_application, last_seen_at)) = latest {
        let last_seen = parse_time(&last_seen_at)?;
        let gap = observed.signed_duration_since(last_seen).num_seconds();
        if latest_application == application_id && (0..=SAMPLE_CONTINUATION_SECONDS).contains(&gap) {
            connection
                .execute(
                    "UPDATE aa_activity_samples SET last_seen_at = ?1 WHERE id = ?2 AND user_id = ?3",
                    params![observed_at, id, user_id],
                )
                .map_err(|error| error.to_string())?;
            return Ok(true);
        }
    }
    let id = format!("{user_id}:{}", observed.timestamp_millis());
    connection
        .execute(
            "INSERT INTO aa_activity_samples (id, user_id, application_id, started_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, user_id, application_id, observed_at],
        )
        .map_err(|error| error.to_string())?;
    Ok(true)
}

fn generate_suggestions(
    connection: &Connection,
    user_id: &str,
    now: DateTime<chrono::FixedOffset>,
) -> Result<(), String> {
    let stable_before = (now - Duration::seconds(SUGGESTION_STABILITY_SECONDS))
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let created_at = now
        .with_timezone(&Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    connection
        .execute(
            "INSERT INTO aa_activity_suggestions (id, user_id, source_sample_id, application_id, started_at, ended_at, status, created_at, updated_at)
             SELECT 'suggestion:' || s.id, s.user_id, s.id, s.application_id, s.started_at, s.last_seen_at, 'pending', ?3, ?3
             FROM aa_activity_samples s
             WHERE s.user_id = ?1
               AND CAST(strftime('%s', s.last_seen_at) AS INTEGER) - CAST(strftime('%s', s.started_at) AS INTEGER) >= ?4
               AND julianday(s.last_seen_at) <= julianday(?2)
               AND NOT EXISTS (SELECT 1 FROM aa_activity_suggestions a WHERE a.source_sample_id = s.id)
               AND NOT EXISTS (
                 SELECT 1 FROM ch_sessions c
                 WHERE c.user_id = s.user_id
                   AND julianday(c.started_at) < julianday(s.last_seen_at)
                   AND (c.ended_at IS NULL OR julianday(c.ended_at) > julianday(s.started_at))
               )",
            params![user_id, stable_before, created_at, MIN_SUGGESTION_SECONDS],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn upsert_rule(
    transaction: &rusqlite::Transaction<'_>,
    user_id: &str,
    application_id: &str,
    activity: &str,
    default_tag_id: Option<&str>,
    updated_at: &str,
) -> Result<(), String> {
    let application_id = normalize_application_id(application_id)
        .ok_or_else(|| "invalid-rule".to_string())?;
    let activity = activity.trim();
    if activity.is_empty() || activity.chars().count() > 160 || parse_time(updated_at).is_err() {
        return Err("invalid-rule".to_string());
    }
    if let Some(tag_id) = default_tag_id {
        let valid: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM ch_tags WHERE id = ?1 AND user_id = ?2 AND is_archived = 0)",
                params![tag_id, user_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !valid {
            return Err("invalid-tag".to_string());
        }
    }
    transaction
        .execute(
            "INSERT INTO aa_activity_rules (user_id, application_id, activity, default_tag_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5) ON CONFLICT(user_id, application_id) DO UPDATE SET activity = excluded.activity, default_tag_id = excluded.default_tag_id, updated_at = excluded.updated_at",
            params![user_id, application_id, activity, default_tag_id, updated_at],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn load_state(connection: &Connection, user_id: &str) -> Result<ActivityAssistState, String> {
    let preferences = load_preferences(connection, user_id)?;
    let exclusions = {
        let mut statement = connection
            .prepare("SELECT application_id FROM aa_exclusions WHERE user_id = ?1 ORDER BY application_id")
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map([user_id], |row| row.get(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let recent_samples = {
        let mut statement = connection
            .prepare("SELECT id, application_id, started_at, last_seen_at FROM aa_activity_samples WHERE user_id = ?1 ORDER BY last_seen_at DESC LIMIT ?2")
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![user_id, RECENT_SAMPLE_LIMIT], |row| {
                Ok(ActivitySample {
                    id: row.get(0)?,
                    application_id: row.get(1)?,
                    started_at: row.get(2)?,
                    last_seen_at: row.get(3)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let pending_suggestions = {
        let mut statement = connection
            .prepare(
                "SELECT s.id, s.application_id, s.started_at, s.ended_at,
                        COALESCE(r.activity, s.application_id),
                        CASE WHEN t.id IS NULL THEN NULL ELSE r.default_tag_id END,
                        r.application_id IS NOT NULL
                 FROM aa_activity_suggestions s
                 LEFT JOIN aa_activity_rules r ON r.user_id = s.user_id AND r.application_id = s.application_id
                 LEFT JOIN ch_tags t ON t.id = r.default_tag_id AND t.user_id = s.user_id AND t.is_archived = 0
                 WHERE s.user_id = ?1 AND s.status = 'pending'
                 ORDER BY s.started_at DESC LIMIT ?2",
            )
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map(params![user_id, RECENT_SAMPLE_LIMIT], |row| {
                Ok(ActivitySuggestion {
                    id: row.get(0)?,
                    application_id: row.get(1)?,
                    started_at: row.get(2)?,
                    ended_at: row.get(3)?,
                    suggested_activity: row.get(4)?,
                    suggested_tag_id: row.get(5)?,
                    rule_applied: row.get(6)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let rules = {
        let mut statement = connection
            .prepare(
                "SELECT r.application_id, r.activity,
                        CASE WHEN t.id IS NULL THEN NULL ELSE r.default_tag_id END
                 FROM aa_activity_rules r
                 LEFT JOIN ch_tags t ON t.id = r.default_tag_id AND t.user_id = r.user_id AND t.is_archived = 0
                 WHERE r.user_id = ?1 ORDER BY r.application_id",
            )
            .map_err(|error| error.to_string())?;
        let values = statement
            .query_map([user_id], |row| {
                Ok(ActivityRule {
                    application_id: row.get(0)?,
                    activity: row.get(1)?,
                    default_tag_id: row.get(2)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        values
    };
    let sample_count = connection
        .query_row(
            "SELECT COUNT(*) FROM aa_activity_samples WHERE user_id = ?1",
            [user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok(ActivityAssistState {
        preferences,
        exclusions,
        recent_samples,
        pending_suggestions,
        rules,
        sample_count,
        collector_available: foreground_application::available(),
    })
}

#[tauri::command]
pub(crate) fn load_activity_assist_state(
    user_id: String,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    let connection = database(&app)?;
    generate_suggestions(&connection, &user_id, Utc::now().fixed_offset())?;
    load_state(&connection, &user_id)
}

#[tauri::command]
pub(crate) fn save_activity_assist_preferences(
    input: SaveActivityAssistInput,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    if !matches!(input.retention_hours, 24 | 48 | 72 | 168) || parse_time(&input.updated_at).is_err() {
        return Err("invalid-preferences".to_string());
    }
    let mut exclusions = input
        .exclusions
        .iter()
        .map(|value| normalize_application_id(value).ok_or_else(|| "invalid-exclusion".to_string()))
        .collect::<Result<Vec<_>, _>>()?;
    exclusions.sort();
    exclusions.dedup();
    if exclusions.len() > 64 {
        return Err("invalid-exclusion".to_string());
    }
    let mut connection = database(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO aa_preferences (user_id, enabled, paused, retention_hours, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, paused = excluded.paused, retention_hours = excluded.retention_hours, updated_at = excluded.updated_at",
            params![input.user_id, input.enabled, input.paused, input.retention_hours, input.updated_at],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM aa_exclusions WHERE user_id = ?1", [&input.user_id])
        .map_err(|error| error.to_string())?;
    for application_id in exclusions {
        transaction
            .execute(
                "INSERT INTO aa_exclusions (user_id, application_id, created_at) VALUES (?1, ?2, ?3)",
                params![input.user_id, application_id, input.updated_at],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction
        .execute(
            "DELETE FROM aa_activity_samples WHERE user_id = ?1 AND (?2 = 0 OR application_id IN (SELECT application_id FROM aa_exclusions WHERE user_id = ?1))",
            params![input.user_id, input.enabled],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "DELETE FROM aa_activity_suggestions WHERE user_id = ?1 AND (?2 = 0 OR application_id IN (SELECT application_id FROM aa_exclusions WHERE user_id = ?1))",
            params![input.user_id, input.enabled],
        )
        .map_err(|error| error.to_string())?;
    prune_samples(
        &transaction,
        &input.user_id,
        input.retention_hours,
        parse_time(&input.updated_at)?,
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    load_state(&connection, &input.user_id)
}

fn collect_once(observed_at: &str, app: &AppHandle) -> Result<bool, String> {
    let connection = database(app)?;
    let user_id: Option<String> = connection
        .query_row(
            "SELECT user_id FROM aa_preferences ORDER BY updated_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some(user_id) = user_id else {
        return Ok(false);
    };
    let observed = parse_time(observed_at)?;
    let preferences = load_preferences(&connection, &user_id)?;
    prune_samples(
        &connection,
        &user_id,
        preferences.retention_hours,
        observed,
    )?;
    generate_suggestions(&connection, &user_id, observed)?;
    if !preferences.enabled || preferences.paused {
        return Ok(false);
    }
    let Some(application_id) = foreground_application::read() else {
        return Ok(false);
    };
    if std::env::current_exe()
        .ok()
        .and_then(|path| path.file_name().and_then(|value| value.to_str()).map(str::to_owned))
        .and_then(|value| normalize_application_id(&value))
        .as_deref()
        == normalize_application_id(&application_id).as_deref()
    {
        return Ok(false);
    }
    record_sample(&connection, &user_id, &application_id, observed_at)
}

#[tauri::command]
pub(crate) fn dismiss_activity_assist_suggestion(
    user_id: String,
    suggestion_id: String,
    dismissed_at: String,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    parse_time(&dismissed_at)?;
    let connection = database(&app)?;
    let changed = connection
        .execute(
            "UPDATE aa_activity_suggestions SET status = 'dismissed', updated_at = ?1 WHERE id = ?2 AND user_id = ?3 AND status = 'pending'",
            params![dismissed_at, suggestion_id, user_id],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("not-found".to_string());
    }
    load_state(&connection, &user_id)
}

#[tauri::command]
pub(crate) fn accept_activity_assist_suggestion(
    input: AcceptActivitySuggestionInput,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    accept_suggestion(input, &mut database(&app)?)
}

fn accept_suggestion(
    input: AcceptActivitySuggestionInput,
    connection: &mut Connection,
) -> Result<ActivityAssistState, String> {
    parse_time(&input.accepted_at)?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let application_id: Option<String> = transaction
        .query_row(
            "SELECT application_id FROM aa_activity_suggestions WHERE id = ?1 AND user_id = ?2 AND status = 'pending'",
            params![input.suggestion_id, input.user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let application_id = application_id.ok_or_else(|| "not-found".to_string())?;
    let remembered_activity = input.activity.clone();
    let remembered_tag_id = input.default_tag_id.clone();
    let session_id = save_session_block_in_transaction(
        SessionBlockInput {
            id: None,
            user_id: input.user_id.clone(),
            activity: input.activity,
            default_tag_id: input.default_tag_id,
            started_at: input.started_at,
            ended_at: input.ended_at,
            adjust_duration: false,
            adjust_tag: false,
            start_local_date: input.start_local_date,
            end_local_date: input.end_local_date,
            new_session_id: input.new_session_id,
            new_check_in_id: input.new_check_in_id,
            new_entry_id: input.new_entry_id,
            source_plan_id: None,
        },
        &transaction,
    )?;
    let changed = transaction
        .execute(
            "UPDATE aa_activity_suggestions SET status = 'accepted', session_id = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4 AND status = 'pending'",
            params![session_id, input.accepted_at, input.suggestion_id, input.user_id],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("not-found".to_string());
    }
    if input.remember_rule {
        upsert_rule(
            &transaction,
            &input.user_id,
            &application_id,
            &remembered_activity,
            remembered_tag_id.as_deref(),
            &input.accepted_at,
        )?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    load_state(connection, &input.user_id)
}

#[tauri::command]
pub(crate) fn save_activity_assist_rule(
    input: SaveActivityRuleInput,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    let mut connection = database(&app)?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    upsert_rule(
        &transaction,
        &input.user_id,
        &input.application_id,
        &input.activity,
        input.default_tag_id.as_deref(),
        &input.updated_at,
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    load_state(&connection, &input.user_id)
}

#[tauri::command]
pub(crate) fn delete_activity_assist_rule(
    user_id: String,
    application_id: String,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    let application_id = normalize_application_id(&application_id)
        .ok_or_else(|| "invalid-rule".to_string())?;
    let connection = database(&app)?;
    let changed = connection
        .execute(
            "DELETE FROM aa_activity_rules WHERE user_id = ?1 AND application_id = ?2",
            params![user_id, application_id],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("not-found".to_string());
    }
    load_state(&connection, &user_id)
}

pub(crate) fn setup(app: AppHandle) {
    if !foreground_application::available() {
        return;
    }
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_secs(COLLECTION_INTERVAL_SECONDS));
        let observed_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
        let _ = collect_once(&observed_at, &app);
    });
}

#[tauri::command]
pub(crate) fn clear_activity_assist_samples(
    user_id: String,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    let connection = database(&app)?;
    connection
        .execute("DELETE FROM aa_activity_samples WHERE user_id = ?1", [&user_id])
        .map_err(|error| error.to_string())?;
    load_state(&connection, &user_id)
}

#[cfg(test)]
mod tests {
    use super::{
        accept_suggestion, generate_suggestions, load_state, record_sample,
        AcceptActivitySuggestionInput,
    };
    use chrono::DateTime;
    use rusqlite::Connection;

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "PRAGMA foreign_keys = ON;
                CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, created_at TEXT, updated_at TEXT);
                INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated');",
            )
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0012_activity_assist.sql"))
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0003_ch_core_hour.sql"))
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0004_ch_session_durations.sql"))
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0005_ch_session_activity.sql"))
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0013_activity_assist_suggestions.sql"))
            .unwrap();
        connection
            .execute_batch(include_str!("../migrations/0014_activity_assist_rules.sql"))
            .unwrap();
        connection
            .execute(
                "INSERT INTO aa_preferences VALUES ('local-user', 1, 0, 24, '2026-08-28T08:00:00Z')",
                [],
            )
            .unwrap();
        connection
    }

    #[test]
    fn samples_merge_prune_and_respect_exclusions() {
        let connection = database();
        assert!(record_sample(
            &connection,
            "local-user",
            "Code.EXE",
            "2026-08-28T08:00:00Z"
        )
        .unwrap());
        assert!(record_sample(
            &connection,
            "local-user",
            "code.exe",
            "2026-08-28T08:00:30Z"
        )
        .unwrap());
        connection
            .execute(
                "INSERT INTO aa_exclusions VALUES ('local-user', 'secret.exe', '2026-08-28T08:00:00Z')",
                [],
            )
            .unwrap();
        assert!(!record_sample(
            &connection,
            "local-user",
            "secret.exe",
            "2026-08-28T08:01:00Z"
        )
        .unwrap());
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('old', 'local-user', 'old.exe', '2026-08-26T06:00:00Z', '2026-08-26T06:00:00Z')",
                [],
            )
            .unwrap();
        assert!(record_sample(
            &connection,
            "local-user",
            "terminal.exe",
            "2026-08-28T08:02:00Z"
        )
        .unwrap());

        let state = load_state(&connection, "local-user").unwrap();
        assert_eq!(state.sample_count, 2);
        assert_eq!(state.recent_samples[0].application_id, "terminal.exe");
        assert_eq!(state.recent_samples[1].application_id, "code.exe");
        assert_eq!(state.recent_samples[1].last_seen_at, "2026-08-28T08:00:30Z");
    }

    #[test]
    fn only_stable_non_overlapping_samples_become_suggestions() {
        let connection = database();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('stable', 'local-user', 'code.exe', '2026-08-28T08:00:00Z', '2026-08-28T08:03:00Z')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('short', 'local-user', 'mail.exe', '2026-08-28T08:10:00Z', '2026-08-28T08:11:00Z')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('continuing', 'local-user', 'terminal.exe', '2026-08-28T08:00:00Z', '2026-08-28T08:03:30Z')",
                [],
            )
            .unwrap();
        generate_suggestions(
            &connection,
            "local-user",
            DateTime::parse_from_rfc3339("2026-08-28T08:05:00Z").unwrap(),
        )
        .unwrap();

        let state = load_state(&connection, "local-user").unwrap();
        assert_eq!(state.pending_suggestions.len(), 1);
        assert_eq!(state.pending_suggestions[0].application_id, "code.exe");
    }

    #[test]
    fn accepting_a_suggestion_creates_the_session_atomically() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('stable', 'local-user', 'code.exe', '2026-08-28T08:00:00Z', '2026-08-28T08:03:00Z')",
                [],
            )
            .unwrap();
        generate_suggestions(
            &connection,
            "local-user",
            DateTime::parse_from_rfc3339("2026-08-28T08:05:00Z").unwrap(),
        )
        .unwrap();
        let input = || AcceptActivitySuggestionInput {
            user_id: "local-user".into(),
            suggestion_id: "suggestion:stable".into(),
            activity: "Implementation".into(),
            default_tag_id: None,
            started_at: "2026-08-28T08:00:00Z".into(),
            ended_at: "2026-08-28T08:03:00Z".into(),
            start_local_date: "2026-08-28".into(),
            end_local_date: "2026-08-28".into(),
            new_session_id: "accepted-session".into(),
            new_check_in_id: "accepted-check-in".into(),
            new_entry_id: "accepted-entry".into(),
            accepted_at: "2026-08-28T08:05:00Z".into(),
            remember_rule: false,
        };

        connection
            .execute(
                "INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES ('overlap', 'local-user', '2026-08-28T08:01:00Z', '2026-08-28T08:02:00Z', 30, 60, 'Existing', NULL, 0, 0)",
                [],
            )
            .unwrap();
        assert_eq!(accept_suggestion(input(), &mut connection).unwrap_err(), "overlap");
        let status: String = connection
            .query_row(
                "SELECT status FROM aa_activity_suggestions WHERE id = 'suggestion:stable'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(status, "pending");
        connection.execute("DELETE FROM ch_sessions", []).unwrap();

        assert!(accept_suggestion(input(), &mut connection)
            .unwrap()
            .pending_suggestions
            .is_empty());
        let accepted: (String, String) = connection
            .query_row(
                "SELECT status, session_id FROM aa_activity_suggestions WHERE id = 'suggestion:stable'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(accepted, ("accepted".into(), "accepted-session".into()));
    }

    #[test]
    fn remembered_rule_prefills_a_later_suggestion_without_confirming_it() {
        let mut connection = database();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('first', 'local-user', 'code.exe', '2026-08-28T08:00:00Z', '2026-08-28T08:03:00Z')",
                [],
            )
            .unwrap();
        generate_suggestions(
            &connection,
            "local-user",
            DateTime::parse_from_rfc3339("2026-08-28T08:05:00Z").unwrap(),
        )
        .unwrap();
        accept_suggestion(
            AcceptActivitySuggestionInput {
                user_id: "local-user".into(),
                suggestion_id: "suggestion:first".into(),
                activity: "Implementation".into(),
                default_tag_id: None,
                started_at: "2026-08-28T08:00:00Z".into(),
                ended_at: "2026-08-28T08:03:00Z".into(),
                start_local_date: "2026-08-28".into(),
                end_local_date: "2026-08-28".into(),
                new_session_id: "first-session".into(),
                new_check_in_id: "first-check-in".into(),
                new_entry_id: "first-entry".into(),
                accepted_at: "2026-08-28T08:05:00Z".into(),
                remember_rule: true,
            },
            &mut connection,
        )
        .unwrap();
        connection
            .execute(
                "INSERT INTO aa_activity_samples VALUES ('second', 'local-user', 'code.exe', '2026-08-28T09:00:00Z', '2026-08-28T09:03:00Z')",
                [],
            )
            .unwrap();
        generate_suggestions(
            &connection,
            "local-user",
            DateTime::parse_from_rfc3339("2026-08-28T09:05:00Z").unwrap(),
        )
        .unwrap();

        let state = load_state(&connection, "local-user").unwrap();
        assert_eq!(state.rules.len(), 1);
        assert_eq!(state.pending_suggestions.len(), 1);
        assert_eq!(state.pending_suggestions[0].suggested_activity, "Implementation");
        assert!(state.pending_suggestions[0].rule_applied);
        let sessions: i64 = connection
            .query_row("SELECT COUNT(*) FROM ch_sessions", [], |row| row.get(0))
            .unwrap();
        assert_eq!(sessions, 1);
    }
}
