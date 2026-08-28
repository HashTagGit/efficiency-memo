#[cfg(target_os = "windows")]
#[repr(C)]
struct LastInputInfo {
    size: u32,
    tick: u32,
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn GetLastInputInfo(info: *mut LastInputInfo) -> i32;
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn GetTickCount() -> u32;
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: i32, event_type: u32) -> f64;
}

#[cfg(any(target_os = "windows", test))]
fn idle_seconds_from_ticks(current: u32, last_input: u32) -> u64 {
    u64::from(current.wrapping_sub(last_input)) / 1000
}

#[cfg(any(target_os = "macos", test))]
fn idle_seconds_from_macos(value: f64) -> Option<u64> {
    (value.is_finite() && value >= 0.0).then(|| value.floor() as u64)
}

#[cfg(any(target_os = "linux", test))]
fn idle_seconds_from_millis(value: u64) -> u64 {
    value / 1000
}

#[cfg(any(target_os = "linux", test))]
fn is_wayland_session(wayland_display: Option<&str>, session_type: Option<&str>) -> bool {
    wayland_display.is_some_and(|value| !value.is_empty())
        || session_type.is_some_and(|value| value.eq_ignore_ascii_case("wayland"))
}

#[cfg(target_os = "linux")]
fn mutter_idle_seconds() -> Option<u64> {
    use dbus::blocking::Connection;
    use std::time::Duration;

    let connection = Connection::new_session().ok()?;
    let proxy = connection.with_proxy(
        "org.gnome.Mutter.IdleMonitor",
        "/org/gnome/Mutter/IdleMonitor/Core",
        Duration::from_millis(300),
    );
    let (milliseconds,): (u64,) = proxy
        .method_call(
            "org.gnome.Mutter.IdleMonitor",
            "GetIdletime",
            (),
        )
        .ok()?;
    Some(idle_seconds_from_millis(milliseconds))
}

#[cfg(target_os = "linux")]
fn x11_idle_seconds() -> Option<u64> {
    use std::ffi::c_void;
    use std::ptr;
    use x11_dl::{xlib, xss};

    std::env::var_os("DISPLAY")?;
    let xlib = xlib::Xlib::open().ok()?;
    let xss = xss::Xss::open().ok()?;
    let display = unsafe { (xlib.XOpenDisplay)(ptr::null()) };
    if display.is_null() {
        return None;
    }

    let result = unsafe {
        let mut event_base = 0;
        let mut error_base = 0;
        if (xss.XScreenSaverQueryExtension)(display, &mut event_base, &mut error_base) == 0 {
            (xlib.XCloseDisplay)(display);
            return None;
        }
        let info = (xss.XScreenSaverAllocInfo)();
        if info.is_null() {
            (xlib.XCloseDisplay)(display);
            return None;
        }
        let root = (xlib.XDefaultRootWindow)(display);
        let queried = (xss.XScreenSaverQueryInfo)(display, root, info) != 0;
        let idle = queried.then(|| idle_seconds_from_millis((*info).idle as u64));
        (xlib.XFree)(info.cast::<c_void>());
        (xlib.XCloseDisplay)(display);
        idle
    };
    result
}

#[cfg(target_os = "linux")]
fn linux_idle_seconds() -> Option<u64> {
    let wayland_display = std::env::var("WAYLAND_DISPLAY").ok();
    let session_type = std::env::var("XDG_SESSION_TYPE").ok();
    if is_wayland_session(wayland_display.as_deref(), session_type.as_deref()) {
        return mutter_idle_seconds();
    }
    x11_idle_seconds().or_else(mutter_idle_seconds)
}

#[tauri::command]
pub(crate) fn get_system_idle_seconds() -> Result<Option<u64>, String> {
    #[cfg(target_os = "windows")]
    {
        let mut info = LastInputInfo {
            size: std::mem::size_of::<LastInputInfo>() as u32,
            tick: 0,
        };
        let success = unsafe { GetLastInputInfo(&mut info) };
        if success == 0 {
            return Err("Failed to read the Windows last-input clock.".to_string());
        }
        let current = unsafe { GetTickCount() };
        return Ok(Some(idle_seconds_from_ticks(current, info.tick)));
    }

    #[cfg(target_os = "macos")]
    {
        const COMBINED_SESSION_STATE: i32 = 0;
        const ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;
        let seconds = unsafe {
            CGEventSourceSecondsSinceLastEventType(
                COMBINED_SESSION_STATE,
                ANY_INPUT_EVENT_TYPE,
            )
        };
        return Ok(idle_seconds_from_macos(seconds));
    }

    #[cfg(target_os = "linux")]
    {
        return Ok(linux_idle_seconds());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        get_system_idle_seconds, idle_seconds_from_macos, idle_seconds_from_millis,
        idle_seconds_from_ticks, is_wayland_session,
    };

    #[test]
    fn idle_seconds_handle_the_windows_tick_wrap() {
        assert_eq!(idle_seconds_from_ticks(10_000, 4_000), 6);
        assert_eq!(idle_seconds_from_ticks(999, u32::MAX - 1_000), 2);
    }

    #[test]
    fn macos_idle_seconds_reject_invalid_values_and_round_down() {
        assert_eq!(idle_seconds_from_macos(12.9), Some(12));
        assert_eq!(idle_seconds_from_macos(-1.0), None);
        assert_eq!(idle_seconds_from_macos(f64::NAN), None);
        assert_eq!(idle_seconds_from_macos(f64::INFINITY), None);
    }

    #[test]
    fn linux_idle_helpers_floor_milliseconds_and_detect_wayland() {
        assert_eq!(idle_seconds_from_millis(12_999), 12);
        assert!(is_wayland_session(Some("wayland-0"), Some("x11")));
        assert!(is_wayland_session(None, Some("WAYLAND")));
        assert!(!is_wayland_session(None, Some("x11")));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_last_input_clock_is_readable() {
        assert!(get_system_idle_seconds().unwrap().is_some());
    }
    #[cfg(target_os = "macos")]
    #[test]
    fn macos_last_input_clock_is_readable() {
        assert!(get_system_idle_seconds().unwrap().is_some());
    }
}
