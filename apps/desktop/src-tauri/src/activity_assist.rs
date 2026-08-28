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
pub(crate) struct ActivityAssistState {
    preferences: ActivityAssistPreferences,
    exclusions: Vec<String>,
    recent_samples: Vec<ActivitySample>,
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
        sample_count,
        collector_available: foreground_application::available(),
    })
}

#[tauri::command]
pub(crate) fn load_activity_assist_state(
    user_id: String,
    app: AppHandle,
) -> Result<ActivityAssistState, String> {
    load_state(&database(&app)?, &user_id)
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
    use super::{load_state, record_sample};
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
}
