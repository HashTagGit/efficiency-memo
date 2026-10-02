# Installation Guide

This guide covers how to build and run EfficiencyMemo from source. The app is a Tauri v2 desktop application with a local SQLite database.

## Prerequisites

- **Node.js** ≥20
- **pnpm** ≥9
- **Rust toolchain** (install via [rustup](https://rustup.rs/))

The Rust toolchain is only needed when building from source. Pre-built releases will not require Rust.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd efficiency-memo

# Install dependencies
pnpm install

# Launch the desktop app in dev mode (hot-reload + DevTools)
pnpm --filter desktop tauri:dev
```

The first launch takes a few minutes while Rust compiles the native shell. Subsequent launches are instant.

Interact with the native Tauri window, not `http://localhost:1420`. That address is the Vite development server and lacks the Tauri bridge required for local SQLite access.

To build a production installer with updater signatures, set the release signing key first:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\path\to\updater.key"
# Only for a password-protected key:
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-key-password"
pnpm --filter desktop tauri:build -- --ci
```

Build output:

| Platform | Output |
|---|---|
| Windows | `.msi` installer and standalone `.exe` in `apps/desktop/src-tauri/target/release/bundle/msi/` |
| macOS | `.dmg` in `apps/desktop/src-tauri/target/release/bundle/dmg/` |
| Linux | `.AppImage`, `.deb`, or `.rpm` in `apps/desktop/src-tauri/target/release/bundle/` |

## In-app updates and releases

Settings → App updates provides manual checking, version information, release notes, download progress, and **Install and restart**. Finish an active CoreHour session before installation. Windows launches the downloaded signed installer automatically; Linux AppImage and macOS restart into the installed version. System permission prompts may still appear. The SQLite database remains in the existing user-data directory.

The desktop uses the official `tauri-plugin-updater` and `tauri-plugin-process` dependencies: the updater performs native download, signature verification and installation; the process plugin supplies restart on macOS/Linux. The public verification key and HTTPS feed are in `apps/desktop/src-tauri/tauri.conf.json`. No GitHub token or signing private key is shipped in the app.

The first update-enabled version is **0.2.0**. Users of the earlier 0.1.0 installers must install this version once, because those older clients contain no updater. Subsequent upgrades can be performed in Settings.

Publishing requirements:

1. Back up the private key securely. This workstation's key is stored at `%LOCALAPPDATA%\EfficiencyMemo\release-signing\updater.key`; it is outside the repository. The matching `.pub` key is public. Do not replace this key after distributing an update-enabled build.
2. Add repository secret `TAURI_SIGNING_PRIVATE_KEY` using that private key's contents; add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` only if protected by a password. In PowerShell, `Get-Content -Raw "C:\path\to\updater.key" | gh secret set TAURI_SIGNING_PRIVATE_KEY --repo HashTagGit/efficiency-memo` uploads the key through standard input without printing it or placing its value in command arguments.
3. Keep the desktop `package.json`, `Cargo.toml`, and `tauri.conf.json` versions equal. Use matching tags such as `v0.2.0`; an older tag with a different embedded version cannot reliably drive update checks.
4. The existing Release workflow validates versions and signing configuration, builds Windows/macOS/Linux, uploads signatures and `latest.json` with the official Tauri Action, and publishes only after every platform succeeds.

The client reads `https://github.com/HashTagGit/efficiency-memo/releases/latest/download/latest.json`. Until a signed release containing this manifest is published, checking reports a recoverable error; it does not report that the app is up to date. Testing the interface does not itself publish or install an update.

On Windows, `scripts/build-desktop.ps1` uses the above workstation key by default, or accepts `-SigningKeyPath`. Other machines need the original release key or `TAURI_SIGNING_PRIVATE_KEY` set explicitly.

## Platform Notes

### Windows

Install the following before building:

- **MSVC Build Tools** (via Visual Studio Installer or Build Tools for Visual Studio)
- **WebView2 Runtime** (pre-installed on Windows 11; download the Evergreen Bootstrapper if missing)

### macOS

Install the Xcode Command Line Tools:

```bash
xcode-select --install
```

### Linux

Install the required system libraries. Package names vary by distribution:

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev
```

**Fedora:**

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel
```

**Arch:**

```bash
sudo pacman -S webkit2gtk-4.1 openssl gtk3
```

## Troubleshooting

### First build is slow

The initial `tauri:dev` or `tauri:build` compiles the Rust native shell from source. This can take 5–15 minutes depending on your machine. Subsequent builds reuse cached artifacts and are much faster.

### Rust not found

If you see `rustc: command not found`, the Rust toolchain is not in your PATH. Either restart your terminal after installing rustup, or run:

```bash
source $HOME/.cargo/env
```

### Missing system libraries (Linux)

If the build fails with errors about `webkit2gtk`, `ssl`, or `gtk`, make sure the platform-specific packages above are installed. The exact package names vary between distributions.

### Database location

On first launch the app creates its SQLite database automatically:

- **Windows:** `%APPDATA%\\com.efficiency-memo.app\\efficiency-memo.db`
- **macOS:** `~/Library/Application Support/com.efficiency-memo.app/efficiency-memo.db`
- **Linux:** `$XDG_CONFIG_HOME/com.efficiency-memo.app/efficiency-memo.db` (normally `~/.config/com.efficiency-memo.app/efficiency-memo.db`)

All 7 schema migrations run automatically on first launch. No manual setup is required.

### Dev server not starting

If `pnpm --filter desktop tauri:dev` fails, check that:

1. Node.js ≥20 is active (`node --version`)
2. pnpm ≥9 is active (`pnpm --version`)
3. Rust is installed (`rustc --version`)
4. All prerequisites above are satisfied for your platform
