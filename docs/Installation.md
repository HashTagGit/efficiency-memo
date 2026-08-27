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

To build a production installer:

```bash
pnpm --filter desktop tauri:build
```

Build output:

| Platform | Output |
|---|---|
| Windows | `.msi` installer and standalone `.exe` in `apps/desktop/src-tauri/target/release/bundle/msi/` |
| macOS | `.dmg` in `apps/desktop/src-tauri/target/release/bundle/dmg/` |
| Linux | `.AppImage`, `.deb`, or `.rpm` in `apps/desktop/src-tauri/target/release/bundle/` |

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
