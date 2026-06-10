// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

use tauri_plugin_sql::{Migration, MigrationKind};

mod sidecar;
mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create charger reminder tables",
            sql: include_str!("../migrations/0001_cr_device_reminder.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed charger reminder presets",
            sql: include_str!("../migrations/0002_cr_seed_presets.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create core hour tables",
            sql: include_str!("../migrations/0003_ch_core_hour.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:efficiency-memo.db", migrations)
                .build(),
        )
        .setup(|app| {
            // Apply pending .db.next sidecar before any SQLite connection opens.
            // The plugin is registered but connections are lazy — no DB file is
            // open yet, so the atomic rename is safe.
            if let Err(e) = sidecar::apply_pending_import(app.handle()) {
                eprintln!("WARN: Failed to apply pending import: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync::sync_export,
            sync::sync_import,
            sync::sync_list,
            sync::store_webdav_credentials,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
