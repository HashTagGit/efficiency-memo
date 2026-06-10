# Task 6 Assessment: Desktop App Rough Edges

## Charger Reminder Deep Links

### Issue: "Add Device" button navigates to a dead route

**Code evidence:**
- `apps/desktop/src/features/charger-reminder/pages/device-list-page.tsx` lines 67-68 and 87-88:
  ```tsx
  <Link to="/tools/charger-reminder/new" ...>Add Device</Link>
  ```
- `apps/desktop/src/App.tsx` lines 42-49:
  ```tsx
  <Route
    path="/tools/charger-reminder/*"
    element={
      <Suspense fallback={<ToolFallback />}>
        <ChargerReminderPage />
      </Suspense>
    }
  />
  ```

**Analysis:** The route `path="/tools/charger-reminder/*"` mounts `ChargerReminderPage` (which is `device-list-page.tsx`) but defines NO nested routes. Clicking "Add Device" navigates to `/tools/charger-reminder/new`, which renders the same device-list page (because `/*` catches everything) but the list page doesn't handle the `/new` sub-path. There is no `DeviceFormPage` or form route registered.

**Decision: FIX in Wave 2**
- The page file exists (`device-form.tsx`) but isn't routed
- Fix: Add a nested route in App.tsx or within the ChargerReminder feature for `/tools/charger-reminder/new`

---

## CoreHour Sub-Routes

### Issue: Manifest advertises 4 routes but only 1 is wired

**Code evidence:**
- `apps/desktop/src/features/core-hour/manifest.ts` lines 8-13:
  ```ts
  routes: [
    "/tools/core-hour",
    "/tools/core-hour/history",
    "/tools/core-hour/tags",
    "/tools/core-hour/settings",
  ],
  ```
- `apps/desktop/src/App.tsx` lines 50-57:
  ```tsx
  <Route
    path="/tools/core-hour/*"
    element={
      <Suspense fallback={<ToolFallback />}>
        <CoreHourPage />
      </Suspense>
    }
  />
  ```
- `apps/desktop/src/features/core-hour/component-loader.ts` lines 4-5:
  ```ts
  export const chComponentLoader = () =>
    import("./pages/dashboard-page").then(...)
  ```

**Analysis:** The manifest registers 4 routes, but `App.tsx` only mounts `dashboard-page.tsx` at `/tools/core-hour/*` with no nested routes. The `Shell` / `Sidebar` (`packages/ui/src/sidebar.tsx`) renders only tool-level buttons, not sub-route tabs. There are no visible navigation links to `/history`, `/tags`, or `/settings` from the UI. However, the pages exist (`history-page.tsx`, `tags-page.tsx`, `settings-page.tsx`) — they're just not wired into the router.

**Decision: DEFER**
- No user-facing broken navigation exists today (sidebar doesn't show sub-route links)
- Fixing requires adding nested Routes inside CoreHour or in App.tsx, plus adding UI navigation (tabs/links) to reach those pages
- The pages themselves appear functional; this is a routing/navigation wiring issue, not a broken feature

---

## Device Form Bugs

### Issue A: `<select>` for Device Type is not wired

**Code evidence:**
- `apps/desktop/src/features/charger-reminder/components/device-form.tsx` line 114:
  ```tsx
  <select
    id="deviceType"
    value={device?.device_type ?? presets[0]?.type ?? "wireless-mouse"}
    onChange={() => {}}
    ...
  >
  ```
- Line 65:
  ```tsx
  device_type: device?.device_type ?? presets[0]?.type ?? "wireless-mouse",
  ```

**Analysis:** The `onChange` handler is a no-op `() => {}`. The select's `value` is computed from `device?.device_type` (edit mode) or the first preset, but there's no state tracking the user's selection. Even worse, line 65 in `handleSubmit` uses the same fallback expression, so the submitted `device_type` will never reflect what the user selected.

**Decision: FIX in Wave 2**
- This is a real user-facing bug: users cannot change the device type when creating or editing a device
- Fix: Add `useState` for `deviceType`, wire `onChange` to update it, and use the state variable in `handleSubmit`

### Issue B: `reminderEnabled` checkbox

**Code evidence:**
- `apps/desktop/src/features/charger-reminder/components/device-form.tsx` lines 33 and 158-169:
  ```tsx
  const [reminderEnabled, setReminderEnabled] = useState(true);
  ...
  <input
    id="reminderEnabled"
    type="checkbox"
    checked={reminderEnabled}
    onChange={(e) => setReminderEnabled(e.target.checked)}
    ...
  />
  ```
- Line 64:
  ```tsx
  reminder_enabled: reminderEnabled,
  ```

**Analysis:** The checkbox is properly wired with React state and its value is included in the submitted form data.

**Decision: NO FIX NEEDED**
- Already working correctly

---

## CoreHour Settings `handleSave` Stub

**Code evidence:**
- `apps/desktop/src/features/core-hour/pages/settings-page.tsx` lines 16-20:
  ```tsx
  const handleSave = () => {
    // In a real implementation this would persist to the database
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  ```

**Analysis:** The save handler only toggles a transient UI state (shows "Settings saved!" for 2 seconds). It does not persist the selected `intervalMinutes` to SQLite or anywhere else. On page reload, the setting reverts to the default `30`.

**Decision: DEFER**
- This is a genuine stub, but fixing it requires:
  1. A new SQLite table or column for CoreHour settings
  2. DB read/write functions in `db-tauri.ts`
  3. Loading the saved value on mount instead of hard-coding `useState(30)`
- This is a schema + persistence feature, not a quick bugfix
- Better suited for a dedicated "CoreHour Settings Persistence" issue

---

## Summary

| Rough Edge | Decision | Rationale |
|---|---|---|
| Charger Reminder "Add Device" dead route | **FIX in Wave 2** | User clicks a button that navigates to a non-existent route. The form component exists but isn't wired. |
| CoreHour sub-routes not wired | **DEFER** | Manifest advertises routes that aren't mounted, but no UI links to them exist today. Requires nested routing + navigation UI. |
| Device form `<select>` no-op | **FIX in Wave 2** | Users cannot change device type. Broken form input with real functional impact. |
| Device form `reminderEnabled` | **NO FIX NEEDED** | Already correctly wired to state and submitted data. |
| CoreHour settings `handleSave` stub | **DEFER** | Requires new DB schema and persistence layer. Not a quick fix. |

## Wave 2 Action Items

1. **Add Charger Reminder device form route** — Register `/tools/charger-reminder/new` in `App.tsx` (or within the feature) and render `DeviceForm` with presets and an `onSubmit` that calls `chargerReminderDb.createDevice()`.
2. **Fix device form `<select>` wiring** — Add `deviceType` state, wire `onChange`, and use the state in `handleSubmit`.

## Deferred Items

1. **CoreHour sub-route wiring** — Add nested routes for `/history`, `/tags`, `/settings` and add tab navigation inside CoreHour.
2. **CoreHour settings persistence** — Create a `core_hour_settings` table, add DB functions, and wire `handleSave` to persist/retrieve the interval.
