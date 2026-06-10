use crate::sync::{compute_sha256, Manifest};
use std::fs;
use tauri::{AppHandle, Manager};

const SIDECAR_FILENAME: &str = "efficiency-memo.db.next";
const MAIN_DB_FILENAME: &str = "efficiency-memo.db";
const MANIFEST_FILENAME: &str = "manifest.json";

/// Check for a pending `.db.next` sidecar and apply it if valid.
///
/// Called during app startup BEFORE any SQLite connection is opened.
/// If `efficiency-memo.db.next` exists alongside a valid `manifest.json`,
/// the sidecar is renamed over the main database. If the checksum fails,
/// the sidecar and manifest are deleted and a warning is logged.
pub(crate) fn apply_pending_import(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let sidecar_path = data_dir.join(SIDECAR_FILENAME);

    if !sidecar_path.exists() {
        return Ok(());
    }

    let manifest_path = data_dir.join(MANIFEST_FILENAME);

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
    let main_db_path = data_dir.join(MAIN_DB_FILENAME);
    fs::rename(&sidecar_path, &main_db_path).map_err(|e| {
        format!(
            "Failed to apply pending import: rename {:?} -> {:?}: {e}",
            sidecar_path, main_db_path
        )
    })?;

    // Clean up the manifest after successful application
    let _ = fs::remove_file(&manifest_path);

    Ok(())
}
