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

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct SchedulePolicyInput {
    active_weekdays_mask: i64,
    work_start_minute: i64,
    work_end_minute: i64,
    quiet_enabled: bool,
    quiet_start_minute: i64,
    quiet_end_minute: i64,
}

impl Default for SchedulePolicyInput {
    fn default() -> Self {
        Self {
            active_weekdays_mask: 31,
            work_start_minute: 540,
            work_end_minute: 1080,
            quiet_enabled: false,
            quiet_start_minute: 1320,
            quiet_end_minute: 420,
        }
    }
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
}

fn valid_kind(kind: &str) -> bool {
    matches!(kind, "break" | "hydration")
}

fn valid_policy(policy: &SchedulePolicyInput) -> bool {
    (1..=127).contains(&policy.active_weekdays_mask)
        && (0..=1438).contains(&policy.work_start_minute)
        && (1..=1439).contains(&policy.work_end_minute)
        && policy.work_start_minute < policy.work_end_minute
        && (0..=1439).contains(&policy.quiet_start_minute)
        && (0..=1439).contains(&policy.quiet_end_minute)
        && policy.quiet_start_minute != policy.quiet_end_minute
}

fn minute_in_window(minute: i64, start: i64, end: i64) -> bool {
    if start < end {
        minute >= start && minute < end
    } else {
        minute >= start || minute < end
    }
}

fn schedule_allows(policy: &SchedulePolicyInput, weekday: i64, minute_of_day: i64) -> bool {
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return false;
    }
    let active_day = policy.active_weekdays_mask & (1 << weekday) != 0;
    let working = minute_in_window(
        minute_of_day,
        policy.work_start_minute,
        policy.work_end_minute,
    );
    let quiet = policy.quiet_enabled
        && minute_in_window(
            minute_of_day,
            policy.quiet_start_minute,
            policy.quiet_end_minute,
        );
    active_day && working && !quiet
}

fn save_preferences(input: SavePreferencesInput, connection: &mut Connection) -> Result<bool, String> {
    if !valid_policy(&input.policy) {
        return Err("invalid-policy".to_string());
    }
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
    transaction
        .execute(
            "INSERT INTO ph_schedule_policies (user_id, active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT(user_id) DO UPDATE SET active_weekdays_mask = excluded.active_weekdays_mask, work_start_minute = excluded.work_start_minute, work_end_minute = excluded.work_end_minute, quiet_enabled = excluded.quiet_enabled, quiet_start_minute = excluded.quiet_start_minute, quiet_end_minute = excluded.quiet_end_minute, updated_at = excluded.updated_at",
            params![
                input.user_id,
                input.policy.active_weekdays_mask,
                input.policy.work_start_minute,
                input.policy.work_end_minute,
                input.policy.quiet_enabled,
                input.policy.quiet_start_minute,
                input.policy.quiet_end_minute,
                input.updated_at,
            ],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(newly_enabled)
}

fn claim_pending(
    user_id: &str,
    now: &str,
    weekday: i64,
    minute_of_day: i64,
    connection: &mut Connection,
) -> Result<Vec<String>, String> {
    if !(0..=6).contains(&weekday) || !(0..=1439).contains(&minute_of_day) {
        return Err("invalid-local-time".to_string());
    }
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let policy = transaction
        .query_row(
            "SELECT active_weekdays_mask, work_start_minute, work_end_minute, quiet_enabled, quiet_start_minute, quiet_end_minute FROM ph_schedule_policies WHERE user_id = ?1",
            [user_id],
            |row| {
                Ok(SchedulePolicyInput {
                    active_weekdays_mask: row.get(0)?,
                    work_start_minute: row.get(1)?,
                    work_end_minute: row.get(2)?,
                    quiet_enabled: row.get(3)?,
                    quiet_start_minute: row.get(4)?,
                    quiet_end_minute: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?
        .unwrap_or_default();
    if !schedule_allows(&policy, weekday, minute_of_day) {
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Vec::new());
    }
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
pub(crate) fn claim_pause_hydrate_reminders(
    user_id: String,
    now: String,
    weekday: i64,
    minute_of_day: i64,
    app: AppHandle,
) -> Result<Vec<String>, String> {
    claim_pending(
        &user_id,
        &now,
        weekday,
        minute_of_day,
        &mut connection(&app)?,
    )
}

#[tauri::command]
pub(crate) fn act_on_pause_hydrate_reminder(input: ReminderActionInput, app: AppHandle) -> Result<(), String> {
    apply_action(input, &mut connection(&app)?)
}

#[cfg(test)]
mod tests {
    use super::{
        apply_action, claim_pending, save_preferences, ReminderActionInput,
        ReminderPreferenceInput, SavePreferencesInput, SchedulePolicyInput,
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
                CREATE TABLE ph_schedule_policies (
                    user_id TEXT PRIMARY KEY, active_weekdays_mask INTEGER NOT NULL,
                    work_start_minute INTEGER NOT NULL, work_end_minute INTEGER NOT NULL,
                    quiet_enabled INTEGER NOT NULL, quiet_start_minute INTEGER NOT NULL,
                    quiet_end_minute INTEGER NOT NULL, updated_at TEXT NOT NULL
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
            claim_pending("local-user", "2026-08-27T10:00:00Z", 3, 600, &mut connection).unwrap(),
            vec!["break"]
        );
        assert!(claim_pending("local-user", "2026-08-27T10:00:01Z", 3, 600, &mut connection)
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
                "INSERT INTO ph_schedule_policies VALUES (?1, 8, 540, 1080, 1, 1320, 600, ?2)",
                params!["local-user", "2026-08-27T09:00:00Z"],
            )
            .unwrap();

        assert!(claim_pending("local-user", "2026-08-28T10:01:00Z", 4, 601, &mut connection)
            .unwrap()
            .is_empty());
        assert!(claim_pending("local-user", "2026-08-27T08:59:00Z", 3, 539, &mut connection)
            .unwrap()
            .is_empty());
        assert!(claim_pending("local-user", "2026-08-27T09:30:00Z", 3, 570, &mut connection)
            .unwrap()
            .is_empty());
        connection
            .execute("UPDATE ph_schedule_policies SET quiet_enabled = 0", [])
            .unwrap();
        assert_eq!(
            claim_pending("local-user", "2026-08-27T10:01:00Z", 3, 601, &mut connection)
                .unwrap(),
            vec!["break"]
        );
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
