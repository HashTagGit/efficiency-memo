use std::sync::atomic::{AtomicBool, Ordering};

use serde::Deserialize;
use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder},
    plugin::TauriPlugin,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Runtime, State, Wry,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const FOCUS_ACTION: &str = "focus-action";
const END_FOCUS: &str = "end-focus";
const SHOW_APP: &str = "show-app";
const OPEN_TODAY: &str = "open-today";
const OPEN_PAUSE_HYDRATE: &str = "open-pause-hydrate";
const OPEN_SETTINGS: &str = "open-settings";
const QUIT: &str = "quit";

pub fn shortcut_plugin() -> TauriPlugin<Wry> {
    tauri_plugin_global_shortcut::Builder::new().build()
}

pub struct DesktopCompanionState {
    tray: TrayIcon,
    hide_on_close: AtomicBool,
    focus_status: MenuItem<Wry>,
    focus_action: MenuItem<Wry>,
    end_focus: MenuItem<Wry>,
    break_status: MenuItem<Wry>,
    hydration_status: MenuItem<Wry>,
    show_app: MenuItem<Wry>,
    open_today: MenuItem<Wry>,
    open_pause_hydrate: MenuItem<Wry>,
    open_settings: MenuItem<Wry>,
    show_pet: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCompanionInput {
    focus_status: String,
    focus_action: String,
    end_focus: String,
    end_focus_enabled: bool,
    break_status: String,
    hydration_status: String,
    show_app: String,
    open_today: String,
    open_pause_hydrate: String,
    open_settings: String,
    show_pet: String,
    quit: String,
    tooltip: String,
}

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let focus_status = MenuItemBuilder::with_id("focus-status", "No active focus")
        .enabled(false)
        .build(app)?;
    let focus_action = MenuItemBuilder::with_id(FOCUS_ACTION, "Start latest activity").build(app)?;
    let end_focus = MenuItemBuilder::with_id(END_FOCUS, "End focus")
        .accelerator("Ctrl+Shift+Space")
        .enabled(false)
        .build(app)?;
    let break_status = MenuItemBuilder::with_id("break-status", "Movement break: Off")
        .enabled(false)
        .build(app)?;
    let hydration_status = MenuItemBuilder::with_id("hydration-status", "Hydration: Off")
        .enabled(false)
        .build(app)?;
    let show_app = MenuItemBuilder::with_id(SHOW_APP, "Show EfficiencyMemo")
        .accelerator("Ctrl+Shift+M")
        .build(app)?;
    let open_today = MenuItemBuilder::with_id(OPEN_TODAY, "Open CoreHour Today").build(app)?;
    let open_pause_hydrate =
        MenuItemBuilder::with_id(OPEN_PAUSE_HYDRATE, "Open Pause & Hydrate").build(app)?;
    let open_settings = MenuItemBuilder::with_id(OPEN_SETTINGS, "Open settings").build(app)?;
    let show_pet = MenuItemBuilder::with_id(crate::desktop_pet::SHOW_PET, "Show desktop pet")
        .enabled(false).build(app)?;
    let quit = MenuItemBuilder::with_id(QUIT, "Quit EfficiencyMemo").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&focus_status, &focus_action, &end_focus])
        .separator()
        .items(&[&break_status, &hydration_status])
        .separator()
        .items(&[&show_app, &open_today, &open_pause_hydrate, &open_settings]);
    let menu = if cfg!(target_os = "windows") { menu.item(&show_pet) } else { menu };
    let menu = menu.separator()
        .item(&quit)
        .build()?;

    let mut builder = TrayIconBuilder::with_id("efficiency-memo")
        .menu(&menu)
        .tooltip("EfficiencyMemo")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            FOCUS_ACTION => emit_command(app, "primary-focus", false),
            END_FOCUS => emit_command(app, "end-focus", false),
            SHOW_APP => reveal_main_window(app),
            OPEN_TODAY => emit_command(app, "open-today", true),
            OPEN_PAUSE_HYDRATE => emit_command(app, "open-pause-hydrate", true),
            OPEN_SETTINGS => emit_command(app, "open-settings", true),
            QUIT => app.exit(0),
            id => crate::desktop_pet::handle_menu_event(app, id),
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                reveal_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    let tray = builder.build(app)?;

    app.manage(DesktopCompanionState {
        tray,
        hide_on_close: AtomicBool::new(false),
        focus_status,
        focus_action,
        end_focus,
        break_status,
        hydration_status,
        show_app,
        open_today,
        open_pause_hydrate,
        open_settings,
        show_pet,
        quit,
    });
    register_shortcuts(app.handle());
    Ok(())
}

fn register_shortcuts<R: Runtime>(app: &AppHandle<R>) {
    let modifiers = Modifiers::CONTROL | Modifiers::SHIFT;
    let show_shortcut = Shortcut::new(Some(modifiers), Code::KeyM);
    if let Err(error) = app.global_shortcut().on_shortcut(show_shortcut, |app, _, event| {
        if event.state == ShortcutState::Pressed {
            toggle_main_window(app);
        }
    }) {
        eprintln!("WARN: Could not register Ctrl+Shift+M: {error}");
    }

    let focus_shortcut = Shortcut::new(Some(modifiers), Code::Space);
    if let Err(error) = app.global_shortcut().on_shortcut(focus_shortcut, |app, _, event| {
        if event.state == ShortcutState::Pressed {
            emit_command(app, "start-stop-focus", false);
        }
    }) {
        eprintln!("WARN: Could not register Ctrl+Shift+Space: {error}");
    }
}

pub(crate) fn emit_command<R: Runtime>(app: &AppHandle<R>, command: &str, show_window: bool) {
    if show_window {
        reveal_main_window(app);
    }
    let _ = app.emit("desktop-command", command);
}

fn reveal_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            reveal_main_window(app);
        }
    }
}

fn display_text(value: &str) -> String {
    value
        .chars()
        .filter(|character| !character.is_control())
        .take(120)
        .collect::<String>()
}

pub(crate) fn menu_text(value: &str) -> String {
    display_text(value).replace('&', "&&")
}

pub(crate) fn set_show_pet_enabled(app: &AppHandle, enabled: bool) -> tauri::Result<()> {
    app.state::<DesktopCompanionState>().show_pet.set_enabled(enabled)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    reveal_main_window(&app);
}

pub(crate) fn hide_on_close(app: &AppHandle) -> bool {
    app.state::<DesktopCompanionState>().hide_on_close.load(Ordering::Relaxed)
}

#[tauri::command]
pub(crate) fn set_main_window_close_behavior(window: tauri::WebviewWindow, hide_to_tray: bool) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Expected the main window".into());
    }
    window.state::<DesktopCompanionState>().hide_on_close.store(hide_to_tray, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn update_desktop_companion(
    state: State<'_, DesktopCompanionState>,
    input: DesktopCompanionInput,
) -> Result<(), String> {
    state.show_pet.set_text(menu_text(&input.show_pet)).map_err(|error| error.to_string())?;
    state
        .focus_status
        .set_text(menu_text(&input.focus_status))
        .map_err(|error| error.to_string())?;
    state
        .focus_action
        .set_text(menu_text(&input.focus_action))
        .map_err(|error| error.to_string())?;
    state
        .end_focus
        .set_text(menu_text(&input.end_focus))
        .map_err(|error| error.to_string())?;
    state
        .end_focus
        .set_enabled(input.end_focus_enabled)
        .map_err(|error| error.to_string())?;
    state
        .focus_action
        .set_accelerator(if input.end_focus_enabled {
            None
        } else {
            Some("Ctrl+Shift+Space")
        })
        .map_err(|error| error.to_string())?;
    state
        .end_focus
        .set_accelerator(if input.end_focus_enabled {
            Some("Ctrl+Shift+Space")
        } else {
            None
        })
        .map_err(|error| error.to_string())?;
    state
        .break_status
        .set_text(menu_text(&input.break_status))
        .map_err(|error| error.to_string())?;
    state
        .hydration_status
        .set_text(menu_text(&input.hydration_status))
        .map_err(|error| error.to_string())?;
    state
        .show_app
        .set_text(menu_text(&input.show_app))
        .map_err(|error| error.to_string())?;
    state
        .open_today
        .set_text(menu_text(&input.open_today))
        .map_err(|error| error.to_string())?;
    state
        .open_pause_hydrate
        .set_text(menu_text(&input.open_pause_hydrate))
        .map_err(|error| error.to_string())?;
    state
        .open_settings
        .set_text(menu_text(&input.open_settings))
        .map_err(|error| error.to_string())?;
    state
        .quit
        .set_text(menu_text(&input.quit))
        .map_err(|error| error.to_string())?;
    state
        .tray
        .set_tooltip(Some(display_text(&input.tooltip)))
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::menu_text;

    #[test]
    fn sanitizes_user_text_for_native_menus() {
        assert_eq!(menu_text("R&D\nfocus"), "R&&Dfocus");
    }
}
