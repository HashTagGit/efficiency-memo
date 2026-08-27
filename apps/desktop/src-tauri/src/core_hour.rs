use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "efficiency-memo.db";

#[derive(Deserialize)]
pub(crate) struct SessionBlockInput {
    id: Option<String>,
    user_id: String,
    activity: String,
    default_tag_id: Option<String>,
    started_at: String,
    ended_at: String,
    adjust_duration: bool,
    adjust_tag: bool,
    start_local_date: String,
    end_local_date: String,
    new_session_id: String,
    new_check_in_id: String,
    new_entry_id: String,
}

fn redistribute_durations(durations: &[i64], target: i64) -> Vec<i64> {
    if durations.is_empty() {
        return Vec::new();
    }
    let total: i64 = durations.iter().sum();
    if total <= 0 {
        return durations
            .iter()
            .enumerate()
            .map(|(index, _)| if index == 0 { target } else { 0 })
            .collect();
    }

    let exact: Vec<f64> = durations
        .iter()
        .map(|duration| *duration as f64 / total as f64 * target as f64)
        .collect();
    let mut result: Vec<i64> = exact.iter().map(|duration| duration.floor() as i64).collect();
    let mut remainder = target - result.iter().sum::<i64>();
    let mut order: Vec<usize> = (0..durations.len()).collect();
    order.sort_by(|left, right| {
        exact[*right]
            .fract()
            .total_cmp(&exact[*left].fract())
            .then(left.cmp(right))
    });
    let mut index = 0;
    while remainder > 0 {
        result[order[index % order.len()]] += 1;
        remainder -= 1;
        index += 1;
    }
    result
}

fn save_session_block(
    input: SessionBlockInput,
    connection: &mut Connection,
) -> Result<String, String> {
    let started_at = DateTime::parse_from_rfc3339(&input.started_at)
        .map_err(|_| "invalid-range".to_string())?
        .with_timezone(&Utc);
    let ended_at = DateTime::parse_from_rfc3339(&input.ended_at)
        .map_err(|_| "invalid-range".to_string())?
        .with_timezone(&Utc);
    let duration_seconds = (ended_at - started_at).num_seconds();
    if (input.id.is_none() || input.adjust_duration) && duration_seconds <= 0 {
        return Err("invalid-range".to_string());
    }
    if (input.id.is_none() || input.adjust_duration)
        && input.start_local_date != input.end_local_date
    {
        return Err("cross-day".to_string());
    }

    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let existing_elapsed = if let Some(session_id) = input.id.as_deref() {
        transaction
            .query_row(
                "SELECT elapsed_seconds FROM ch_sessions WHERE id = ?1 AND user_id = ?2",
                params![session_id, input.user_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "not-found".to_string())?
    } else {
        duration_seconds
    };
    if input.id.is_none() || input.adjust_tag {
        if let Some(tag_id) = input.default_tag_id.as_deref() {
            let valid_tag: i64 = transaction
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM ch_tags WHERE id = ?1 AND user_id = ?2 AND is_archived = 0)",
                    params![tag_id, input.user_id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if valid_tag == 0 {
                return Err("invalid-tag".to_string());
            }
        }
    }
    if input.id.is_none() || input.adjust_duration || input.adjust_tag {
        let excluded_id = input.id.as_deref().unwrap_or("");
        let overlap: i64 = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM ch_sessions WHERE user_id = ?1 AND id <> ?4 AND started_at < ?3 AND (ended_at IS NULL OR ended_at > ?2))",
                params![input.user_id, input.started_at, input.ended_at, excluded_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if overlap != 0 {
            return Err("overlap".to_string());
        }
    }

    let session_id = input.id.clone().unwrap_or(input.new_session_id);
    if input.id.is_some() {
        if input.adjust_duration {
            transaction
                .execute(
                    "UPDATE ch_sessions SET activity = ?1, default_tag_id = ?2, started_at = ?3, ended_at = ?4, elapsed_seconds = ?5, synced = 0 WHERE id = ?6 AND user_id = ?7",
                    params![
                        input.activity.trim(),
                        input.default_tag_id,
                        input.started_at,
                        input.ended_at,
                        duration_seconds,
                        session_id,
                        input.user_id,
                    ],
                )
                .map_err(|error| error.to_string())?;
        } else {
            transaction
                .execute(
                    "UPDATE ch_sessions SET activity = ?1, default_tag_id = ?2, synced = 0 WHERE id = ?3 AND user_id = ?4",
                    params![
                        input.activity.trim(),
                        input.default_tag_id,
                        session_id,
                        input.user_id,
                    ],
                )
                .map_err(|error| error.to_string())?;
        }
    } else {
        transaction
            .execute(
                "INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, activity, default_tag_id, is_favorite, synced) VALUES (?1, ?2, ?3, ?4, 30, ?5, ?6, ?7, 0, 0)",
                params![
                    session_id,
                    input.user_id,
                    input.started_at,
                    input.ended_at,
                    duration_seconds,
                    input.activity.trim(),
                    input.default_tag_id,
                ],
            )
            .map_err(|error| error.to_string())?;
    }

    if input.id.is_none() || input.adjust_duration || input.adjust_tag {
        let check_ins: Vec<(String, i64)> = {
            let mut statement = transaction
                .prepare(
                    "SELECT id, duration_seconds FROM ch_check_ins WHERE session_id = ?1 ORDER BY checked_at ASC",
                )
                .map_err(|error| error.to_string())?;
            let rows = statement
                .query_map([&session_id], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|error| error.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())?;
            rows
        };

        if check_ins.is_empty() {
            transaction
                .execute(
                    "INSERT INTO ch_check_ins (id, session_id, checked_at, skipped, note, duration_seconds, synced) VALUES (?1, ?2, ?3, ?4, '', ?5, 0)",
                    params![
                        input.new_check_in_id,
                        session_id,
                        input.ended_at,
                        if input.default_tag_id.is_some() { 0 } else { 1 },
                        if input.adjust_duration {
                            duration_seconds
                        } else {
                            existing_elapsed
                        },
                    ],
                )
                .map_err(|error| error.to_string())?;
            if let Some(tag_id) = input.default_tag_id.as_deref() {
                transaction
                    .execute(
                        "INSERT INTO ch_check_in_entries (id, check_in_id, tag_id, percentage, synced) VALUES (?1, ?2, ?3, 100, 0)",
                        params![input.new_entry_id, input.new_check_in_id, tag_id],
                    )
                    .map_err(|error| error.to_string())?;
            }
        } else {
            if input.adjust_duration {
                let redistributed = redistribute_durations(
                    &check_ins
                        .iter()
                        .map(|(_, duration)| *duration)
                        .collect::<Vec<_>>(),
                    duration_seconds,
                );
                let wall_milliseconds = (ended_at - started_at).num_milliseconds();
                let mut cumulative = 0;
                for ((check_in_id, _), duration) in check_ins.iter().zip(redistributed) {
                    cumulative += duration;
                    let checked_at = started_at
                        + Duration::milliseconds(
                            wall_milliseconds * cumulative / duration_seconds,
                        );
                    transaction
                        .execute(
                            "UPDATE ch_check_ins SET checked_at = ?1, duration_seconds = ?2, synced = 0 WHERE id = ?3",
                            params![checked_at.to_rfc3339(), duration, check_in_id],
                        )
                        .map_err(|error| error.to_string())?;
                }
            }
            if input.id.is_some() && input.adjust_tag {
                for (index, (check_in_id, _)) in check_ins.iter().enumerate() {
                    transaction
                        .execute(
                            "UPDATE ch_check_ins SET skipped = ?1, synced = 0 WHERE id = ?2",
                            params![
                                if input.default_tag_id.is_some() { 0 } else { 1 },
                                check_in_id,
                            ],
                        )
                        .map_err(|error| error.to_string())?;
                    transaction
                        .execute(
                            "DELETE FROM ch_check_in_entries WHERE check_in_id = ?1",
                            [check_in_id],
                        )
                        .map_err(|error| error.to_string())?;
                    if let Some(tag_id) = input.default_tag_id.as_deref() {
                        transaction
                            .execute(
                                "INSERT INTO ch_check_in_entries (id, check_in_id, tag_id, percentage, synced) VALUES (?1, ?2, ?3, 100, 0)",
                                params![
                                    format!("{}-{index}", input.new_entry_id),
                                    check_in_id,
                                    tag_id,
                                ],
                            )
                            .map_err(|error| error.to_string())?;
                    }
                }
            }
        }
    }

    transaction.commit().map_err(|error| error.to_string())?;
    Ok(session_id)
}

#[tauri::command]
pub(crate) fn save_core_hour_session_block(
    input: SessionBlockInput,
    app: AppHandle,
) -> Result<String, String> {
    let db_path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DB_FILENAME);
    let mut connection = Connection::open(db_path).map_err(|error| error.to_string())?;
    save_session_block(input, &mut connection)
}

#[cfg(test)]
mod tests {
    use super::{redistribute_durations, save_session_block, SessionBlockInput};
    use rusqlite::{params, Connection};

    fn test_connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "
                CREATE TABLE ch_sessions (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, started_at TEXT NOT NULL,
                    ended_at TEXT, interval_minutes INTEGER NOT NULL, elapsed_seconds INTEGER NOT NULL,
                    activity TEXT NOT NULL, default_tag_id TEXT, is_favorite INTEGER NOT NULL, synced INTEGER NOT NULL
                );
                CREATE TABLE ch_check_ins (
                    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, checked_at TEXT NOT NULL,
                    skipped INTEGER NOT NULL, note TEXT NOT NULL, duration_seconds INTEGER NOT NULL, synced INTEGER NOT NULL
                );
                CREATE TABLE ch_check_in_entries (
                    id TEXT PRIMARY KEY, check_in_id TEXT NOT NULL, tag_id TEXT NOT NULL,
                    percentage INTEGER NOT NULL, synced INTEGER NOT NULL
                );
                CREATE TABLE ch_tags (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, is_archived INTEGER NOT NULL
                );
                INSERT INTO ch_tags VALUES ('tag-1', 'local-user', 0);
                ",
            )
            .unwrap();
        connection
    }

    fn input(id: Option<&str>, adjust_duration: bool) -> SessionBlockInput {
        SessionBlockInput {
            id: id.map(str::to_string),
            user_id: "local-user".to_string(),
            activity: "Planning".to_string(),
            default_tag_id: Some("tag-1".to_string()),
            started_at: "2026-08-27T10:00:00.000Z".to_string(),
            ended_at: "2026-08-27T11:00:00.000Z".to_string(),
            adjust_duration,
            adjust_tag: false,
            start_local_date: "2026-08-27".to_string(),
            end_local_date: "2026-08-27".to_string(),
            new_session_id: "new-session".to_string(),
            new_check_in_id: "new-check-in".to_string(),
            new_entry_id: "new-entry".to_string(),
        }
    }

    #[test]
    fn redistributes_duration_without_changing_total() {
        assert_eq!(redistribute_durations(&[600, 1200, 300], 1500), [429, 857, 214]);
        assert_eq!(redistribute_durations(&[0, 0], 900), [900, 0]);
    }

    #[test]
    fn metadata_edit_preserves_paused_duration_and_check_in() {
        let mut connection = test_connection();
        connection
            .execute(
                "INSERT INTO ch_sessions VALUES (?1, ?2, ?3, ?4, 30, 1800, 'Old', NULL, 0, 0)",
                params![
                    "session-1",
                    "local-user",
                    "2026-08-27T10:00:00.000Z",
                    "2026-08-27T11:00:00.000Z",
                ],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO ch_check_ins VALUES ('check-in-1', 'session-1', '2026-08-27T10:30:00.000Z', 1, 'Keep', 1800, 0)",
                [],
            )
            .unwrap();

        let mut metadata = input(Some("session-1"), false);
        metadata.ended_at = metadata.started_at.clone();
        save_session_block(metadata, &mut connection).unwrap();

        let session: (String, i64) = connection
            .query_row(
                "SELECT activity, elapsed_seconds FROM ch_sessions WHERE id = 'session-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let check_in: (String, i64) = connection
            .query_row(
                "SELECT note, duration_seconds FROM ch_check_ins WHERE id = 'check-in-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(session, ("Planning".to_string(), 1800));
        assert_eq!(check_in, ("Keep".to_string(), 1800));
    }

    #[test]
    fn tag_edit_reclassifies_check_ins_without_losing_notes() {
        let mut connection = test_connection();
        connection
            .execute(
                "INSERT INTO ch_sessions VALUES ('session-1', 'local-user', ?1, ?2, 30, 1800, 'Planning', NULL, 0, 0)",
                params![
                    "2026-08-27T10:00:00.000Z",
                    "2026-08-27T11:00:00.000Z",
                ],
            )
            .unwrap();
        connection
            .execute_batch(
                "
                INSERT INTO ch_check_ins VALUES ('check-1', 'session-1', '2026-08-27T10:20:00.000Z', 0, 'First', 600, 0);
                INSERT INTO ch_check_ins VALUES ('check-2', 'session-1', '2026-08-27T11:00:00.000Z', 0, 'Second', 1200, 0);
                INSERT INTO ch_check_in_entries VALUES ('old-1', 'check-1', 'old-tag', 100, 0);
                INSERT INTO ch_check_in_entries VALUES ('old-2', 'check-2', 'old-tag', 100, 0);
                ",
            )
            .unwrap();
        let mut tag_edit = input(Some("session-1"), false);
        tag_edit.adjust_tag = true;

        save_session_block(tag_edit, &mut connection).unwrap();

        let entry_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM ch_check_in_entries WHERE tag_id = 'tag-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let notes: String = connection
            .query_row(
                "SELECT GROUP_CONCAT(note, ',') FROM ch_check_ins ORDER BY checked_at",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(entry_count, 2);
        assert_eq!(notes, "First,Second");
    }

    #[test]
    fn manual_session_is_atomic_and_rejects_overlap() {
        let mut connection = test_connection();
        save_session_block(input(None, true), &mut connection).unwrap();

        let counts: (i64, i64, i64) = connection
            .query_row(
                "SELECT (SELECT COUNT(*) FROM ch_sessions), (SELECT COUNT(*) FROM ch_check_ins), (SELECT COUNT(*) FROM ch_check_in_entries)",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(counts, (1, 1, 1));

        let mut overlapping = input(None, true);
        overlapping.new_session_id = "overlap-session".to_string();
        overlapping.started_at = "2026-08-27T10:30:00.000Z".to_string();
        overlapping.ended_at = "2026-08-27T11:30:00.000Z".to_string();
        assert_eq!(
            save_session_block(overlapping, &mut connection),
            Err("overlap".to_string()),
        );

        let mut failing_connection = test_connection();
        failing_connection
            .execute_batch(
                "CREATE TRIGGER fail_check_in BEFORE INSERT ON ch_check_ins BEGIN SELECT RAISE(ABORT, 'fail'); END;",
            )
            .unwrap();
        assert!(save_session_block(input(None, true), &mut failing_connection).is_err());
        let session_count: i64 = failing_connection
            .query_row("SELECT COUNT(*) FROM ch_sessions", [], |row| row.get(0))
            .unwrap();
        assert_eq!(session_count, 0);
    }
}
