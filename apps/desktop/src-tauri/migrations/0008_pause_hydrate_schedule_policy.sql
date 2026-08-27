CREATE TABLE IF NOT EXISTS ph_schedule_policies (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    active_weekdays_mask INTEGER NOT NULL DEFAULT 31 CHECK (active_weekdays_mask BETWEEN 1 AND 127),
    work_start_minute INTEGER NOT NULL DEFAULT 540 CHECK (work_start_minute BETWEEN 0 AND 1438),
    work_end_minute INTEGER NOT NULL DEFAULT 1080 CHECK (work_end_minute BETWEEN 1 AND 1439),
    quiet_enabled INTEGER NOT NULL DEFAULT 0 CHECK (quiet_enabled IN (0, 1)),
    quiet_start_minute INTEGER NOT NULL DEFAULT 1320 CHECK (quiet_start_minute BETWEEN 0 AND 1439),
    quiet_end_minute INTEGER NOT NULL DEFAULT 420 CHECK (quiet_end_minute BETWEEN 0 AND 1439),
    updated_at TEXT NOT NULL,
    CHECK (work_start_minute < work_end_minute),
    CHECK (quiet_start_minute <> quiet_end_minute)
);
