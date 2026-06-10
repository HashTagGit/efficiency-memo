## 2026-06-10 — App icons generated

### Problem
All 5 Tauri icon files in `apps/desktop/src-tauri/icons/` were 67-byte 1x1 PNG placeholders (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`). These cannot be used for a real desktop build — the installer would show a blank/single-pixel app icon and OS taskbar/dock previews would be broken.

### Fix
- Generated a 1024x1024 source PNG (indigo→violet gradient with rounded corners + bold "EM" wordmark) using `System.Drawing` in PowerShell.
- Ran `pnpm --filter desktop tauri icon "$PWD/apps/desktop/src-tauri/app-icon-source.png"`.
- Tauri auto-generated the 5 required icons plus full iOS/Android asset sets.
- Deleted the source PNG after generation (not needed in repo).

### Results — all > 100 bytes
| File | Size |
|---|---|
| `32x32.png` | 1,383 B |
| `128x128.png` | 5,271 B |
| `128x128@2x.png` | 10,334 B |
| `icon.icns` | 114,686 B |
| `icon.ico` | 23,350 B |

### Gotchas
- `pnpm --filter desktop tauri icon` runs the Tauri CLI from `apps/desktop/`, so a repo-relative path like `apps/desktop/src-tauri/icon.png` resolves as `apps/desktop/apps/desktop/src-tauri/...` and fails with `系统找不到指定的路径`. Use `$PWD/apps/desktop/src-tauri/...` (absolute from repo root) instead.
- The Windows Tauri icon command emits ANSI-colored output that PowerShell renders with stray `�` after non-ASCII characters — harmless, the exit code is 0.
- `tauri icon` overwrites the 5 desktop icons in place and also writes a full set of iOS `AppIcon-*.png` and Android `mipmap-*/ic_launcher*.png` files into the same `icons/` directory. The desktop build only consumes the 5 desktop-format files; the mobile assets are inert on Windows/macOS/Linux builds.

##2026-06-10 - Fix10 typecheck errors in packages/shared

### Problem
pnpm typecheck failed with10 errors in packages/shared/src/__tests__/types.test.ts. Runtime tests still passed (57/57), but the type-level assertions and expect global were unrecognized.

### Errors and fixes

| # | Line(s) | Error | Fix |
|---|---|---|---|
|1 |176,180,181,185 | TS2304: Cannot find name expect (4x) | Added types: [vitest/globals, react] to packages/shared/tsconfig.json compilerOptions |
|2 |69 | TS2349: Type ExpectString<string \| undefined> has no call signatures (caused by noUncheckedIndexedAccess widening manifest.routes[0] to string \| undefined) | Changed .toBeString() to .toMatchTypeOf<string \| undefined>() |
|3 |110 | TS2344: Type ToolManifest does not satisfy the constraint - enabled: "Expected: boolean, Actual: never" | Changed const registration = {...} satisfies ToolRegistration to const registration: ToolRegistration = {...} so registration.manifest keeps the wider ToolManifest type |
|4 |148,149,169,170 | TS2349: ExpectString<string \| undefined> / ExpectNumber<number \| undefined> has no call signatures (lastUsed/usageCount are optional string?/number?) | Changed .toBeString() / .toBeNumber() to .toEqualTypeOf<string \| undefined>() / .toEqualTypeOf<number \| undefined>() |

### Gotchas

- compilerOptions.types is REPLACITIVE, not additive. Setting types: [vitest/globals] alone strips @types/react and @types/node from auto-inclusion, which broke React.ComponentType in src/types.ts:14 (TS2503: Cannot find namespace React). Listing react alongside vitest/globals preserves the previously auto-included @types/react.
- noUncheckedIndexedAccess: true (from tsconfig.base.json) widens arr[0] to T \| undefined. expectTypeOf(value).toBeString() is a strict equality check, so it fails on T \| undefined. .toMatchTypeOf<T>() and .toEqualTypeOf<T>() are the correct alternatives for optional or widened types.
- satisfies keeps the literal narrow type. When satisfies ToolRegistration is used and the literal's enabled is true (literal type, not widened to boolean), downstream toEqualTypeOf<ToolManifest>() fails because true is not assignable to boolean. Use : TypeName = ... (explicit annotation) when you need to preserve the wide type for comparison.
- Vitest expectTypeOf().toBeString() is a strict assertion (no implicit \| undefined). When the assertion fails at compile time, the chained result type is not callable - that is why the error reads "has no call signatures" rather than the more familiar "expected string, got string \| undefined".
