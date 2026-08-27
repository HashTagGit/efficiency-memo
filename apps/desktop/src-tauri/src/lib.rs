// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

use tauri_plugin_sql::{Migration, MigrationKind};

mod core_hour;
mod pause_hydrate;
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
        Migration {
            version: 4,
            description: "store core hour durations",
            sql: include_str!("../migrations/0004_ch_session_durations.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "store core hour activity context",
            sql: include_str!("../migrations/0005_ch_session_activity.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create pause and hydrate reminders",
            sql: include_str!("../migrations/0006_pause_hydrate.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            core_hour::save_core_hour_session_block,
            pause_hydrate::save_pause_hydrate_preferences,
            pause_hydrate::claim_pause_hydrate_reminders,
            pause_hydrate::act_on_pause_hydrate_reminder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
