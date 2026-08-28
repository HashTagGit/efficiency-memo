CREATE TABLE IF NOT EXISTS cr_notification_states (
  device_id TEXT PRIMARY KEY REFERENCES cr_devices(id) ON DELETE CASCADE,
  last_notified_due_at TEXT,
  snoozed_until TEXT,
  updated_at TEXT NOT NULL
);
