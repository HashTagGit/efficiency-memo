CREATE TABLE IF NOT EXISTS ch_review_reminder_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_enabled INTEGER NOT NULL DEFAULT 0 CHECK (daily_enabled IN (0, 1)),
  daily_minute INTEGER NOT NULL DEFAULT 1080 CHECK (daily_minute BETWEEN 0 AND 1439),
  weekly_enabled INTEGER NOT NULL DEFAULT 0 CHECK (weekly_enabled IN (0, 1)),
  weekly_weekday INTEGER NOT NULL DEFAULT 6 CHECK (weekly_weekday BETWEEN 0 AND 6),
  weekly_minute INTEGER NOT NULL DEFAULT 1080 CHECK (weekly_minute BETWEEN 0 AND 1439),
  last_daily_local_date TEXT,
  last_weekly_started_on TEXT,
  pending_daily_local_date TEXT,
  pending_week_started_on TEXT,
  updated_at TEXT NOT NULL
);
