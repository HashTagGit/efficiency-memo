// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Tauri v2 plugin registration
        // Plugin registrations will be added in Task 3 when migrations are integrated
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
