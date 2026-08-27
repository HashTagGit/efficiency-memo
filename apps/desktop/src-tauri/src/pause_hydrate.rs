use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "efficiency-memo.db";

#[derive(Deserialize)]
pub(crate) struct ReminderPreferenceInput {
    kind: String,
    enabled: bool,
    interval_minutes: i64,
    next_due_at: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct SavePreferencesInput {
    user_id: String,
    updated_at: String,
    preferences: Vec<ReminderPreferenceInput>,
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
}

fn valid_kind(kind: &str) -> bool {
    matches!(kind, "break" | "hydration")
}

fn save_preferences(input: SavePreferencesInput, connection: &mut Connection) -> Result<bool, String> {
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
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
        if existing == Some((preference.enabled, preference.interval_minutes)) {
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
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(newly_enabled)
}

fn claim_pending(user_id: &str, now: &str, connection: &mut Connection) -> Result<Vec<String>, String> {
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let active: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND ended_at IS NULL)",
            [user_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
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

fn apply_action(input: ReminderActionInput, connection: &mut Connection) -> Result<(), String> {
    if !valid_kind(&input.kind) || !matches!(input.action.as_str(), "completed" | "snoozed" | "muted") {
        return Err("invalid-action".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE ph_reminders SET next_due_at = ?1, pending_at = NULL, muted_until = ?2, updated_at = ?3 WHERE user_id = ?4 AND kind = ?5 AND enabled = 1 AND pending_at IS NOT NULL",
            params![input.next_due_at, input.muted_until, input.occurred_at, input.user_id, input.kind],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("not-pending".to_string());
    }
    transaction
        .execute(
            "INSERT INTO ph_reminder_events (id, user_id, kind, action, occurred_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![input.event_id, input.user_id, input.kind, input.action, input.occurred_at],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(())
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
pub(crate) fn claim_pause_hydrate_reminders(user_id: String, now: String, app: AppHandle) -> Result<Vec<String>, String> {
    claim_pending(&user_id, &now, &mut connection(&app)?)
}

#[tauri::command]
pub(crate) fn act_on_pause_hydrate_reminder(input: ReminderActionInput, app: AppHandle) -> Result<(), String> {
    apply_action(input, &mut connection(&app)?)
}

#[cfg(test)]
mod tests {
    use super::{
        apply_action, claim_pending, save_preferences, ReminderActionInput,
        ReminderPreferenceInput, SavePreferencesInput,
    };
    use rusqlite::{params, Connection};

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "
                CREATE TABLE ch_sessions (user_id TEXT NOT NULL, ended_at TEXT);
                CREATE TABLE ph_reminders (
                    user_id TEXT NOT NULL, kind TEXT NOT NULL, enabled INTEGER NOT NULL,
                    interval_minutes INTEGER NOT NULL, next_due_at TEXT, pending_at TEXT,
                    muted_until TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, kind)
                );
                CREATE TABLE ph_reminder_events (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL,
                    action TEXT NOT NULL, occurred_at TEXT NOT NULL
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
            claim_pending("local-user", "2026-08-27T10:00:00Z", &mut connection).unwrap(),
            vec!["break"]
        );
        assert!(claim_pending("local-user", "2026-08-27T10:00:01Z", &mut connection)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn reminder_action_updates_state_and_event_together() {
        let mut connection = database();
        insert_pending(&connection);

        apply_action(
            ReminderActionInput {
                user_id: "local-user".into(),
                kind: "break".into(),
                action: "completed".into(),
                event_id: "event-1".into(),
                occurred_at: "2026-08-27T10:05:00Z".into(),
                next_due_at: "2026-08-27T11:05:00Z".into(),
                muted_until: None,
            },
            &mut connection,
        )
        .unwrap();

        let pending: Option<String> = connection
            .query_row("SELECT pending_at FROM ph_reminders", [], |row| row.get(0))
            .unwrap();
        let events: i64 = connection
            .query_row("SELECT COUNT(*) FROM ph_reminder_events", [], |row| row.get(0))
            .unwrap();
        assert!(pending.is_none());
        assert_eq!(events, 1);
    }
}
