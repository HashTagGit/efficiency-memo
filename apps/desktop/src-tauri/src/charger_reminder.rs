use crate::data_control::DB_FILENAME;
use chrono::DateTime;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecordFullChargeInput {
    event_id: String,
    state_id: String,
    latest_charge_event_id: String,
    device_id: String,
    charged_at: String,
    notes: Option<String>,
    created_at: String,
    heuristic_version: String,
    estimated_battery_percent: Option<f64>,
    estimated_days_until_threshold: Option<i64>,
    reminder_due_at: Option<String>,
    status: String,
    basis: String,
    computed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) struct ChargeEventRecord {
    id: String,
    device_id: String,
    charged_at: String,
    notes: Option<String>,
    created_at: String,
}

fn valid_id(value: &str) -> bool {
    !value.trim().is_empty() && value.chars().count() <= 128
}

fn validate(input: &RecordFullChargeInput) -> Result<(), String> {
    let charged_at = DateTime::parse_from_rfc3339(&input.charged_at)
        .map_err(|_| "invalid-charge".to_string())?;
    let created_at = DateTime::parse_from_rfc3339(&input.created_at)
        .map_err(|_| "invalid-charge".to_string())?;
    let computed_at = DateTime::parse_from_rfc3339(&input.computed_at)
        .map_err(|_| "invalid-charge".to_string())?;
    if !valid_id(&input.event_id)
        || !valid_id(&input.state_id)
        || !valid_id(&input.latest_charge_event_id)
        || !valid_id(&input.device_id)
        || charged_at > computed_at
        || created_at > computed_at
        || input.notes.as_deref().is_some_and(|notes| notes.chars().count() > 500)
        || input.heuristic_version.trim().is_empty()
        || input.heuristic_version.chars().count() > 64
        || input.estimated_battery_percent.is_some_and(|value| !(0.0..=100.0).contains(&value))
        || input.estimated_days_until_threshold.is_some_and(|value| value < 0)
        || input.reminder_due_at.as_deref().is_some_and(|value| DateTime::parse_from_rfc3339(value).is_err())
        || !matches!(input.status.as_str(), "needs-charge-log" | "tracking" | "remind" | "charge-now")
        || input.basis.trim().is_empty()
        || input.basis.chars().count() > 1000
    {
        return Err("invalid-charge".to_string());
    }
    Ok(())
}

fn record_full_charge(
    input: RecordFullChargeInput,
    connection: &mut Connection,
) -> Result<ChargeEventRecord, String> {
    validate(&input)?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let device_exists: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM cr_devices WHERE id = ?1)",
            [&input.device_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if !device_exists {
        return Err("device-not-found".to_string());
    }
    transaction
        .execute(
            "INSERT INTO cr_charge_events (id, device_id, charged_at, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![input.event_id, input.device_id, input.charged_at, input.notes, input.created_at],
        )
        .map_err(|error| error.to_string())?;
    let latest_charge_event_id: String = transaction
        .query_row(
            "SELECT id FROM cr_charge_events WHERE device_id = ?1 ORDER BY julianday(charged_at) DESC, julianday(created_at) DESC, id DESC LIMIT 1",
            [&input.device_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if latest_charge_event_id != input.latest_charge_event_id {
        return Err("stale-charge".to_string());
    }
    let existing: Option<(String, String)> = transaction
        .query_row(
            "SELECT id, created_at FROM cr_computed_reminder_states WHERE device_id = ?1",
            [&input.device_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let (state_id, state_created_at) = existing.unwrap_or((input.state_id, input.created_at.clone()));
    transaction
        .execute(
            "INSERT INTO cr_computed_reminder_states (id, device_id, heuristic_version, estimated_battery_percent, estimated_days_until_threshold, reminder_due_at, status, basis, last_charge_event_id, computed_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10) ON CONFLICT(device_id) DO UPDATE SET heuristic_version = excluded.heuristic_version, estimated_battery_percent = excluded.estimated_battery_percent, estimated_days_until_threshold = excluded.estimated_days_until_threshold, reminder_due_at = excluded.reminder_due_at, status = excluded.status, basis = excluded.basis, last_charge_event_id = excluded.last_charge_event_id, computed_at = excluded.computed_at, updated_at = excluded.updated_at",
            params![
                state_id,
                input.device_id,
                input.heuristic_version,
                input.estimated_battery_percent,
                input.estimated_days_until_threshold,
                input.reminder_due_at,
                input.status,
                input.basis,
                input.latest_charge_event_id,
                input.computed_at,
                state_created_at,
            ],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(ChargeEventRecord {
        id: input.event_id,
        device_id: input.device_id,
        charged_at: input.charged_at,
        notes: input.notes,
        created_at: input.created_at,
    })
}

#[tauri::command]
pub(crate) fn record_charger_full_charge(
    input: RecordFullChargeInput,
    app: AppHandle,
) -> Result<ChargeEventRecord, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    record_full_charge(input, &mut Connection::open(path).map_err(|error| error.to_string())?)
}

#[cfg(test)]
mod tests {
    use super::{record_full_charge, RecordFullChargeInput};
    use rusqlite::Connection;

    fn input() -> RecordFullChargeInput {
        RecordFullChargeInput {
            event_id: "event-1".into(),
            state_id: "state-1".into(),
            latest_charge_event_id: "event-1".into(),
            device_id: "device-1".into(),
            charged_at: "2026-08-28T08:00:00Z".into(),
            notes: None,
            created_at: "2026-08-28T08:00:01Z".into(),
            heuristic_version: "deterministic-v1".into(),
            estimated_battery_percent: Some(100.0),
            estimated_days_until_threshold: Some(120),
            reminder_due_at: Some("2026-12-26T08:00:00Z".into()),
            status: "tracking".into(),
            basis: "basis".into(),
            computed_at: "2026-08-28T08:00:01Z".into(),
        }
    }

    #[test]
    fn full_charge_and_recomputed_state_commit_or_roll_back_together() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(include_str!("../migrations/0001_cr_device_reminder.sql")).unwrap();
        connection.execute_batch(include_str!("../migrations/0002_cr_seed_presets.sql")).unwrap();
        connection.execute_batch(
            "PRAGMA foreign_keys = ON;
             INSERT INTO users VALUES ('local-user', 'local@example.test', 'created', 'updated');
             INSERT INTO cr_devices (id, user_id, name, device_type, capacity_mah, notes, threshold_percent, created_at, updated_at) VALUES ('device-1', 'local-user', 'Mouse', 'wireless-mouse', NULL, NULL, 25, 'created', 'updated');
             CREATE TRIGGER fail_computed_state BEFORE INSERT ON cr_computed_reminder_states BEGIN SELECT RAISE(ABORT, 'forced failure'); END;",
        ).unwrap();
        assert!(record_full_charge(input(), &mut connection).is_err());
        let events: i64 = connection.query_row("SELECT COUNT(*) FROM cr_charge_events", [], |row| row.get(0)).unwrap();
        assert_eq!(events, 0);
        connection.execute_batch("DROP TRIGGER fail_computed_state").unwrap();
        assert!(record_full_charge(input(), &mut connection).is_ok());
        let counts: (i64, i64) = connection.query_row(
            "SELECT (SELECT COUNT(*) FROM cr_charge_events), (SELECT COUNT(*) FROM cr_computed_reminder_states)",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();
        assert_eq!(counts, (1, 1));
        let mut older = input();
        older.event_id = "event-2".into();
        older.charged_at = "2026-08-27T08:00:00Z".into();
        older.latest_charge_event_id = "event-1".into();
        assert!(record_full_charge(older, &mut connection).is_ok());
        let state: (i64, String) = connection.query_row(
            "SELECT (SELECT COUNT(*) FROM cr_charge_events), last_charge_event_id FROM cr_computed_reminder_states WHERE device_id = 'device-1'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();
        assert_eq!(state, (2, "event-1".into()));
    }
}
