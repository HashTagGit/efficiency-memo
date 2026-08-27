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

#[cfg(any(target_os = "windows", test))]
fn idle_seconds_from_ticks(current: u32, last_input: u32) -> u64 {
    u64::from(current.wrapping_sub(last_input)) / 1000
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

    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::{get_system_idle_seconds, idle_seconds_from_ticks};

    #[test]
    fn idle_seconds_handle_the_windows_tick_wrap() {
        assert_eq!(idle_seconds_from_ticks(10_000, 4_000), 6);
        assert_eq!(idle_seconds_from_ticks(999, u32::MAX - 1_000), 2);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_last_input_clock_is_readable() {
        assert!(get_system_idle_seconds().unwrap().is_some());
    }
}
