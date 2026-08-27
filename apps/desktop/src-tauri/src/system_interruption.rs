use serde::Serialize;

#[cfg(target_os = "windows")]
#[link(name = "shell32")]
extern "system" {
    fn SHQueryUserNotificationState(state: *mut i32) -> i32;
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemInterruptionState {
    notifications_allowed: bool,
    reason: &'static str,
}

#[cfg(any(target_os = "windows", test))]
fn map_notification_state(state: i32) -> SystemInterruptionState {
    let (notifications_allowed, reason) = match state {
        1 => (false, "not-present"),
        2 => (false, "busy"),
        3 => (false, "fullscreen"),
        4 => (false, "presentation"),
        5 => (true, "available"),
        6 => (false, "quiet-time"),
        7 => (false, "app"),
        _ => (false, "unknown"),
    };
    SystemInterruptionState {
        notifications_allowed,
        reason,
    }
}

#[tauri::command]
pub(crate) fn get_system_interruption_state() -> Result<Option<SystemInterruptionState>, String> {
    #[cfg(target_os = "windows")]
    {
        let mut state = 0;
        let result = unsafe { SHQueryUserNotificationState(&mut state) };
        if result != 0 {
            return Ok(Some(map_notification_state(0)));
        }
        return Ok(Some(map_notification_state(state)));
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(Some(SystemInterruptionState {
            notifications_allowed: true,
            reason: "unsupported",
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::{get_system_interruption_state, map_notification_state};

    #[test]
    fn only_the_official_available_state_allows_notifications() {
        for state in [1, 2, 3, 4, 6, 7, 99] {
            assert!(!map_notification_state(state).notifications_allowed);
        }
        assert!(map_notification_state(5).notifications_allowed);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_notification_state_is_readable() {
        let state = get_system_interruption_state().unwrap().unwrap();
        assert_ne!(state.reason, "unknown");
    }
}
