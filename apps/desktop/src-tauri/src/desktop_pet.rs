use std::{collections::VecDeque, sync::Mutex};

use rusqlite::{Connection, OpenFlags, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{
    async_runtime::channel, ipc::Channel, menu::MenuBuilder, AppHandle, Emitter, LogicalSize,
    Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

#[path = "desktop_pet_motion.rs"]
mod motion;

pub(crate) const LABEL: &str = "desktop-pet";
const PET_SIZE: f64 = 88.0;
const BUBBLE_WIDTH: f64 = 300.0;
const BUBBLE_HEIGHT: f64 = 218.0;
pub(crate) const SHOW_PET: &str = "show-desktop-pet";
const OPEN_PET_ASSISTANT: &str = "open-pet-assistant";
const HIDE_PET: &str = "hide-desktop-pet";
const RESET_PET_POSITION: &str = "reset-desktop-pet-position";
const POSITION_EVENT: &str = "desktop-pet-position";
const SNOOZE_EVENT: &str = "desktop-pet-snooze";

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn ShowWindow(window: *mut std::ffi::c_void, command: i32) -> i32;
    fn SetWindowPos(
        window: *mut std::ffi::c_void,
        insert_after: *mut std::ffi::c_void,
        x: i32,
        y: i32,
        cx: i32,
        cy: i32,
        flags: u32,
    ) -> i32;
}

#[derive(Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum ReminderKind {
    Break,
    Hydration,
    CheckIn,
    DailyReview,
    WeeklyReview,
    Preview,
}

impl ReminderKind {
    fn command(self) -> Option<&'static str> {
        match self {
            Self::Break | Self::Hydration => Some("open-pause-hydrate"),
            Self::CheckIn => Some("open-today"),
            Self::DailyReview => Some("open-daily-review"),
            Self::WeeklyReview => Some("open-weekly-review"),
            Self::Preview => None,
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
pub(crate) struct PetReminder {
    kind: ReminderKind,
    title: String,
    body: String,
}

#[derive(Clone, Serialize)]
struct QueuedReminder {
    id: u32,
    #[serde(flatten)]
    reminder: PetReminder,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PetView {
    current: Option<QueuedReminder>,
    count: usize,
    pet_id: Option<String>,
    snoozing: bool,
    snooze_failed: bool,
    focus: motion::Focus,
    preferences: motion::Preferences,
}

#[derive(Default)]
struct Queue {
    enabled: bool,
    hidden: bool,
    drag_offset: Option<PhysicalPosition<f64>>,
    items: VecDeque<QueuedReminder>,
    next_id: u32,
    view: Option<Channel<PetView>>,
    resting_position: Option<PhysicalPosition<i32>>,
    pet_id: Option<String>,
    snoozing: Option<u32>,
    snooze_failed: bool,
    behavior: motion::Behavior,
}

impl Queue {
    fn push(&mut self, reminder: PetReminder) {
        if self
            .items
            .iter()
            .any(|item| item.reminder.kind == reminder.kind)
        {
            return;
        }
        self.behavior.interrupt(true);
        self.next_id = self.next_id.wrapping_add(1);
        self.items.push_back(QueuedReminder {
            id: self.next_id,
            reminder,
        });
    }

    fn take_current(&mut self, id: u32) -> Option<PetReminder> {
        if self.items.front()?.id != id {
            return None;
        }
        self.snooze_failed = false;
        self.items.pop_front().map(|item| item.reminder)
    }

    fn is_dragging(&self) -> bool {
        self.drag_offset.is_some()
    }

    fn snapshot(&self) -> Option<PetView> {
        if self.is_dragging() {
            return None;
        }
        Some(PetView {
            current: self.items.front().cloned(),
            count: self.items.len(),
            pet_id: self.pet_id.clone(),
            snoozing: self.snoozing.is_some(),
            snooze_failed: self.snooze_failed,
            focus: self.behavior.focus,
            preferences: self.behavior.preferences,
        })
    }

    fn publish(&mut self, window: &WebviewWindow) -> tauri::Result<()> {
        let Some(snapshot) = self.snapshot() else { return Ok(()); };
        if let Some(view) = &self.view {
            if self.enabled && !self.hidden {
                adjust_window(window, &mut self.resting_position, !self.items.is_empty())?;
            }
            view.send(snapshot)?;
        }
        let visible = self.enabled && !self.hidden && self.view.is_some();
        if visible != window.is_visible()? {
            set_visible_without_activation(window, visible)?;
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
pub(crate) struct PetPosition {
    x: i32,
    y: i32,
}

impl From<PhysicalPosition<i32>> for PetPosition {
    fn from(position: PhysicalPosition<i32>) -> Self {
        Self { x: position.x, y: position.y }
    }
}

fn pet_size(monitor: &Monitor) -> PhysicalSize<u32> {
    let pixels = (PET_SIZE * monitor.scale_factor()).round() as u32;
    PhysicalSize::new(pixels, pixels)
}

fn clamp_to_work_area(
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    monitor: &Monitor,
) -> PhysicalPosition<i32> {
    let work = monitor.work_area();
    PhysicalPosition::new(
        position.x.clamp(work.position.x, work.position.x + work.size.width.saturating_sub(size.width) as i32),
        position.y.clamp(work.position.y, work.position.y + work.size.height.saturating_sub(size.height) as i32),
    )
}

#[derive(Default)]
pub(crate) struct PetQueue(Mutex<Queue>);

fn set_visible_without_activation(window: &WebviewWindow, visible: bool) -> tauri::Result<()> {
    #[cfg(target_os = "windows")]
    {
        const SW_HIDE: i32 = 0;
        const SW_SHOWNOACTIVATE: i32 = 4;
        let command = if visible { SW_SHOWNOACTIVATE } else { SW_HIDE };
        // Tauri's show() can activate an existing Windows window, even if it was built unfocused.
        unsafe { ShowWindow(window.hwnd()?.0, command) };
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    if visible {
        window.show()
    } else {
        window.hide()
    }
}

pub(crate) fn destroy_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.destroy();
    }
}

fn position_on_work_area(window: &WebviewWindow) -> tauri::Result<()> {
    let cursor = window.cursor_position()?;
    let monitor = window
        .monitor_from_point(cursor.x, cursor.y)?
        .or(window.primary_monitor()?);
    if let Some(monitor) = monitor {
        let work = monitor.work_area();
        let scale = monitor.scale_factor();
        let margin = (16.0 * scale).round() as i32;
        // Move to the target monitor before measuring its DPI-adjusted window size.
        window.set_position(work.position)?;
        let size = window.outer_size()?;
        let x = work.position.x + (work.size.width as i32 - size.width as i32 - margin).max(0);
        let y = work.position.y + (work.size.height as i32 - size.height as i32 - margin).max(0);
        window.set_position(PhysicalPosition::new(x, y))?;
    }
    Ok(())
}

fn adjust_window(
    window: &WebviewWindow,
    resting_position: &mut Option<PhysicalPosition<i32>>,
    expanded: bool,
) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let pixels = |logical: f64| (logical * scale).round() as u32;
    let rest = PhysicalSize::new(pixels(PET_SIZE), pixels(PET_SIZE));
    match (expanded, *resting_position) {
        (true, None) => {
            let position = window.outer_position()?;
            let resting_size = window.outer_size()?;
            let size = PhysicalSize::new(pixels(BUBBLE_WIDTH), pixels(BUBBLE_HEIGHT));
            let origin = PhysicalPosition::new(
                position.x + resting_size.width as i32 - size.width as i32,
                position.y + resting_size.height as i32 - size.height as i32,
            );
            let center_x = f64::from(position.x) + f64::from(resting_size.width) / 2.0;
            let center_y = f64::from(position.y) + f64::from(resting_size.height) / 2.0;
            let origin = window.monitor_from_point(center_x, center_y)?
                .map_or(origin, |monitor| clamp_to_work_area(origin, size, &monitor));
            set_pet_bounds(window, origin, size)?;
            *resting_position = Some(position);
        }
        (false, Some(position)) => {
            set_pet_bounds(window, position, rest)?;
            *resting_position = None;
        }
        _ => {}
    }
    Ok(())
}

fn set_pet_bounds(
    window: &WebviewWindow,
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
) -> tauri::Result<()> {
    #[cfg(target_os = "windows")]
    {
        const SWP_NOZORDER: u32 = 0x0004;
        const SWP_NOACTIVATE: u32 = 0x0010;
        // Change both bounds together so the avatar stays anchored as the bubble opens.
        let result = unsafe {
            SetWindowPos(
                window.hwnd()?.0,
                std::ptr::null_mut(),
                position.x,
                position.y,
                size.width as i32,
                size.height as i32,
                SWP_NOZORDER | SWP_NOACTIVATE,
            )
        };
        if result == 0 {
            return Err(std::io::Error::last_os_error().into());
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        window.set_size(size)?;
        window.set_position(position)
    }
}

async fn update_queue<T: Send + 'static>(
    app: AppHandle,
    update: impl FnOnce(&AppHandle, &mut Queue) -> tauri::Result<T> + Send + 'static,
) -> Result<T, String> {
    // Serialize window creation, queue changes and visibility on the native UI thread.
    let (sender, mut receiver) = channel(1);
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let state = handle.state::<PetQueue>();
        let result = update(&handle, &mut state.0.lock().expect("desktop pet queue poisoned"));
        let _ = sender.try_send(result);
    })
    .map_err(|error| error.to_string())?;
    receiver
        .recv()
        .await
        .ok_or_else(|| "Desktop pet window unavailable".to_owned())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn set_desktop_pet_enabled(
    window: WebviewWindow,
    enabled: bool,
    position: Option<PetPosition>,
    preferences: Option<motion::Preferences>,
) -> Result<(), String> {
    if !cfg!(target_os = "windows") || window.label() != "main" {
        return Err("Desktop pet reminders are only available from the Windows main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        queue.enabled = enabled;
        queue.hidden = false;
        queue.behavior.interrupt(true);
        if let Some(preferences) = preferences {
            queue.behavior.preferences = preferences;
        }
        crate::desktop_companion::set_show_pet_enabled(app, enabled)?;
        if !enabled {
            queue.items.clear();
            queue.snoozing = None;
            queue.snooze_failed = false;
            queue.drag_offset = None;
            if let Some(window) = app.get_webview_window(LABEL) {
                set_visible_without_activation(&window, false)?;
            }
            return Ok(());
        }
        if let Some(window) = app.get_webview_window(LABEL) {
            return queue.publish(&window);
        }
        queue.view = None;
        queue.resting_position = None;
        let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::default())
            .title("EfficiencyMemo Pet")
            .inner_size(PET_SIZE, PET_SIZE)
            .min_inner_size(PET_SIZE, PET_SIZE)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .resizable(false)
            .closable(false)
            .skip_taskbar(true)
            .always_on_top(true)
            .focused(false)
            .visible(false)
            .build()?;
        window.set_size(LogicalSize::new(PET_SIZE, PET_SIZE))?;
        if let Some(position) = position {
            if let Some(monitor) = window.monitor_from_point(f64::from(position.x), f64::from(position.y))? {
                let size = pet_size(&monitor);
                let origin = clamp_to_work_area(PhysicalPosition::new(position.x, position.y), size, &monitor);
                return set_pet_bounds(&window, origin, size);
            }
        }
        position_on_work_area(&window)
    })
    .await
}

#[tauri::command]
pub(crate) async fn set_desktop_pet_behavior(
    window: WebviewWindow,
    preferences: motion::Preferences,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Expected the main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if queue.behavior.preferences != preferences {
            queue.behavior.interrupt(false);
            queue.behavior.preferences = preferences;
            if let Some(window) = app.get_webview_window(LABEL) {
                queue.publish(&window)?;
            }
        }
        Ok(())
    }).await
}

#[tauri::command]
pub(crate) async fn set_desktop_pet_focus(window: WebviewWindow, focus: motion::Focus) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Expected the main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if queue.behavior.focus != focus {
            queue.behavior.interrupt(false);
            queue.behavior.focus = focus;
            if let Some(window) = app.get_webview_window(LABEL) {
                queue.publish(&window)?;
            }
        }
        Ok(())
    }).await
}

#[tauri::command]
pub(crate) async fn sample_desktop_pet_behavior(
    window: WebviewWindow,
    input: motion::SampleInput,
) -> Result<motion::Sample, String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |_, queue| {
        if !queue.enabled || queue.hidden || queue.is_dragging() || !queue.items.is_empty() {
            queue.behavior.interrupt(false);
            return Ok(motion::Sample::default());
        }
        queue.behavior.sample(&window, input)
    }).await
}

#[tauri::command]
pub(crate) async fn interrupt_desktop_pet_motion(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), |_, queue| {
        queue.behavior.interrupt(true);
        Ok(())
    }).await
}

#[tauri::command]
pub(crate) async fn select_desktop_pet(window: WebviewWindow, pet_id: String) -> Result<(), String> {
    if window.label() != "main" || pet_id.is_empty() || pet_id.chars().count() > 100 {
        return Err("Invalid desktop pet selection".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        queue.behavior.interrupt(false);
        queue.pet_id = Some(pet_id);
        if let Some(window) = app.get_webview_window(LABEL) {
            queue.publish(&window)?;
        }
        Ok(())
    })
    .await
}

#[derive(Serialize)]
pub(crate) struct PetSprite {
    manifest: String,
    atlas: String,
}

#[tauri::command]
pub(crate) async fn load_desktop_pet_sprite(
    window: WebviewWindow,
    pet_id: String,
) -> Result<Option<PetSprite>, String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    let app = window.app_handle();
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let db = Connection::open_with_flags(
            path.join(crate::data_control::DB_FILENAME),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )?;
        db.query_row(
            "SELECT manifest, atlas FROM desktop_pet_packs WHERE id = ?1",
            [pet_id],
            |row| {
                Ok(PetSprite {
                    manifest: row.get(0)?,
                    atlas: row.get(1)?,
                })
            },
        )
        .optional()
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error: rusqlite::Error| error.to_string())
}

#[tauri::command]
pub(crate) async fn show_desktop_pet_reminder(
    window: WebviewWindow,
    input: PetReminder,
) -> Result<(), String> {
    if !cfg!(target_os = "windows") || window.label() != "main" {
        return Err("Desktop pet reminders are only available from the Windows main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        let window = app
            .get_webview_window(LABEL)
            .filter(|_| queue.enabled && !queue.hidden)
            .ok_or_else(|| std::io::Error::other("Desktop pet is unavailable"))?;
        queue.push(input);
        queue.publish(&window)
    })
    .await
}

#[tauri::command]
pub(crate) async fn desktop_pet_ready(
    window: WebviewWindow,
    on_change: Channel<PetView>,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |_, queue| {
        queue.view = Some(on_change);
        queue.drag_offset = None;
        queue.behavior.interrupt(false);
        queue.publish(&window)
    })
    .await
}

#[tauri::command]
pub(crate) async fn respond_to_desktop_pet_reminder(
    window: WebviewWindow,
    id: u32,
    open: bool,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if queue.snoozing == Some(id) {
            return Ok(());
        }
        if let Some(reminder) = queue.take_current(id) {
            if open {
                if let Some(command) = reminder.kind.command() {
                    crate::desktop_companion::emit_command(app, command, true);
                }
            }
            queue.publish(&window)?;
        }
        Ok(())
    })
    .await
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum DragPhase {
    Start,
    Move,
    End,
    Cancel,
}

#[derive(Deserialize)]
pub(crate) struct DragAnchor {
    x: f64,
    y: f64,
}

#[tauri::command]
pub(crate) async fn drag_desktop_pet(
    window: WebviewWindow,
    phase: DragPhase,
    anchor: Option<DragAnchor>,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if matches!(phase, DragPhase::Start) {
            if !queue.enabled || queue.hidden || !queue.items.is_empty() {
                return Err(std::io::Error::other("Desktop pet cannot start dragging").into());
            }
            let anchor = anchor.filter(|value| (0.0..=1.0).contains(&value.x) && (0.0..=1.0).contains(&value.y))
                .ok_or_else(|| std::io::Error::other("Invalid desktop pet drag anchor"))?;
            queue.behavior.interrupt(true);
            queue.drag_offset = Some(PhysicalPosition::new(anchor.x, anchor.y));
            return Ok(());
        }
        let Some(offset) = queue.drag_offset else { return Ok(()); };
        let moving = matches!(phase, DragPhase::Move);
        if !moving {
            queue.drag_offset = None;
        }
        let motion_result = if matches!(phase, DragPhase::Cancel) {
            Ok(())
        } else {
            move_pet_to_cursor(&window, offset)
        };
        if !moving {
            // Publish even if the final move failed so a queued reminder can still be shown.
            let position = window.outer_position().map(PetPosition::from);
            queue.publish(&window)?;
            app.emit(POSITION_EVENT, Some(position?))?;
        }
        motion_result
    }).await
}

fn move_pet_to_cursor(window: &WebviewWindow, offset: PhysicalPosition<f64>) -> tauri::Result<()> {
    let cursor = window.cursor_position()?;
    if let Some(monitor) = window.monitor_from_point(cursor.x, cursor.y)? {
        let size = pet_size(&monitor);
        let position = PhysicalPosition::new(
            (cursor.x - offset.x * f64::from(size.width)).round() as i32,
            (cursor.y - offset.y * f64::from(size.height)).round() as i32,
        );
        set_pet_bounds(window, clamp_to_work_area(position, size, &monitor), size)?;
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PetMenuLabels {
    assistant: String,
    hide: String,
    reset_position: String,
}

#[tauri::command]
pub(crate) async fn open_desktop_pet_menu(window: WebviewWindow, labels: PetMenuLabels) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    let menu = MenuBuilder::new(&window)
        .text(OPEN_PET_ASSISTANT, crate::desktop_companion::menu_text(&labels.assistant))
        .text(HIDE_PET, crate::desktop_companion::menu_text(&labels.hide))
        .text(RESET_PET_POSITION, crate::desktop_companion::menu_text(&labels.reset_position))
        .build().map_err(|error| error.to_string())?;
    window.popup_menu(&menu).map_err(|error| error.to_string())
}

pub(crate) fn handle_menu_event(app: &AppHandle, id: &str) {
    if id == OPEN_PET_ASSISTANT {
        crate::desktop_companion::emit_command(app, OPEN_PET_ASSISTANT, true);
        return;
    }
    if !matches!(id, SHOW_PET | HIDE_PET | RESET_PET_POSITION) {
        return;
    }
    let app = app.clone();
    let id = id.to_owned();
    tauri::async_runtime::spawn(async move {
        let result = update_queue(app, move |app, queue| {
            let Some(window) = app.get_webview_window(LABEL) else { return Ok(()); };
            if !queue.enabled || queue.is_dragging() {
                return Ok(());
            }
            queue.behavior.interrupt(true);
            match id.as_str() {
                SHOW_PET => queue.hidden = false,
                HIDE_PET => queue.hidden = true,
                RESET_PET_POSITION => {
                    adjust_window(&window, &mut queue.resting_position, false)?;
                    position_on_work_area(&window)?;
                    app.emit(POSITION_EVENT, Option::<PetPosition>::None)?;
                }
                _ => unreachable!(),
            }
            queue.publish(&window)
        }).await;
        if let Err(error) = result {
            eprintln!("Desktop pet menu action failed: {error}");
        }
    });
}

#[derive(Clone, Serialize)]
struct SnoozeRequest {
    id: u32,
    kind: ReminderKind,
}

#[tauri::command]
pub(crate) async fn snooze_desktop_pet_reminder(window: WebviewWindow, id: u32) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        let Some(item) = queue.items.front().filter(|item| item.id == id) else { return Ok(()); };
        let kind = item.reminder.kind;
        if queue.snoozing.is_some() || !matches!(kind, ReminderKind::Break | ReminderKind::Hydration) {
            return Ok(());
        }
        queue.snoozing = Some(id);
        queue.snooze_failed = false;
        if let Err(error) = app.emit(SNOOZE_EVENT, SnoozeRequest { id, kind }) {
            queue.snoozing = None;
            return Err(error);
        }
        queue.publish(&window)
    }).await
}

#[tauri::command]
pub(crate) async fn finish_desktop_pet_snooze(window: WebviewWindow, id: u32, saved: bool) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Expected the main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if queue.snoozing == Some(id) {
            queue.snoozing = None;
            queue.snooze_failed = !saved;
            if saved {
                queue.take_current(id);
            }
            if let Some(window) = app.get_webview_window(LABEL) {
                queue.publish(&window)?;
            }
        }
        Ok(())
    }).await
}

#[cfg(test)]
mod tests {
    use super::{PetReminder, Queue, ReminderKind};
    use tauri::PhysicalPosition;

    #[test]
    fn defers_the_reminder_view_while_dragging_without_consuming_the_queue() {
        let mut queue = Queue {
            drag_offset: Some(PhysicalPosition::new(0.5, 0.5)),
            ..Queue::default()
        };
        for (kind, title) in [(ReminderKind::Break, "Move"), (ReminderKind::Hydration, "Water")] {
            queue.push(PetReminder { kind, title: title.into(), body: String::new() });
        }
        assert!(queue.snapshot().is_none());

        queue.drag_offset = None;
        let view = queue.snapshot().unwrap();
        assert_eq!(view.count, 2);
        assert_eq!(view.current.unwrap().reminder.title, "Move");
    }

    #[test]
    fn keeps_distinct_reminders_in_order_and_ignores_stale_actions() {
        let mut queue = Queue::default();
        let hydration = PetReminder {
            kind: ReminderKind::Hydration,
            title: "Water".into(),
            body: String::new(),
        };
        let movement = PetReminder {
            kind: ReminderKind::Break,
            title: "Move".into(),
            body: String::new(),
        };
        queue.push(hydration.clone());
        let first = queue.items.front().unwrap().id;
        queue.push(movement);
        queue.push(hydration.clone());
        assert_eq!(queue.items.len(), 2);
        assert_eq!(queue.take_current(first).unwrap().title, "Water");
        queue.push(hydration);
        assert!(queue.take_current(first).is_none());
        assert_eq!(queue.items.front().unwrap().reminder.title, "Move");
        assert_eq!(queue.items.back().unwrap().reminder.title, "Water");
    }
}
