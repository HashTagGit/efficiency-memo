use crate::data_control::{
    database_dir, inspect_backup, PortablePreferences, DB_FILENAME, PREFERENCES_APPLIED_FILENAME,
    PREFERENCES_NEXT_FILENAME, SIDECAR_FILENAME,
};
use crate::sync::{compute_sha256, Manifest};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const MANIFEST_FILENAME: &str = "manifest.json";

struct DatabaseSwap {
    moved: Vec<(PathBuf, PathBuf)>,
    main_path: PathBuf,
    sidecar_path: PathBuf,
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    path.with_file_name(format!("{DB_FILENAME}{suffix}"))
}

fn restore_moved_files(moved: &[(PathBuf, PathBuf)]) -> Result<(), String> {
    let mut failure = None;
    for (current, previous) in moved.iter().rev() {
        if let Err(error) = fs::rename(previous, current) {
            if failure.is_none() {
                failure = Some(error.to_string());
            }
        }
    }
    match failure {
        Some(error) => Err(error),
        None => Ok(()),
    }
}

fn begin_database_swap(data_dir: &Path) -> Result<DatabaseSwap, String> {
    let main_path = data_dir.join(DB_FILENAME);
    let pending_path = data_dir.join(SIDECAR_FILENAME);
    let files = [
        (main_path.clone(), sibling(&main_path, ".previous")),
        (sibling(&main_path, "-wal"), sibling(&main_path, ".previous-wal")),
        (sibling(&main_path, "-shm"), sibling(&main_path, ".previous-shm")),
    ];
    let mut moved = Vec::new();
    for (current, previous) in files {
        let _ = fs::remove_file(&previous);
        if current.exists() {
            if let Err(error) = fs::rename(&current, &previous) {
                return match restore_moved_files(&moved) {
                    Ok(()) => Err(error.to_string()),
                    Err(rollback_error) => Err(format!(
                        "{error}. Partial-move rollback also failed: {rollback_error}"
                    )),
                };
            }
            moved.push((current, previous));
        }
    }
    if let Err(error) = fs::rename(&pending_path, &main_path) {
        return match restore_moved_files(&moved) {
            Ok(()) => Err(error.to_string()),
            Err(rollback_error) => Err(format!(
                "{error}. Pending-move rollback also failed: {rollback_error}"
            )),
        };
    }
    Ok(DatabaseSwap {
        moved,
        main_path,
        sidecar_path: pending_path,
    })
}

fn commit_database_swap(swap: DatabaseSwap) {
    for (_, previous) in swap.moved {
        let _ = fs::remove_file(previous);
    }
}

fn rollback_database_swap(swap: DatabaseSwap) -> Result<(), String> {
    let mut failure = fs::rename(&swap.main_path, &swap.sidecar_path)
        .err()
        .map(|error| error.to_string());
    if let Err(error) = restore_moved_files(&swap.moved) {
        if failure.is_none() {
            failure = Some(error);
        }
    }
    match failure {
        Some(error) => Err(error),
        None => Ok(()),
    }
}

/// Check for a pending `.db.next` sidecar and apply it if valid.
///
/// Called during app startup BEFORE any SQLite connection is opened.
/// If `efficiency-memo.db.next` exists alongside a valid `manifest.json`,
/// the sidecar is renamed over the main database. If the checksum fails,
/// the sidecar and manifest are deleted and a warning is logged.
pub(crate) fn apply_pending_import(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = database_dir(app)?;

    let sidecar_path = data_dir.join(SIDECAR_FILENAME);

    if !sidecar_path.exists() {
        return Ok(());
    }

    let manifest_path = data_dir.join(MANIFEST_FILENAME);

    let preferences_next = data_dir.join(PREFERENCES_NEXT_FILENAME);
    if preferences_next.exists() {
        let preview = match inspect_backup(&sidecar_path) {
            Ok(preview) => preview,
            Err(error) => {
                let _ = fs::remove_file(&sidecar_path);
                let _ = fs::remove_file(&preferences_next);
                return Err(error.into());
            }
        };
        let staged_preferences = fs::read_to_string(&preferences_next)
            .map_err(|error| error.to_string())
            .and_then(|content| {
                serde_json::from_str::<PortablePreferences>(&content)
                    .map_err(|error| error.to_string())
            });
        let staged_preferences = match staged_preferences {
            Ok(preferences) => preferences,
            Err(error) => {
                let _ = fs::remove_file(&sidecar_path);
                let _ = fs::remove_file(&preferences_next);
                return Err(error.into());
            }
        };
        if staged_preferences != preview.preferences {
            let _ = fs::remove_file(&sidecar_path);
            let _ = fs::remove_file(&preferences_next);
            return Err("Staged restore preferences do not match the backup.".into());
        }
        let swap = begin_database_swap(&data_dir)?;
        let installed = inspect_backup(&swap.main_path);
        if installed
            .as_ref()
            .map(|installed| installed.preferences != staged_preferences)
            .unwrap_or(true)
        {
            let validation_error = installed
                .err()
                .unwrap_or_else(|| "Installed restore preferences do not match.".to_string());
            return match rollback_database_swap(swap) {
                Ok(()) => Err(validation_error.into()),
                Err(rollback_error) => Err(format!(
                    "{validation_error} Rollback also failed: {rollback_error}"
                )
                .into()),
            };
        }
        let applied_preferences = data_dir.join(PREFERENCES_APPLIED_FILENAME);
        let _ = fs::remove_file(&applied_preferences);
        if let Err(error) = fs::rename(&preferences_next, &applied_preferences) {
            return match rollback_database_swap(swap) {
                Ok(()) => Err(format!("Failed to apply restored preferences: {error}").into()),
                Err(rollback_error) => Err(format!(
                    "Failed to apply restored preferences: {error}. Rollback also failed: {rollback_error}"
                )
                .into()),
            };
        }
        commit_database_swap(swap);
        let _ = fs::remove_file(&manifest_path);
        return Ok(());
    }

    // Read expected checksum from manifest
    let expected_sha256 = if manifest_path.exists() {
        let manifest_bytes = fs::read_to_string(&manifest_path).map_err(|e| {
            format!("Failed to read import manifest at {:?}: {e}", manifest_path)
        })?;
        let manifest: Manifest = serde_json::from_str(&manifest_bytes).map_err(|e| {
            format!("Failed to parse import manifest: {e}")
        })?;
        manifest.sha256
    } else {
        // No manifest — treat as corrupted
        eprintln!(
            "WARN: Found .db.next sidecar without manifest.json at {:?}. Deleting sidecar.",
            data_dir
        );
        let _ = fs::remove_file(&sidecar_path);
        return Ok(());
    };

    // Compute actual SHA256 of the sidecar
    let actual_sha256 = match compute_sha256(&sidecar_path) {
        Ok(hash) => hash,
        Err(e) => {
            eprintln!(
                "WARN: Failed to compute checksum of .db.next at {:?}: {e}. Deleting sidecar.",
                sidecar_path
            );
            let _ = fs::remove_file(&sidecar_path);
            let _ = fs::remove_file(&manifest_path);
            return Ok(());
        }
    };

    if actual_sha256 != expected_sha256 {
        eprintln!(
            "WARN: Checksum mismatch for .db.next at {:?}. Expected {}, got {}. Deleting sidecar and manifest.",
            data_dir, expected_sha256, actual_sha256
        );
        let _ = fs::remove_file(&sidecar_path);
        let _ = fs::remove_file(&manifest_path);
        return Ok(());
    }

    // Checksum verified — atomically rename sidecar over main database
    commit_database_swap(begin_database_swap(&data_dir)?);

    // Clean up the manifest after successful application
    let _ = fs::remove_file(&manifest_path);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{begin_database_swap, rollback_database_swap, DB_FILENAME, SIDECAR_FILENAME};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn missing_pending_database_restores_current_database() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "efficiency-memo-sidecar-{}-{suffix}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let main = directory.join(DB_FILENAME);
        fs::write(&main, b"current").unwrap();

        assert!(begin_database_swap(&directory).is_err());
        assert_eq!(fs::read(&main).unwrap(), b"current");

        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn completed_swap_can_restore_previous_database() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "efficiency-memo-sidecar-rollback-{}-{suffix}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let main = directory.join(DB_FILENAME);
        let pending = directory.join(SIDECAR_FILENAME);
        fs::write(&main, b"current").unwrap();
        fs::write(&pending, b"restored").unwrap();

        let swap = begin_database_swap(&directory).unwrap();
        assert_eq!(fs::read(&main).unwrap(), b"restored");
        rollback_database_swap(swap).unwrap();
        assert_eq!(fs::read(&main).unwrap(), b"current");
        assert_eq!(fs::read(&pending).unwrap(), b"restored");

        let _ = fs::remove_dir_all(directory);
    }
}
