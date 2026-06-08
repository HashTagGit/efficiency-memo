-- Ported from supabase/migrations/001_cr_device_reminder.sql to SQLite for Tauri desktop.
-- Up: Create Charger-Reminder schema (cr_ namespaced tables)
-- Down: Drop all cr_ namespaced tables

-- Local users table (replaces auth.users from Supabase).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cr_device_presets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  default_threshold INTEGER NOT NULL,
  estimated_drain_per_month REAL NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT cr_device_presets_type_not_blank CHECK (type <> ''),
  CONSTRAINT cr_device_presets_default_threshold_between_0_and_100 CHECK (
    default_threshold >= 0 AND default_threshold <= 100
  ),
  CONSTRAINT cr_device_presets_estimated_drain_positive CHECK (
    estimated_drain_per_month > 0
  ),
  CONSTRAINT cr_device_presets_label_not_blank CHECK (label <> '')
);

CREATE TABLE IF NOT EXISTS cr_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL REFERENCES cr_device_presets(type),
  capacity_mah INTEGER,
  notes TEXT,
  threshold_percent INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT cr_devices_name_not_blank CHECK (name <> ''),
  CONSTRAINT cr_devices_capacity_mah_positive CHECK (
    capacity_mah IS NULL OR capacity_mah > 0
  ),
  CONSTRAINT cr_devices_threshold_percent_between_0_and_100 CHECK (
    threshold_percent >= 0 AND threshold_percent <= 100
  )
);

CREATE INDEX IF NOT EXISTS idx_cr_devices_user_id ON cr_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_cr_devices_device_type ON cr_devices (device_type);

CREATE TABLE IF NOT EXISTS cr_charge_events (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES cr_devices(id) ON DELETE CASCADE,
  charged_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cr_charge_events_device_id ON cr_charge_events (device_id);
CREATE INDEX IF NOT EXISTS idx_cr_charge_events_charged_at ON cr_charge_events (charged_at DESC);

CREATE TABLE IF NOT EXISTS cr_reminder_preferences (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE REFERENCES cr_devices(id) ON DELETE CASCADE,
  notify_before_days INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT cr_reminder_preferences_notify_before_days_non_negative CHECK (
    notify_before_days >= 0
  )
);

CREATE TABLE IF NOT EXISTS cr_computed_reminder_states (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE REFERENCES cr_devices(id) ON DELETE CASCADE,
  heuristic_version TEXT NOT NULL,
  estimated_battery_percent REAL,
  estimated_days_until_threshold INTEGER,
  reminder_due_at TEXT,
  status TEXT NOT NULL,
  basis TEXT NOT NULL,
  last_charge_event_id TEXT REFERENCES cr_charge_events(id) ON DELETE SET NULL,
  computed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT cr_computed_reminder_states_heuristic_version_not_blank CHECK (
    heuristic_version <> ''
  ),
  CONSTRAINT cr_computed_reminder_states_status_not_blank CHECK (
    status <> ''
  ),
  CONSTRAINT cr_computed_reminder_states_basis_not_blank CHECK (
    basis <> ''
  ),
  CONSTRAINT cr_computed_reminder_states_estimated_battery_percent_between_0_and_100 CHECK (
    estimated_battery_percent IS NULL
    OR (estimated_battery_percent >= 0 AND estimated_battery_percent <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_cr_computed_reminder_states_device_id
  ON cr_computed_reminder_states (device_id);
