# Desktop Release Hardening - Rust Compilation Issues

## Task 5: Verify Rust crate compiles cleanly

Status: PASSED - `cargo check` and `cargo build --release` both exit 0.

Binary: `apps\desktop\src-tauri\target\release\efficiency-memo.exe` (7.1 MB)

### Issues Found & Fixed

#### 1. Wrong Rust toolchain (gnu vs msvc)
- Symptom: error calling dlltool.exe - program not found
- Root cause: Default toolchain was stable-x86_64-pc-windows-gnu which requires Mingw dlltool.exe in PATH
- Fix: Switched default to stable-x86_64-pc-windows-msvc via rustup
- Note: Both toolchains were already installed; MSVC was just not the default

#### 2. Tauri config: misplaced title field
- File: apps\desktop\src-tauri\tauri.conf.json
- Symptom: unknown field title, expected one of windows, security, ...
- Root cause: Tauri v2 does not accept title as a top-level app field; titles are per-window
- Fix: Removed title from the app object (window already has its own title)

#### 3. reqwest_dav API changes (v0.3.3)
- File: apps\desktop\src-tauri\src\sync.rs
- Multiple breaking changes from reqwest_dav v0.3.3:
  - DavClient renamed to Client (built via ClientBuilder)
  - re_export module renamed to re_exports
  - ListEntity moved to types::list_cmd, now an enum (File/Folder) without direct .href
  - list() now requires a Depth parameter
- Fixes applied:
  - Updated all imports to match new API
  - build_dav_client() now uses ClientBuilder::new()
  - sync_list() matches on ListEntity::File and ListEntity::Folder for href
  - Added Depth::Number(1) to list() call

#### 4. Unused imports
- File: apps\desktop\src-tauri\src\lib.rs - removed unused Builder import
- File: apps\desktop\src-tauri\src\sync.rs - removed unused command and reqwest imports
