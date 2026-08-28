# Linux desktop idle detection

Research date: 2026-08-28

## Decision

Implement two exact Linux adapters behind the existing `get_system_idle_seconds() -> Result<Option<u64>, String>` command:

1. **GNOME/Mutter, normally Wayland:** call `GetIdletime` on the user session bus at service `org.gnome.Mutter.IdleMonitor`, object `/org/gnome/Mutter/IdleMonitor/Core`, interface `org.gnome.Mutter.IdleMonitor`. The result is a `uint64` millisecond count; floor it to seconds.
2. **X11, including KDE X11:** query the MIT-SCREEN-SAVER extension on the default root window with `XScreenSaverQueryInfo`; use `XScreenSaverInfo.idle` milliseconds and floor it to seconds.

Return `Ok(None)` when neither exact adapter is available. In particular, return `None` on **KDE Plasma Wayland**. Do not report an invented duration from Xwayland, logind, a portal state, or a Wayland threshold event.

This keeps the current TypeScript contract intact: callers already treat `null` as unavailable, while a numeric result means an exact elapsed input-idle duration. The current implementation returns `None` on all Linux systems, and the value is polled every 30 seconds by Pause & Hydrate. [Current Rust command](../../apps/desktop/src-tauri/src/system_idle.rs), [TypeScript bridge](../../apps/desktop/src/lib/system-idle.ts), [polling caller](../../apps/desktop/src/features/pause-hydrate/context.tsx)

## Capability matrix

| Session | Source | Honest result now | Notes |
|---|---|---:|---|
| GNOME Wayland | Mutter session D-Bus `GetIdletime` | Exact milliseconds | Desktop-specific, but it exposes the quantity the current API promises. |
| GNOME X11 | Prefer XScreenSaver; Mutter is an optional second probe | Exact milliseconds | XScreenSaver avoids depending on a GNOME service when X11 already has the extension. |
| KDE Plasma X11 | XScreenSaver | Exact milliseconds | KIdleTime itself uses this query in its XScreenSaver backend. |
| KDE Plasma Wayland | None | Unsupported | KDE's own screen-locker rejects `GetSessionIdleTime` on Wayland; KIdleTime's Wayland backend cannot poll elapsed time. |
| Other X11 desktop/window manager | XScreenSaver when display and extension exist | Exact or unsupported | Probe the extension; do not assume the desktop name implies support. |
| Other Wayland compositor | None | Unsupported | `ext-idle-notify-v1` is event/threshold based, not an elapsed-time query. |
| Flatpak/Snap confinement | Desktop API may be denied | Permission-limited/unsupported | No idle-duration portal exists; direct session-bus access needs sandbox policy. |

For diagnostics, keep an internal source/result classification such as `mutter`, `xscreen-saver`, `unsupported`, `permission-denied`, and `failed`. Do not widen the public command until the UI needs to explain those distinctions. A returned number must always mean exact elapsed idle seconds; `None` covers every non-exact capability state.

## Verified APIs

### GNOME/Mutter D-Bus

Mutter publishes `org.gnome.Mutter.IdleMonitor`. Its current introspection XML defines:

- `GetIdletime() -> t` (`uint64`)
- `AddIdleWatch(t) -> u`
- `AddUserActiveWatch() -> u`
- `RemoveWatch(u)`
- `ResetIdletime()`
- `WatchFired(u)`

The XML says watch intervals and idle time are milliseconds. The GNOME desktop library describes its server-global monitor and `gnome_idle_monitor_get_idletime()` as returning current idle milliseconds. For EfficiencyMemo, only the read-only `GetIdletime` call is needed. [Mutter interface XML](https://gitlab.gnome.org/GNOME/mutter/-/blob/main/data/dbus-interfaces/org.gnome.Mutter.IdleMonitor.xml), [GNOME desktop idle-monitor API](https://gnome.pages.gitlab.gnome.org/gnome-desktop/html/gnome-desktop3/gnome-desktop3-GnomeIdleMonitor.html)

Use a bounded blocking session-bus call because the Tauri command is currently synchronous and invoked only every 30 seconds. Treat `ServiceUnknown`, `NameHasNoOwner`, `UnknownMethod`, and `AccessDenied` as unavailable capability (`None`) with a diagnostic; reserve `Err` for an unexpected failure worth surfacing in logs.

### KDE Plasma

KScreenLocker owns `org.freedesktop.ScreenSaver` on the session bus and exports both `/ScreenSaver` and `/org/freedesktop/ScreenSaver`. It implements `GetSessionIdleTime() -> u`, but its current source explicitly returns `org.freedesktop.DBus.Error.NotSupported` when `KWindowSystem::isPlatformWayland()` is true. It only returns `KIdleTime::idleTime()` on non-Wayland sessions. [KScreenLocker implementation](https://github.com/KDE/kscreenlocker/blob/master/interface.cpp), [KScreenLocker D-Bus XML](https://github.com/KDE/kscreenlocker/blob/master/dbus/org.freedesktop.ScreenSaver.xml)

KIdleTime is not an exact-duration escape hatch on Wayland. Its Wayland backend supports idle/resume timeout objects through `ext-idle-notify-v1` or the older `org_kde_kwin_idle`, but `forcePollRequest()` logs that polling idle time is unsupported and returns zero. Therefore:

- do not call `org.freedesktop.ScreenSaver.GetSessionIdleTime` as a KDE Wayland fallback;
- do not interpret KIdleTime's zero as “active now”;
- do not add Qt/KF6 KIdleTime as an application dependency for this Rust/Tauri command.

[KIdleTime API](https://api.kde.org/kidletime-index.html), [KIdleTime Wayland backend](https://github.com/KDE/kidletime/blob/master/src/plugins/wayland/poller.cpp)

### Generic X11

The XScreenSaver extension exposes `XScreenSaverQueryInfo(Display*, Drawable, XScreenSaverInfo*)`; the returned structure's `idle` field is milliseconds since the last user input. KDE's X11 backend demonstrates the same call against `DefaultRootWindow(display())` and returns `info->idle`. [X.Org libXss source](https://gitlab.freedesktop.org/xorg/lib/libxscrnsaver), [KIdleTime XScreenSaver backend](https://github.com/KDE/kidletime/blob/master/src/plugins/xscreensaver/xscreensaverbasedpoller.cpp)

Probe all of the following before returning a value: `DISPLAY`, successful `XOpenDisplay`, XScreenSaver extension availability, allocation, and a successful `XScreenSaverQueryInfo`. Close/free every acquired X11 resource. Any failed probe is `None`, not zero.

Do not run `xprintidle`, `xset`, `gdbus`, or `dbus-send`. A subprocess adds an undeclared runtime program and parsing surface for APIs already available in-process.

### Wayland protocol and portals

`ext-idle-notify-v1` lets a client register a timeout for a `wl_seat` and receive `idled` and `resumed` events. Version 2 can monitor input while ignoring idle inhibitors. It does **not** return the elapsed time since the last input, so a newly started app cannot reconstruct the preceding idle interval. [Official protocol XML](https://gitlab.freedesktop.org/wayland/wayland-protocols/-/blob/main/staging/ext-idle-notify/ext-idle-notify-v1.xml)

The xdg-desktop-portal Inhibit interface can inhibit idling and monitor session transitions. Its `StateChanged` data can include `screensaver-active` and a running/query-end/ending session state; it has no idle-duration value. It is not a substitute for `GetIdletime`. [XDG Desktop Portal Inhibit](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Inhibit.html)

If the product later needs only “idle for at least five minutes,” a persistent Wayland threshold monitor can be designed around `ext-idle-notify-v1`. That is a different capability and should use an event/state API, not manufacture `idle_seconds`.

## Dependencies and packaging

The current lockfile already contains `dbus 0.9.11` and `x11-dl 2.21.0` transitively through Tauri's Linux windowing stack (`tao`/`wry`). [Cargo manifest](../../apps/desktop/src-tauri/Cargo.toml), [Cargo lockfile](../../apps/desktop/src-tauri/Cargo.lock)

Declare both directly under a Linux target dependency table before using them:

```toml
[target.'cfg(target_os = "linux")'.dependencies]
dbus = "0.9"
x11-dl = "2"
```

This is justified: it adds no new crate family or locked version, makes the code's actual dependencies explicit, and keeps them out of Windows/macOS builds. Transitive dependencies are not a stable public dependency contract.

Native constraints remain:

- `dbus` uses `libdbus-1` through `libdbus-sys`; Linux build images need the D-Bus development metadata/library, and installed packages need the compatible runtime library. Verify rather than assuming Tauri's transitive use covers every build image. [dbus-rs repository](https://github.com/diwic/dbus-rs)
- `x11-dl` dynamically loads X11 libraries. The X11 adapter must degrade to `None` when `libX11`, `libXss`, `DISPLAY`, or the server extension is missing. A Wayland-only installation must still start normally.
- The repo currently bundles `.deb` and AppImage on Linux. Inspect the produced `.deb` dependency metadata and run the AppImage on the oldest supported distribution; do not declare support from a successful Windows cross-tree compile. [Tauri bundle configuration](../../apps/desktop/src-tauri/tauri.conf.json), [installation guide](../Installation.md)
- Flatpak filters session-bus access unless the manifest grants an appropriate `--talk-name`; Snap uses interface/AppArmor policy. There is no portal fallback for duration, so a denied Mutter call is a real `permission-limited` state. [Flatpak D-Bus access](https://docs.flatpak.org/en/latest/sandbox-permissions.html#d-bus-access), [Snap desktop interface policy](https://github.com/canonical/snapd/blob/master/interfaces/builtin/desktop.go)

No new top-level workspace dependency, Qt/KF6 dependency, helper executable, or bundled daemon is warranted.

The implementation was compile-checked on 2026-08-28 in a native Debian 12 container with the documented Tauri, D-Bus, X11, and XScreenSaver development libraries. This proves the Linux code and dependency graph compile; it does not replace GNOME Wayland, Plasma Wayland, X11, `.deb`, or AppImage runtime validation.

## Implementation order and stop conditions

1. **Add result normalization tests.** Test milliseconds-to-seconds flooring, overflow-safe conversion, and failed-probe-to-`None`. Keep platform smoke tests behind Linux session checks.
2. **Add the Mutter adapter.** Use the session bus, exact identifiers above, a short timeout, and `uint64` milliseconds. Validate on native GNOME Wayland after fresh login and after suspend/resume.
3. **Add the XScreenSaver adapter.** Prefer it whenever an X11 display is actually available. Validate on at least one plain X11 session and KDE or GNOME X11.
4. **Route Linux by capability, not desktop string alone.** If `WAYLAND_DISPLAY` is present, probe Mutter; if an X11 display is present, probe XScreenSaver. A failed exact probe ends as `None`.
5. **Verify packages.** Build `.deb` and AppImage, inspect native dependencies, then run each on a clean GNOME Wayland, Plasma Wayland, and X11 VM/session.

Stop and keep `None` when any of these is true:

- Plasma Wayland is the only available session API. KDE upstream explicitly does not support elapsed-time polling there.
- The only available Wayland API is `ext-idle-notify-v1`. Do not turn threshold events or time since app startup into exact idle seconds.
- Mutter is absent, denies access, times out, or changes its interface.
- X11 cannot open the display, lacks XScreenSaver, or cannot load its runtime libraries.
- The package cannot start on a Wayland-only host without X11 libraries, or its native runtime dependencies are not correctly declared/bundled.
- Native GNOME Wayland, Plasma Wayland, and X11 validation is unavailable. Keep the code unshipped or capability-gated rather than claiming broad Linux support from unit tests alone.

## Deferred work

A stateful `ext-idle-notify-v1` service is only worth adding when the application contract changes from “how many exact seconds?” to “did the configured idle threshold fire?” At that point, expose an explicit threshold-event capability and test compositor support. Until then, `None` on KDE and generic Wayland is the smallest correct behavior.
