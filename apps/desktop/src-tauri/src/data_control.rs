use chrono::Utc;
use rusqlite::{params, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub(crate) const SCHEMA_VERSION: i64 = 9;
const MIN_SUPPORTED_SCHEMA_VERSION: i64 = 7;
pub(crate) const DB_FILENAME: &str = "efficiency-memo.db";
pub(crate) const SIDECAR_FILENAME: &str = "efficiency-memo.db.next";
pub(crate) const PREFERENCES_NEXT_FILENAME: &str = "efficiency-memo.preferences.next.json";
pub(crate) const PREFERENCES_APPLIED_FILENAME: &str = "efficiency-memo.preferences.applied.json";
const PACKAGE_VERSION: i64 = 1;
const METADATA_TABLE: &str = "em_backup_metadata";
const SNAPSHOT_TEMP_FILENAME: &str = "efficiency-memo-backup-temp.db";
const REQUIRED_SCHEMA: &[(&str, &[&str])] = &[
    (
        "_sqlx_migrations",
        &[
            "version", "description", "installed_on", "success", "checksum",
            "execution_time",
        ],
    ),
    ("users", &["id", "email", "created_at", "updated_at"]),
    (
        "cr_device_presets",
        &[
            "id", "type", "default_threshold", "estimated_drain_per_month",
            "label", "created_at", "updated_at",
        ],
    ),
    (
        "cr_devices",
        &[
            "id", "user_id", "name", "device_type", "capacity_mah", "notes",
            "threshold_percent", "created_at", "updated_at",
        ],
    ),
    (
        "cr_charge_events",
        &["id", "device_id", "charged_at", "notes", "created_at"],
    ),
    (
        "cr_reminder_preferences",
        &["id", "device_id", "notify_before_days", "created_at", "updated_at"],
    ),
    (
        "cr_computed_reminder_states",
        &[
            "id", "device_id", "heuristic_version", "estimated_battery_percent",
            "estimated_days_until_threshold", "reminder_due_at", "status", "basis",
            "last_charge_event_id", "computed_at", "created_at", "updated_at",
        ],
    ),
    ("ch_tags", &["id", "user_id", "name", "color", "is_archived", "created_at", "synced"]),
    (
        "ch_sessions",
        &[
            "id", "user_id", "started_at", "ended_at", "interval_minutes",
            "elapsed_seconds", "activity", "default_tag_id", "is_favorite", "synced",
        ],
    ),
    (
        "ch_check_ins",
        &["id", "session_id", "checked_at", "skipped", "note", "duration_seconds", "synced"],
    ),
    (
        "ch_check_in_entries",
        &["id", "check_in_id", "tag_id", "percentage", "synced"],
    ),
    ("ch_settings", &["key", "value"]),
    (
        "ph_reminders",
        &[
            "user_id", "kind", "enabled", "interval_minutes", "next_due_at",
            "pending_at", "muted_until", "updated_at",
        ],
    ),
    ("ph_reminder_events", &["id", "user_id", "kind", "action", "occurred_at"]),
    (
        "ph_schedule_policies",
        &[
            "user_id", "active_weekdays_mask", "work_start_minute", "work_end_minute",
            "quiet_enabled", "quiet_start_minute", "quiet_end_minute", "updated_at",
        ],
    ),
    (
        "ch_plans",
        &[
            "id", "user_id", "title", "tag_id", "started_at", "ended_at",
            "status", "session_id", "created_at", "updated_at", "synced",
        ],
    ),
];

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PortablePreferences {
    locale: String,
    theme_mode: String,
    palette: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DataCounts {
    profiles: i64,
    core_hour_sessions: i64,
    core_hour_plans: i64,
    core_hour_tags: i64,
    pause_hydrate_events: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackupPreview {
    package_version: i64,
    schema_version: i64,
    created_at: String,
    pub(crate) preferences: PortablePreferences,
    counts: DataCounts,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ResetScope {
    CoreHour,
    PauseHydrate,
    All,
}

pub(crate) fn database_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|error| error.to_string())
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(database_dir(app)?.join(DB_FILENAME))
}

fn same_existing_file(left: &Path, right: &Path) -> bool {
    if !left.exists() || !right.exists() {
        return false;
    }
    match (fs::canonicalize(left), fs::canonicalize(right)) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn validate_preferences(preferences: &PortablePreferences) -> Result<(), String> {
    if !matches!(preferences.locale.as_str(), "en-US" | "zh-CN")
        || !matches!(preferences.theme_mode.as_str(), "light" | "dark" | "system")
        || !matches!(preferences.palette.as_str(), "ember" | "grove" | "tide")
    {
        return Err("invalid-preferences".to_string());
    }
    Ok(())
}

fn ensure_no_active_session(connection: &Connection) -> Result<(), String> {
    let active: i64 = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE ended_at IS NULL)",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if active != 0 {
        return Err("active-session".to_string());
    }
    Ok(())
}

fn table_exists(connection: &Connection, table: &str) -> Result<bool, String> {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
            [table],
            |row| row.get::<_, i64>(0),
        )
        .map(|value| value != 0)
        .map_err(|error| error.to_string())
}

fn validate_table_columns(
    connection: &Connection,
    table: &str,
    required_columns: &[&str],
) -> Result<(), String> {
    if !table_exists(connection, table)? {
        return Err("invalid-backup".to_string());
    }
    let mut statement = connection
        .prepare("SELECT name FROM pragma_table_info(?1)")
        .map_err(|error| error.to_string())?;
    let columns = statement
        .query_map([table], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    if required_columns
        .iter()
        .any(|required| !columns.iter().any(|column| column == required))
    {
        return Err("invalid-backup".to_string());
    }
    Ok(())
}

fn validate_required_schema(connection: &Connection, schema_version: i64) -> Result<(), String> {
    for (table, required_columns) in REQUIRED_SCHEMA {
        if schema_version < 8 && *table == "ph_schedule_policies" {
            continue;
        }
        validate_table_columns(connection, table, required_columns)?;
    }
    if schema_version >= 9 {
        validate_table_columns(
            connection,
            "ph_schedule_policies",
            &["natural_break_enabled", "natural_break_minutes"],
        )?;
        validate_table_columns(connection, "ph_reminder_events", &["source"])?;
    }
    for version in 1..=schema_version {
        let applied: i64 = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM _sqlx_migrations WHERE version = ?1 AND success = 1)",
                [version],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if applied == 0 {
            return Err("invalid-backup".to_string());
        }
    }
    Ok(())
}

fn count_table(connection: &Connection, table: &str) -> Result<i64, String> {
    if !table_exists(connection, table)? {
        return Ok(0);
    }
    let sql = match table {
        "users" => "SELECT COUNT(*) FROM users",
        "ch_sessions" => "SELECT COUNT(*) FROM ch_sessions",
        "ch_plans" => "SELECT COUNT(*) FROM ch_plans",
        "ch_tags" => "SELECT COUNT(*) FROM ch_tags",
        "ph_reminder_events" => "SELECT COUNT(*) FROM ph_reminder_events",
        _ => return Err("unsupported-table".to_string()),
    };
    connection
        .query_row(sql, [], |row| row.get(0))
        .map_err(|error| error.to_string())
}

fn data_counts(connection: &Connection) -> Result<DataCounts, String> {
    Ok(DataCounts {
        profiles: count_table(connection, "users")?,
        core_hour_sessions: count_table(connection, "ch_sessions")?,
        core_hour_plans: count_table(connection, "ch_plans")?,
        core_hour_tags: count_table(connection, "ch_tags")?,
        pause_hydrate_events: count_table(connection, "ph_reminder_events")?,
    })
}

pub(crate) fn inspect_backup(path: &Path) -> Result<BackupPreview, String> {
    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("invalid-backup: {error}"))?;
    let integrity: String = connection
        .query_row("PRAGMA integrity_check(1)", [], |row| row.get(0))
        .map_err(|error| format!("invalid-backup: {error}"))?;
    if integrity != "ok" || !table_exists(&connection, "users")? || !table_exists(&connection, METADATA_TABLE)? {
        return Err("invalid-backup".to_string());
    }
    let (package_version, schema_version, created_at, preferences_json): (i64, i64, String, String) = connection
        .query_row(
            "SELECT package_version, schema_version, created_at, preferences_json FROM em_backup_metadata WHERE singleton = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|error| format!("invalid-backup: {error}"))?;
    if package_version != PACKAGE_VERSION {
        return Err("unsupported-package".to_string());
    }
    if schema_version > SCHEMA_VERSION {
        return Err("future-schema".to_string());
    }
    if schema_version < MIN_SUPPORTED_SCHEMA_VERSION {
        return Err("unsupported-package".to_string());
    }
    validate_required_schema(&connection, schema_version)
        .map_err(|_| "invalid-backup".to_string())?;
    let preferences: PortablePreferences = serde_json::from_str(&preferences_json)
        .map_err(|_| "invalid-preferences".to_string())?;
    validate_preferences(&preferences)?;
    Ok(BackupPreview {
        package_version,
        schema_version,
        created_at,
        preferences,
        counts: data_counts(&connection)?,
    })
}

fn create_backup_at(
    source_path: &Path,
    destination: &Path,
    preferences: PortablePreferences,
) -> Result<BackupPreview, String> {
    validate_preferences(&preferences)?;
    if source_path == destination || same_existing_file(source_path, destination) {
        return Err("invalid-destination".to_string());
    }
    let data_dir = source_path.parent().ok_or_else(|| "invalid-destination".to_string())?;
    let temp_path = data_dir.join(SNAPSHOT_TEMP_FILENAME);
    if destination == temp_path || destination == data_dir.join(SIDECAR_FILENAME) {
        return Err("invalid-destination".to_string());
    }
    let _ = fs::remove_file(&temp_path);
    let source = Connection::open(source_path).map_err(|error| error.to_string())?;
    ensure_no_active_session(&source)?;
    source
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|error| error.to_string())?;
    source
        .execute("VACUUM INTO ?1", [temp_path.to_string_lossy().as_ref()])
        .map_err(|error| error.to_string())?;
    drop(source);

    let result = (|| {
        let snapshot = Connection::open(&temp_path).map_err(|error| error.to_string())?;
        snapshot
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS em_backup_metadata (
                    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                    package_version INTEGER NOT NULL,
                    schema_version INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    preferences_json TEXT NOT NULL
                );",
            )
            .map_err(|error| error.to_string())?;
        snapshot
            .execute(
                "INSERT OR REPLACE INTO em_backup_metadata (singleton, package_version, schema_version, created_at, preferences_json) VALUES (1, ?1, ?2, ?3, ?4)",
                params![
                    PACKAGE_VERSION,
                    SCHEMA_VERSION,
                    Utc::now().to_rfc3339(),
                    serde_json::to_string(&preferences).map_err(|error| error.to_string())?,
                ],
            )
            .map_err(|error| error.to_string())?;
        drop(snapshot);
        let preview = inspect_backup(&temp_path)?;
        fs::copy(&temp_path, destination).map_err(|error| error.to_string())?;
        Ok(preview)
    })();
    let _ = fs::remove_file(&temp_path);
    result
}

#[tauri::command]
pub(crate) fn current_data_summary(app: AppHandle) -> Result<DataCounts, String> {
    let connection = Connection::open(database_path(&app)?).map_err(|error| error.to_string())?;
    data_counts(&connection)
}

#[tauri::command]
pub(crate) fn create_local_backup(
    path: String,
    preferences: PortablePreferences,
    app: AppHandle,
) -> Result<BackupPreview, String> {
    create_backup_at(&database_path(&app)?, Path::new(&path), preferences)
}

#[tauri::command]
pub(crate) fn preview_local_backup(path: String) -> Result<BackupPreview, String> {
    inspect_backup(Path::new(&path))
}

#[tauri::command]
pub(crate) fn prepare_local_restore(path: String, app: AppHandle) -> Result<BackupPreview, String> {
    let current_path = database_path(&app)?;
    if same_existing_file(Path::new(&path), &current_path) {
        return Err("invalid-backup".to_string());
    }
    let preview = inspect_backup(Path::new(&path))?;
    let data_dir = database_dir(&app)?;
    let current = Connection::open(data_dir.join(DB_FILENAME)).map_err(|error| error.to_string())?;
    ensure_no_active_session(&current)?;
    drop(current);

    let sidecar_path = data_dir.join(SIDECAR_FILENAME);
    let sidecar_temp = data_dir.join(format!("{SIDECAR_FILENAME}.tmp"));
    let preferences_path = data_dir.join(PREFERENCES_NEXT_FILENAME);
    let _ = fs::remove_file(&sidecar_temp);
    if let Err(error) = fs::copy(&path, &sidecar_temp) {
        let _ = fs::remove_file(&sidecar_temp);
        return Err(error.to_string());
    }
    let staged_preview = match inspect_backup(&sidecar_temp) {
        Ok(preview) => preview,
        Err(error) => {
            let _ = fs::remove_file(&sidecar_temp);
            return Err(error);
        }
    };
    let preferences_json = serde_json::to_string(&staged_preview.preferences)
        .map_err(|error| error.to_string())?;
    if let Err(error) = fs::write(&preferences_path, preferences_json) {
        let _ = fs::remove_file(&sidecar_temp);
        return Err(error.to_string());
    }
    let _ = fs::remove_file(&sidecar_path);
    fs::rename(&sidecar_temp, &sidecar_path).map_err(|error| {
        let _ = fs::remove_file(&sidecar_temp);
        let _ = fs::remove_file(&preferences_path);
        error.to_string()
    })?;
    Ok(preview)
}

fn reset_data(connection: &mut Connection, scope: ResetScope, user_id: &str) -> Result<DataCounts, String> {
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    ensure_no_active_session(connection)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    match scope {
        ResetScope::CoreHour => {
            transaction
                .execute("DELETE FROM ch_plans WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
            transaction
                .execute("DELETE FROM ch_sessions WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
            transaction
                .execute("DELETE FROM ch_tags WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
            transaction
                .execute_batch("DELETE FROM ch_settings; INSERT INTO ch_settings (key, value) VALUES ('interval_minutes', '30');")
                .map_err(|error| error.to_string())?;
        }
        ResetScope::PauseHydrate => {
            transaction
                .execute("DELETE FROM ph_reminder_events WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
            transaction
                .execute("DELETE FROM ph_reminders WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
            transaction
                .execute("DELETE FROM ph_schedule_policies WHERE user_id = ?1", [user_id])
                .map_err(|error| error.to_string())?;
        }
        ResetScope::All => {
            transaction
                .execute("DELETE FROM users", [])
                .map_err(|error| error.to_string())?;
            transaction
                .execute_batch("DELETE FROM ch_settings; INSERT INTO ch_settings (key, value) VALUES ('interval_minutes', '30');")
                .map_err(|error| error.to_string())?;
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    data_counts(connection)
}

#[tauri::command]
pub(crate) fn reset_local_data(
    scope: ResetScope,
    user_id: String,
    app: AppHandle,
) -> Result<DataCounts, String> {
    let mut connection = Connection::open(database_path(&app)?).map_err(|error| error.to_string())?;
    reset_data(&mut connection, scope, &user_id)
}

#[tauri::command]
pub(crate) fn take_applied_restore_preferences(
    app: AppHandle,
) -> Result<Option<PortablePreferences>, String> {
    let path = database_dir(&app)?.join(PREFERENCES_APPLIED_FILENAME);
    if !path.exists() {
        return Ok(None);
    }
    let result = fs::read_to_string(&path)
        .map_err(|error| error.to_string())
        .and_then(|content| {
            let preferences = serde_json::from_str::<PortablePreferences>(&content)
                .map_err(|error| error.to_string())?;
            validate_preferences(&preferences)?;
            Ok(preferences)
        });
    let _ = fs::remove_file(path);
    result.map(Some)
}

#[cfg(test)]
mod tests {
    use super::{create_backup_at, inspect_backup, reset_data, PortablePreferences, ResetScope};
    use rusqlite::Connection;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("efficiency-memo-{name}-{}-{suffix}.db", std::process::id()))
    }

    fn database(path: &PathBuf) -> Connection {
        let connection = Connection::open(path).unwrap();
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
        ] {
            connection.execute_batch(migration).unwrap();
        }
        connection
            .execute_batch(
                "PRAGMA foreign_keys = ON;
                CREATE TABLE _sqlx_migrations (
                    version INTEGER NOT NULL, description TEXT NOT NULL,
                    installed_on TEXT NOT NULL, success INTEGER NOT NULL,
                    checksum BLOB NOT NULL, execution_time INTEGER NOT NULL
                );
                INSERT INTO _sqlx_migrations VALUES
                    (1, 'migration', 'installed', 1, X'', 0),
                    (2, 'migration', 'installed', 1, X'', 0),
                    (3, 'migration', 'installed', 1, X'', 0),
                    (4, 'migration', 'installed', 1, X'', 0),
                    (5, 'migration', 'installed', 1, X'', 0),
                    (6, 'migration', 'installed', 1, X'', 0),
                    (7, 'migration', 'installed', 1, X'', 0),
                    (8, 'migration', 'installed', 1, X'', 0),
                    (9, 'migration', 'installed', 1, X'', 0);
                INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated');
                INSERT INTO ch_tags VALUES ('tag-1', 'local-user', 'Focus', '#000000', 0, 'created', 0);
                INSERT INTO ch_sessions (
                    id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds,
                    activity, default_tag_id, is_favorite, synced
                ) VALUES (
                    'session-1', 'local-user', '2026-08-28T09:00:00Z',
                    '2026-08-28T10:00:00Z', 30, 3600, 'Work', 'tag-1', 0, 0
                );
                INSERT INTO ch_plans VALUES (
                    'plan-1', 'local-user', 'Plan', 'tag-1', '2026-08-28T09:00:00Z',
                    '2026-08-28T10:00:00Z', 'completed', 'session-1', 'created', 'updated', 0
                );
                UPDATE ch_settings SET value = '60' WHERE key = 'interval_minutes';
                INSERT INTO ph_reminders VALUES ('local-user', 'break', 1, 60, NULL, NULL, NULL, 'updated');
                INSERT INTO ph_schedule_policies VALUES ('local-user', 31, 540, 1080, 0, 1320, 420, 'updated', 0, 5);
                INSERT INTO ph_reminder_events VALUES ('event-1', 'local-user', 'break', 'completed', 'occurred', 'manual');",
            )
            .unwrap();
        connection
    }

    fn preferences() -> PortablePreferences {
        PortablePreferences {
            locale: "zh-CN".into(),
            theme_mode: "dark".into(),
            palette: "tide".into(),
        }
    }

    #[test]
    fn portable_backup_contains_metadata_and_counts() {
        let source = temp_path("source");
        let destination = temp_path("backup");
        drop(database(&source));

        let preview = create_backup_at(&source, &destination, preferences()).unwrap();
        assert_eq!(preview.schema_version, 9);
        assert_eq!(preview.preferences, preferences());
        assert_eq!(preview.counts.core_hour_sessions, 1);
        assert_eq!(preview.counts.core_hour_plans, 1);
        assert_eq!(preview.counts.pause_hydrate_events, 1);

        let legacy_v8_destination = temp_path("backup-v8");
        fs::copy(&destination, &legacy_v8_destination).unwrap();
        let legacy_v8 = Connection::open(&legacy_v8_destination).unwrap();
        legacy_v8
            .execute("UPDATE em_backup_metadata SET schema_version = 8", [])
            .unwrap();
        legacy_v8
            .execute("DELETE FROM _sqlx_migrations WHERE version = 9", [])
            .unwrap();
        legacy_v8
            .execute("ALTER TABLE ph_schedule_policies DROP COLUMN natural_break_enabled", [])
            .unwrap();
        legacy_v8
            .execute("ALTER TABLE ph_schedule_policies DROP COLUMN natural_break_minutes", [])
            .unwrap();
        legacy_v8
            .execute("ALTER TABLE ph_reminder_events DROP COLUMN source", [])
            .unwrap();
        drop(legacy_v8);
        assert_eq!(inspect_backup(&legacy_v8_destination).unwrap().schema_version, 8);

        let legacy_v7_destination = temp_path("backup-v7");
        fs::copy(&legacy_v8_destination, &legacy_v7_destination).unwrap();
        let legacy = Connection::open(&legacy_v7_destination).unwrap();
        legacy
            .execute("UPDATE em_backup_metadata SET schema_version = 7", [])
            .unwrap();
        legacy
            .execute("DELETE FROM _sqlx_migrations WHERE version = 8", [])
            .unwrap();
        legacy.execute("DROP TABLE ph_schedule_policies", []).unwrap();
        drop(legacy);
        assert_eq!(inspect_backup(&legacy_v7_destination).unwrap().schema_version, 7);

        let backup = Connection::open(&destination).unwrap();
        backup
            .execute("UPDATE em_backup_metadata SET schema_version = 10", [])
            .unwrap();
        drop(backup);
        assert_eq!(inspect_backup(&destination).unwrap_err(), "future-schema");

        let backup = Connection::open(&destination).unwrap();
        backup
            .execute("UPDATE em_backup_metadata SET schema_version = 9", [])
            .unwrap();
        backup
            .execute("DELETE FROM _sqlx_migrations WHERE version = 6", [])
            .unwrap();
        drop(backup);
        assert_eq!(inspect_backup(&destination).unwrap_err(), "invalid-backup");

        let backup = Connection::open(&destination).unwrap();
        backup
            .execute(
                "INSERT INTO _sqlx_migrations VALUES (6, 'migration', 'installed', 1, X'', 0)",
                [],
            )
            .unwrap();
        backup
            .execute("ALTER TABLE cr_devices DROP COLUMN notes", [])
            .unwrap();
        drop(backup);
        assert_eq!(inspect_backup(&destination).unwrap_err(), "invalid-backup");

        let _ = fs::remove_file(source);
        let _ = fs::remove_file(destination);
        let _ = fs::remove_file(legacy_v8_destination);
        let _ = fs::remove_file(legacy_v7_destination);
    }

    #[test]
    fn reset_is_scoped_and_rejects_an_active_session() {
        let path = temp_path("reset");
        let mut connection = database(&path);
        let counts = reset_data(&mut connection, ResetScope::CoreHour, "local-user").unwrap();
        assert_eq!(counts.core_hour_sessions, 0);
        assert_eq!(counts.pause_hydrate_events, 1);
        let policies: i64 = connection
            .query_row("SELECT COUNT(*) FROM ph_schedule_policies", [], |row| row.get(0))
            .unwrap();
        assert_eq!(policies, 1);

        let counts = reset_data(&mut connection, ResetScope::PauseHydrate, "local-user").unwrap();
        assert_eq!(counts.pause_hydrate_events, 0);
        let policies: i64 = connection
            .query_row("SELECT COUNT(*) FROM ph_schedule_policies", [], |row| row.get(0))
            .unwrap();
        assert_eq!(policies, 0);

        connection
            .execute(
                "INSERT INTO ch_sessions (
                    id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds,
                    activity, default_tag_id, is_favorite, synced
                ) VALUES (
                    'active', 'local-user', '2026-08-28T11:00:00Z', NULL,
                    30, 0, 'Active', NULL, 0, 0
                )",
                [],
            )
            .unwrap();
        assert_eq!(
            reset_data(&mut connection, ResetScope::PauseHydrate, "local-user").unwrap_err(),
            "active-session"
        );
        drop(connection);
        let _ = fs::remove_file(path);
    }
}
