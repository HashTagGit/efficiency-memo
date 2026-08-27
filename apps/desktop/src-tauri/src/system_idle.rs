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

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        get_system_idle_seconds, idle_seconds_from_macos, idle_seconds_from_ticks,
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
