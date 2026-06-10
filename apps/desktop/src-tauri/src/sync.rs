use chrono::Utc;
use reqwest_dav::types::list_cmd::ListEntity;
use reqwest_dav::types::Auth;
use reqwest_dav::types::Depth;
use reqwest_dav::ClientBuilder;
use reqwest_dav::Client;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const SCHEMA_VERSION: i64 = 3;
const BACKUP_DIR: &str = "memo-backups";
const DB_FILENAME: &str = "efficiency-memo.db";
const KEYRING_SERVICE: &str = "com.efficiency-memo.app.webdav";

#[derive(Serialize, Deserialize, Debug)]
pub(crate) struct Manifest {
    pub(crate) device_id: String,
    pub(crate) schema_version: i64,
    pub(crate) timestamp: String,
    pub(crate) sha256: String,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn get_device_id() -> String {
    let input = dirs::data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "efficiency-memo".to_string());
    let hash = Sha256::digest(input);
    hex::encode(&hash[..8])
}

async fn build_dav_client(url: &str, username: &str) -> Result<Client, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, username)
        .map_err(|e| format!("Failed to access keychain: {e}"))?;
    let password = entry
        .get_password()
        .map_err(|e| format!("Failed to retrieve stored password: {e}"))?;

    ClientBuilder::new()
        .set_host(url.to_string())
        .set_auth(Auth::Basic(username.to_string(), password))
        .build()
        .map_err(|e| format!("Failed to create WebDAV client: {e}"))
}

pub(crate) fn compute_sha256(path: &PathBuf) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file for checksum: {e}"))?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

/// Export the local SQLite database to a WebDAV backup.
///
/// 1. Runs WAL checkpoint to flush pending writes
/// 2. Creates a clean snapshot via VACUUM INTO
/// 3. Computes SHA256 checksum of the snapshot
/// 4. Uploads the snapshot to /memo-backups/<device-id>/<timestamp>.db
/// 5. Uploads a manifest.json with metadata for future imports
#[tauri::command]
pub async fn sync_export(url: String, username: String, app: AppHandle) -> Result<String, String> {
    let data_dir = app_data_dir(&app)?;
    let db_path = data_dir.join(DB_FILENAME);
    let device_id = get_device_id();
    let timestamp = Utc::now().format("%Y%m%dT%H%M%SZ").to_string();
    let snapshot_filename = format!("{}.db", timestamp);
    let snapshot_path = data_dir.join(&snapshot_filename);

    // 1. Checkpoint WAL to flush pending writes into the main database file
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database for checkpoint: {e}"))?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|e| format!("WAL checkpoint failed: {e}"))?;

    // 2. VACUUM INTO creates a clean, defragmented, self-contained snapshot.
    //    Escape single quotes in the path for the SQL string literal.
    let vacuum_sql = format!(
        "VACUUM INTO '{}';",
        snapshot_path.to_string_lossy().replace('\'', "''")
    );
    conn.execute_batch(&vacuum_sql)
        .map_err(|e| format!("VACUUM INTO failed: {e}"))?;
    drop(conn);

    // 3. Compute SHA256 of the snapshot for integrity verification on import
    let sha256 = compute_sha256(&snapshot_path)?;

    // 4. Build WebDAV client (password retrieved from OS keychain)
    let client = build_dav_client(&url, &username).await?;

    // 5. Ensure remote directory structure exists
    let top_dir = format!("/{}/", BACKUP_DIR);
    let device_dir = format!("/{}/{}/", BACKUP_DIR, device_id);
    // Try mkcol on each level; ignore errors if directories already exist
    let _ = client.mkcol(&top_dir).await;
    let _ = client.mkcol(&device_dir).await;

    // 6. Upload the snapshot
    let snapshot_bytes = fs::read(&snapshot_path)
        .map_err(|e| format!("Failed to read snapshot for upload: {e}"))?;
    let remote_db_path = format!("/{}/{}/{}", BACKUP_DIR, device_id, snapshot_filename);
    client
        .put(&remote_db_path, snapshot_bytes)
        .await
        .map_err(|e| format!("Upload failed: {e}"))?;

    // 7. Upload manifest.json with metadata for future imports
    let manifest = Manifest {
        device_id: device_id.clone(),
        schema_version: SCHEMA_VERSION,
        timestamp: timestamp.clone(),
        sha256,
    };
    let manifest_json = serde_json::to_vec(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {e}"))?;
    let manifest_path = format!("/{}/{}/manifest.json", BACKUP_DIR, device_id);
    client
        .put(&manifest_path, manifest_json)
        .await
        .map_err(|e| format!("Manifest upload failed: {e}"))?;

    // 8. Clean up local snapshot file (no longer needed after upload)
    let _ = fs::remove_file(&snapshot_path);

    Ok(snapshot_filename)
}

/// Import the latest backup from WebDAV.
///
/// Downloads the latest backup identified by manifest.json, verifies the
/// SHA256 checksum, and writes the verified database to a sidecar file at
/// `<app_data_dir>/efficiency-memo.db.next`.
///
/// The active database connection cannot be safely replaced while the app
/// is running (the JS side holds an open connection). The user must restart
/// the application for the import to take effect.
#[tauri::command]
pub async fn sync_import(url: String, username: String, app: AppHandle) -> Result<String, String> {
    let data_dir = app_data_dir(&app)?;
    let device_id = get_device_id();

    // 1. Build WebDAV client
    let client = build_dav_client(&url, &username).await?;

    // 2. Download and parse manifest.json
    let manifest_path = format!("/{}/{}/manifest.json", BACKUP_DIR, device_id);
    let response = client
        .get(&manifest_path)
        .await
        .map_err(|e| format!("Failed to fetch manifest: {e}"))?;
    let manifest_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read manifest response: {e}"))?;
    let manifest: Manifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|e| format!("Failed to parse manifest: {e}"))?;

    // Validate schema version compatibility
    if manifest.schema_version > SCHEMA_VERSION {
        return Err(format!(
            "Backup was created with schema version {}, but this app supports up to version {}. Please update the application before importing this backup.",
            manifest.schema_version, SCHEMA_VERSION
        ));
    }

    // 3. Download the backup database file
    let remote_db_filename = format!("{}.db", manifest.timestamp);
    let remote_db_path = format!("/{}/{}/{}", BACKUP_DIR, device_id, remote_db_filename);
    let temp_path = data_dir.join("efficiency-memo-import-temp.db");

    let response = client
        .get(&remote_db_path)
        .await
        .map_err(|e| format!("Failed to download backup: {e}"))?;
    let db_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read backup response: {e}"))?;
    fs::write(&temp_path, &db_bytes)
        .map_err(|e| format!("Failed to write temporary download: {e}"))?;

    // 4. Verify SHA256 checksum against manifest
    let actual_sha256 = compute_sha256(&temp_path)?;
    if actual_sha256 != manifest.sha256 {
        let _ = fs::remove_file(&temp_path);
        return Err(format!(
            "Checksum verification failed: expected {} but downloaded file has {}. The backup may be corrupted or tampered with.",
            manifest.sha256, actual_sha256
        ));
    }

    // 5. Write verified backup to the sidecar path.
    //    The active database cannot be replaced while the JS side holds
    //    an open SQLite connection. The sidecar file will be picked up
    //    on the next app restart.
    let sidecar_path = data_dir.join("efficiency-memo.db.next");
    fs::copy(&temp_path, &sidecar_path)
        .map_err(|e| format!("Failed to write imported database: {e}"))?;
    let _ = fs::remove_file(&temp_path);

    // Write manifest.json alongside .db.next so the startup sidecar check
    // can verify the checksum before applying the import.
    let manifest_local_path = data_dir.join("manifest.json");
    let manifest_json =
        serde_json::to_string(&manifest).map_err(|e| format!("Failed to serialize manifest: {e}"))?;
    fs::write(&manifest_local_path, manifest_json)
        .map_err(|e| format!("Failed to write import manifest: {e}"))?;

    Ok(format!(
        "Backup from {} imported and verified successfully. The database has been saved to 'efficiency-memo.db.next'. Please restart the application to complete the import.",
        manifest.timestamp
    ))
}

/// List available backups on the WebDAV server for this device.
///
/// Returns a list of filenames (both .db backup files and manifest.json)
/// found under /memo-backups/<device-id>/.
#[tauri::command]
pub async fn sync_list(url: String, username: String) -> Result<Vec<String>, String> {
    let device_id = get_device_id();
    let client = build_dav_client(&url, &username).await?;
    let device_dir = format!("/{}/{}/", BACKUP_DIR, device_id);

    // PROPFIND the device directory; return empty list if it does not exist
    let entries = match client.list(&device_dir, Depth::Number(1)).await {
        Ok(entries) => entries,
        Err(_) => return Ok(Vec::new()),
    };

    let mut filenames: Vec<String> = Vec::new();
    for entry in entries {
        // Extract the basename from the entry's href (full path).
        // href looks like "/memo-backups/<device-id>/<filename>"
        let href = match &entry {
            ListEntity::File(f) => &f.href,
            ListEntity::Folder(f) => &f.href,
        };
        let name = href
            .rsplit('/')
            .next()
            .filter(|n| !n.is_empty())
            .map(|n| n.to_string());

        if let Some(name) = name {
            if name.ends_with(".db") || name == "manifest.json" {
                filenames.push(name);
            }
        }
    }

    Ok(filenames)
}

/// Store WebDAV credentials in the OS keychain.
///
/// On Windows this uses the Credential Manager, on macOS the Keychain,
/// and on Linux the Secret Service (via the async-secret-service feature).
/// Credentials are never written to disk in plain text.
#[tauri::command]
pub async fn store_webdav_credentials(
    username: String,
    password: String,
) -> Result<(), String> {
    keyring::Entry::new(KEYRING_SERVICE, &username)
        .map_err(|e| format!("Failed to access keychain: {e}"))?
        .set_password(&password)
        .map_err(|e| format!("Failed to store password: {e}"))?;
    Ok(())
}
