use std::{
    collections::VecDeque,
    sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex},
    time::{Duration, Instant},
};

use rusqlite::{Connection, OpenFlags, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{
    async_runtime::channel, ipc::Channel, menu::MenuBuilder, AppHandle, Emitter, LogicalSize,
    Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

#[path = "desktop_pet_motion.rs"]
mod motion;
#[path = "desktop_pet_input.rs"]
mod input;

pub(crate) const LABEL: &str = "desktop-pet";
const PET_SIZE: f64 = 88.0;
const BUBBLE_WIDTH: f64 = 300.0;
const BUBBLE_HEIGHT: f64 = 218.0;
const MINI_EDGE_DISTANCE: f64 = 12.0;
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
    #[serde(skip)]
    delivery_key: Option<String>,
    #[serde(flatten)]
    reminder: PetReminder,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum DockSide {
    Left,
    Right,
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
    mini: Option<DockSide>,
    dock: Option<DockSide>,
}

#[derive(Default)]
struct Queue {
    enabled: bool,
    hidden: bool,
    drag_offset: Option<PhysicalPosition<f64>>,
    items: VecDeque<QueuedReminder>,
    next_id: u32,
    displayed: VecDeque<String>,
    view: Option<Channel<PetView>>,
    resting_position: Option<PhysicalPosition<i32>>,
    pet_id: Option<String>,
    snoozing: Option<u32>,
    snooze_failed: bool,
    behavior: motion::Behavior,
    dock: Option<DockSide>,
    mini: Option<DockSide>,
    peek_until: Option<Instant>,
    hit_regions: Option<input::HitRegions>,
    #[cfg(not(target_os = "windows"))]
    ignoring_cursor: bool,
}

impl Queue {
    #[cfg(test)]
    fn push(&mut self, reminder: PetReminder) {
        self.enqueue(reminder, None);
    }

    fn enqueue(&mut self, reminder: PetReminder, delivery_key: Option<String>) {
        if self
            .items
            .iter()
            .any(|item| item.reminder.kind == reminder.kind && item.delivery_key == delivery_key)
        {
            return;
        }
        self.behavior.interrupt(true);
        self.next_id = self.next_id.wrapping_add(1);
        self.items.push_back(QueuedReminder {
            id: self.next_id,
            delivery_key,
            reminder,
        });
    }

    fn mark_displayed(&mut self, id: u32) -> Option<String> {
        let key = self.items.front().filter(|item| item.id == id)?.delivery_key.as_ref()?;
        if self.displayed.contains(key) {
            return None;
        }
        let key = key.clone();
        if self.displayed.len() == 16 {
            self.displayed.pop_front();
        }
        self.displayed.push_back(key.clone());
        Some(key)
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
            mini: self.mini,
            dock: self.dock,
        })
    }

    fn publish(&mut self, window: &WebviewWindow) -> tauri::Result<()> {
        if self.is_dragging() { return Ok(()); }
        if self.enabled && !self.hidden && self.view.is_some() {
            self.reconcile_geometry(window)?;
        }
        let Some(snapshot) = self.snapshot() else { return Ok(()); };
        if let Some(view) = &self.view {
            view.send(snapshot)?;
        }
        let visible = self.enabled && !self.hidden && self.view.is_some();
        if visible != window.is_visible()? || (visible && window.is_minimized()?) {
            set_visible_without_activation(window, visible)?;
        }
        Ok(())
    }

    fn reconcile_geometry(&mut self, window: &WebviewWindow) -> tauri::Result<bool> {
        let expanded = !self.items.is_empty();
        let mini = self.behavior.preferences.mini_enabled && !expanded && self.behavior.focus == motion::Focus::Idle
            && self.peek_until.map_or(true, |until| Instant::now() >= until);
        if !self.behavior.preferences.mini_enabled { self.dock = None; }
        if let Some(regions) = &self.hit_regions {
            // A live drag/menu/press owns the current window bounds until the input ends.
            if regions.held && !expanded { return Ok(false); }
        }
        adjust_window(window, &mut self.resting_position, &mut self.dock, expanded, mini)?;
        let next = if mini { self.dock } else { None };
        let changed = next != self.mini;
        if changed {
            self.behavior.interrupt(false);
        }
        self.mini = next;
        Ok(changed)
    }

    fn reconcile_pointer(&mut self, window: &WebviewWindow) -> tauri::Result<()> {
        let following_input = match &self.hit_regions {
            Some(regions) if !self.is_dragging() => {
                let cursor = window.cursor_position()?;
                let client = window.inner_position()?;
                let dpi = window.scale_factor()?;
                regions.contains((cursor.x - f64::from(client.x)) / dpi, (cursor.y - f64::from(client.y)) / dpi)
            }
            _ => true,
        };
        let ignore = !following_input;
        #[cfg(target_os = "windows")]
        input::windows::set_cursor_passthrough(window, ignore)?;
        #[cfg(not(target_os = "windows"))]
        if ignore != self.ignoring_cursor {
            window.set_ignore_cursor_events(ignore)?;
            self.ignoring_cursor = ignore;
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
    dock: &mut Option<DockSide>,
    expanded: bool,
    mini: bool,
) -> tauri::Result<()> {
    let current = window.outer_position()?;
    let actual_size = window.outer_size()?;
    let original = resting_position.unwrap_or(current);
    let Some(monitor) = window.monitor_from_point(f64::from(original.x), f64::from(original.y))?
        .or(window.primary_monitor()?) else { return Ok(()); };
    let scale = monitor.scale_factor();
    let rest = pet_size(&monitor);
    let resting = clamp_to_work_area(original, rest, &monitor);
    let work = monitor.work_area();
    let left = work.position.x;
    let right = left.saturating_add(work.size.width as i32);
    if mini || dock.is_some() {
        *dock = dock_side(original.x, left, right, rest.width, scale);
    }
    let (origin, size) = pet_layout(resting, left, right, *dock, expanded, scale);
    let origin = clamp_to_work_area(origin, size, &monitor);
    if (current, actual_size) != (origin, size) {
        set_pet_bounds(window, origin, size)?;
    }
    *resting_position = (expanded || dock.is_some()).then_some(resting);
    Ok(())
}

fn dock_side(x: i32, left: i32, right: i32, width: u32, scale: f64) -> Option<DockSide> {
    let left_gap = i64::from(x) - i64::from(left);
    let right_gap = i64::from(right) - i64::from(x) - i64::from(width);
    let tolerance = (MINI_EDGE_DISTANCE * scale).round() as i64;
    if left_gap < 0 || right_gap < 0 || left_gap.min(right_gap) > tolerance {
        return None;
    }
    Some(if left_gap <= right_gap { DockSide::Left } else { DockSide::Right })
}

fn pet_layout(resting: PhysicalPosition<i32>, left: i32, right: i32, dock: Option<DockSide>, expanded: bool, scale: f64)
    -> (PhysicalPosition<i32>, PhysicalSize<u32>) {
    let rest = (PET_SIZE * scale).round() as u32;
    if let Some(side) = dock {
        // Peeking and fully showing the pet share these bounds. The WebView clips the sprite.
        let docked = PhysicalPosition::new(if side == DockSide::Left { left } else { right - rest as i32 }, resting.y);
        let (mut origin, size) = reminder_bounds(docked, expanded, scale);
        if side == DockSide::Left { origin.x = left; }
        return (origin, size);
    }
    reminder_bounds(resting, expanded, scale)
}

fn reminder_bounds(resting: PhysicalPosition<i32>, expanded: bool, scale: f64) -> (PhysicalPosition<i32>, PhysicalSize<u32>) {
    let pixels = |logical: f64| (logical * scale).round() as u32;
    let rest = pixels(PET_SIZE);
    if !expanded {
        return (resting, PhysicalSize::new(rest, rest));
    }
    let size = PhysicalSize::new(pixels(BUBBLE_WIDTH), pixels(BUBBLE_HEIGHT));
    (PhysicalPosition::new(resting.x + rest as i32 - size.width as i32, resting.y + rest as i32 - size.height as i32), size)
}

pub(crate) fn watch_geometry(app: AppHandle) {
    if !cfg!(target_os = "windows") { return; }
    std::thread::spawn(move || {
        let pending = Arc::new(AtomicBool::new(false));
        let mut next_geometry = Instant::now();
        loop {
            std::thread::sleep(Duration::from_millis(30));
            let state = app.state::<PetQueue>();
            let Ok(queue) = state.0.try_lock() else { continue; };
            if !queue.enabled || queue.hidden || queue.view.is_none() { continue; }
            let now = Instant::now();
            let geometry_due = now >= next_geometry;
            if !geometry_due && queue.hit_regions.is_none() { continue; }
            drop(queue);
            if pending.swap(true, Ordering::AcqRel) { continue; }
            if geometry_due { next_geometry = now + Duration::from_millis(500); }
            let handle = app.clone();
            let in_flight = Arc::clone(&pending);
            if app.run_on_main_thread(move || {
                if let Some(window) = handle.get_webview_window(LABEL) {
                    let state = handle.state::<PetQueue>();
                    let mut queue = state.0.lock().expect("desktop pet queue poisoned");
                    if queue.enabled && !queue.hidden && queue.view.is_some() {
                        if geometry_due && !queue.is_dragging() {
                            let changed = queue.reconcile_geometry(&window).unwrap_or(false);
                            if changed || window.is_visible().is_ok_and(|visible| !visible) || window.is_minimized().unwrap_or(false) {
                                let _ = queue.publish(&window);
                            }
                        }
                        let _ = queue.reconcile_pointer(&window);
                    }
                }
                in_flight.store(false, Ordering::Release);
            }).is_err() { break; }
        }
    });
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
    recover: Option<bool>,
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
            if recover == Some(true) {
                queue.drag_offset = None;
                queue.publish(&window)?;
                return window.reload();
            }
            return queue.publish(&window);
        }
        queue.view = None;
        queue.resting_position = None;
        queue.hit_regions = None;
        #[cfg(not(target_os = "windows"))]
        { queue.ignoring_cursor = false; }
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
        #[cfg(target_os = "windows")]
        input::windows::set_cursor_passthrough(&window, false)?;
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
        if let Some(side) = queue.mini {
            return queue.behavior.sample_peek(&window, input, side);
        }
        if queue.dock.is_some() {
            return Ok(motion::Sample::default());
        }
        queue.behavior.sample(&window, input)
    }).await
}

#[tauri::command]
pub(crate) async fn peek_desktop_pet(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL { return Err("Expected the desktop pet window".into()); }
    update_queue(window.app_handle().clone(), move |_, queue| {
        queue.peek_until = Some(Instant::now() + Duration::from_secs(6));
        queue.behavior.interrupt(true);
        queue.publish(&window)
    }).await
}

#[tauri::command]
pub(crate) async fn update_desktop_pet_hit_regions(window: WebviewWindow, regions: input::HitRegions) -> Result<(), String> {
    if window.label() != LABEL || !regions.valid() { return Err("Invalid desktop pet hit regions".into()); }
    update_queue(window.app_handle().clone(), move |_, queue| {
        queue.hit_regions = Some(regions);
        queue.reconcile_pointer(&window)
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
    if window.label() != LABEL && window.label() != "main" {
        return Err("Expected the main or desktop pet window".into());
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
    delivery_key: Option<String>,
) -> Result<bool, String> {
    if !cfg!(target_os = "windows") || window.label() != "main" {
        return Err("Desktop pet reminders are only available from the Windows main window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if delivery_key.as_ref().is_some_and(|key| queue.displayed.contains(key)) {
            return Ok(true);
        }
        let window = app
            .get_webview_window(LABEL)
            .filter(|_| queue.enabled && !queue.hidden)
            .ok_or_else(|| std::io::Error::other("Desktop pet is unavailable"))?;
        queue.enqueue(input, delivery_key);
        queue.publish(&window)?;
        Ok(false)
    })
    .await
}

#[tauri::command]
pub(crate) async fn confirm_desktop_pet_reminder_shown(window: WebviewWindow, id: u32) -> Result<bool, String> {
    if window.label() != LABEL {
        return Err("Expected the desktop pet window".into());
    }
    update_queue(window.app_handle().clone(), move |app, queue| {
        if queue.enabled && !queue.hidden && !queue.is_dragging() && window.is_visible()? && !window.is_minimized()? {
            if let Some(key) = queue.mark_displayed(id) {
                app.emit("desktop-pet-reminder-shown", key)?;
            }
            return Ok(true);
        }
        Ok(false)
    }).await
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
        queue.hit_regions = None;
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
            queue.resting_position = None;
            queue.dock = None;
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
                    queue.dock = None;
                    queue.resting_position = None;
                    window.set_size(LogicalSize::new(PET_SIZE, PET_SIZE))?;
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
    use super::{dock_side, pet_layout, reminder_bounds, DockSide, PetReminder, Queue, ReminderKind};
    use tauri::{PhysicalPosition, PhysicalSize};

    #[test]
    fn mini_only_docks_near_a_horizontal_edge() {
        assert_eq!(dock_side(500, 0, 1000, 88, 1.0), None);
        assert_eq!(dock_side(12, 0, 1000, 88, 1.0), Some(DockSide::Left));
        assert_eq!(dock_side(900, 0, 1000, 88, 1.0), Some(DockSide::Right));
        assert_eq!(dock_side(13, 0, 1000, 88, 1.0), None);
        assert_eq!(dock_side(899, 0, 1000, 88, 1.0), None);
        assert_eq!(dock_side(-1, 0, 1000, 88, 1.0), None);
        assert_eq!(dock_side(-1582, -1600, 0, 132, 1.5), Some(DockSide::Left));
        assert_eq!(dock_side(-151, -1600, 0, 132, 1.5), None);
    }

    #[test]
    fn docked_geometry_keeps_the_full_viewport_anchored_to_either_edge() {
        let rest = PhysicalPosition::new(500, 400);
        let size = PhysicalSize::new(88, 88);
        assert_eq!(pet_layout(rest, 0, 1000, Some(DockSide::Left), false, 1.0), (PhysicalPosition::new(0, 400), size));
        assert_eq!(pet_layout(rest, 0, 1000, Some(DockSide::Right), false, 1.0), (PhysicalPosition::new(912, 400), size));
        let (alert, expanded) = pet_layout(rest, 0, 1000, Some(DockSide::Right), true, 1.0);
        assert_eq!(alert, PhysicalPosition::new(700, 270));
        assert_eq!(expanded, PhysicalSize::new(300, 218));
        assert_eq!(pet_layout(rest, 0, 1000, Some(DockSide::Left), true, 1.0),
            (PhysicalPosition::new(0, 270), expanded));
        let (undocked, _) = pet_layout(rest, 0, 1000, None, false, 1.0);
        assert_eq!(undocked, rest);
    }

    #[test]
    fn expanded_geometry_is_recalculated_at_the_current_dpi_from_the_same_anchor() {
        let rest = PhysicalPosition::new(500, 400);
        let (_, old_size) = reminder_bounds(rest, true, 1.0);
        let (origin, size) = reminder_bounds(rest, true, 1.5);
        assert_ne!(old_size, size);
        assert_eq!(size, PhysicalSize::new(450, 327));
        assert_eq!(origin, PhysicalPosition::new(182, 205));
    }

    #[test]
    fn queued_reviews_keep_their_receipt_after_the_displayed_bubble_is_closed() {
        let mut queue = Queue::default();
        let key = "review:d:2026-11-21".to_owned();
        let review = PetReminder { kind: ReminderKind::DailyReview, title: "Review".into(), body: String::new() };
        queue.enqueue(review.clone(), Some(key.clone()));
        queue.enqueue(review, Some(key.clone()));
        assert_eq!(queue.items.len(), 1);
        let id = queue.items[0].id;
        assert!(queue.displayed.is_empty());
        assert_eq!(queue.mark_displayed(id + 1), None);
        assert_eq!(queue.mark_displayed(id), Some(key.clone()));
        queue.take_current(id);
        assert!(queue.displayed.contains(&key));
    }

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
