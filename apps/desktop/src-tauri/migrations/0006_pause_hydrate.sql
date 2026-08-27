CREATE TABLE IF NOT EXISTS ph_reminders (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('break', 'hydration')),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    interval_minutes INTEGER NOT NULL CHECK (interval_minutes BETWEEN 15 AND 240 AND interval_minutes % 15 = 0),
    next_due_at TEXT,
    pending_at TEXT,
    muted_until TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, kind)
);

CREATE TABLE IF NOT EXISTS ph_reminder_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('break', 'hydration')),
    action TEXT NOT NULL CHECK (action IN ('completed', 'snoozed', 'muted')),
    occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ph_events_user_time
    ON ph_reminder_events(user_id, occurred_at DESC);
