// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

mod activity_assist;
mod core_hour;
mod data_control;
mod daily_review;
mod local_schedule;
mod desktop_companion;
mod desktop_pet;
mod foreground_application;
mod pause_hydrate;
mod review_time;
mod review_reminder;
mod sidecar;
mod sync;
mod system_idle;
mod system_interruption;
mod weekly_review;

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
        Migration {
            version: 7,
            description: "create core hour planned blocks",
            sql: include_str!("../migrations/0007_ch_planned_blocks.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create pause and hydrate schedule policy",
            sql: include_str!("../migrations/0008_pause_hydrate_schedule_policy.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add pause and hydrate natural rest",
            sql: include_str!("../migrations/0009_pause_hydrate_natural_rest.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add pause and hydrate system deferral",
            sql: include_str!("../migrations/0010_pause_hydrate_system_deferral.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "persist pause and hydrate deferral status",
            sql: include_str!("../migrations/0011_pause_hydrate_deferral_status.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "create activity assist privacy tables",
            sql: include_str!("../migrations/0012_activity_assist.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "create activity assist suggestions",
            sql: include_str!("../migrations/0013_activity_assist_suggestions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "create activity assist rules",
            sql: include_str!("../migrations/0014_activity_assist_rules.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "create CoreHour daily reviews",
            sql: include_str!("../migrations/0015_ch_daily_reviews.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "create CoreHour weekly reviews",
            sql: include_str!("../migrations/0016_ch_weekly_reviews.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "create CoreHour review reminder preferences",
            sql: include_str!("../migrations/0017_ch_review_reminders.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "create Charger Reminder notification state",
            sql: include_str!("../migrations/0018_cr_notification_state.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "create desktop reminder preferences",
            sql: include_str!("../migrations/0019_desktop_reminder_preferences.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "create desktop pet catalog",
            sql: include_str!("../migrations/0020_desktop_pet_catalog.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "remember desktop pet position",
            sql: include_str!("../migrations/0021_desktop_pet_position.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "desktop pet behavior preferences",
            sql: include_str!("../migrations/0022_desktop_pet_behavior.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "desktop pet mini mode",
            sql: include_str!("../migrations/0023_desktop_pet_mini_mode.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "remember desktop pet variant",
            sql: include_str!("../migrations/0024_desktop_pet_variant.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(desktop_pet::PetQueue::default())
        .plugin(desktop_companion::shortcut_plugin())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            desktop_companion::setup(app)?;
            desktop_pet::watch_geometry(app.handle().clone());
            activity_assist::setup(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == desktop_pet::LABEL {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                }
            }
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                desktop_pet::destroy_window(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            sync::sync_export,
            sync::sync_import,
            sync::sync_list,
            sync::store_webdav_credentials,
            data_control::current_data_summary,
            data_control::ensure_update_installable,
            data_control::create_local_backup,
            data_control::preview_local_backup,
            data_control::prepare_local_restore,
            data_control::reset_local_data,
            data_control::take_applied_restore_preferences,
            system_idle::get_system_idle_seconds,
            system_interruption::get_system_interruption_state,
            desktop_companion::show_main_window,
            desktop_companion::update_desktop_companion,
            desktop_pet::show_desktop_pet_reminder,
            desktop_pet::confirm_desktop_pet_reminder_shown,
            desktop_pet::desktop_pet_ready,
            desktop_pet::respond_to_desktop_pet_reminder,
            desktop_pet::set_desktop_pet_enabled,
            desktop_pet::select_desktop_pet,
            desktop_pet::load_desktop_pet_sprite,
            desktop_pet::drag_desktop_pet,
            desktop_pet::open_desktop_pet_menu,
            desktop_pet::snooze_desktop_pet_reminder,
            desktop_pet::finish_desktop_pet_snooze,
            desktop_pet::set_desktop_pet_behavior,
            desktop_pet::set_desktop_pet_focus,
            desktop_pet::sample_desktop_pet_behavior,
            desktop_pet::interrupt_desktop_pet_motion,
            desktop_pet::peek_desktop_pet,
            desktop_pet::update_desktop_pet_hit_regions,
            core_hour::save_core_hour_session_block,
            pause_hydrate::save_pause_hydrate_preferences,
            pause_hydrate::refresh_pause_hydrate_schedule,
            pause_hydrate::claim_pause_hydrate_reminders,
            pause_hydrate::act_on_pause_hydrate_reminder,
            pause_hydrate::complete_natural_break,
            activity_assist::load_activity_assist_state,
            activity_assist::save_activity_assist_preferences,
            activity_assist::clear_activity_assist_samples,
            activity_assist::dismiss_activity_assist_suggestion,
            activity_assist::accept_activity_assist_suggestion,
            activity_assist::save_activity_assist_rule,
            activity_assist::delete_activity_assist_rule,
            daily_review::load_daily_review,
            daily_review::save_daily_review,
            weekly_review::load_weekly_review,
            weekly_review::save_weekly_review,
            review_reminder::load_review_reminder_preferences,
            review_reminder::save_review_reminder_preferences,
            review_reminder::claim_review_reminders,
            review_reminder::acknowledge_review_reminders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
