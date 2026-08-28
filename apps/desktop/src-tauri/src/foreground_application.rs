#[cfg(target_os = "windows")]
use std::ffi::c_void;

pub(crate) fn available() -> bool {
    cfg!(target_os = "windows")
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn GetForegroundWindow() -> *mut c_void;
    fn GetWindowThreadProcessId(window: *mut c_void, process_id: *mut u32) -> u32;
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(access: u32, inherit_handle: i32, process_id: u32) -> *mut c_void;
    fn QueryFullProcessImageNameW(
        process: *mut c_void,
        flags: u32,
        path: *mut u16,
        size: *mut u32,
    ) -> i32;
    fn CloseHandle(handle: *mut c_void) -> i32;
}

#[cfg(target_os = "windows")]
pub(crate) fn read() -> Option<String> {
    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    let window = unsafe { GetForegroundWindow() };
    if window.is_null() {
        return None;
    }
    let mut process_id = 0;
    unsafe { GetWindowThreadProcessId(window, &mut process_id) };
    if process_id == 0 {
        return None;
    }
    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id) };
    if process.is_null() {
        return None;
    }
    let mut path = [0_u16; 32_768];
    let mut size = path.len() as u32;
    let success = unsafe { QueryFullProcessImageNameW(process, 0, path.as_mut_ptr(), &mut size) };
    unsafe { CloseHandle(process) };
    if success == 0 || size == 0 {
        return None;
    }
    let full_path = String::from_utf16(&path[..size as usize]).ok()?;
    std::path::Path::new(&full_path)
        .file_name()
        .and_then(|value| value.to_str())
        .map(str::to_owned)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn read() -> Option<String> {
    None
}
