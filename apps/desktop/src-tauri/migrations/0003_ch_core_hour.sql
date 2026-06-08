-- Ported from supabase/migrations/003_ch_core_hour.sql to SQLite for Tauri desktop.
-- Up: CoreHour schema: 5 tables with ch_ namespace

-- ch_tags: user-defined labels for categorizing work sessions
CREATE TABLE IF NOT EXISTS ch_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

-- ch_sessions: time tracking sessions with configurable intervals
CREATE TABLE IF NOT EXISTS ch_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  synced INTEGER NOT NULL DEFAULT 0
);

-- ch_check_ins: periodic prompts during a session to log progress
CREATE TABLE IF NOT EXISTS ch_check_ins (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ch_sessions(id) ON DELETE CASCADE,
  checked_at TEXT NOT NULL,
  skipped INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  synced INTEGER NOT NULL DEFAULT 0
);

-- ch_check_in_entries: tag allocations per check-in with percentage
CREATE TABLE IF NOT EXISTS ch_check_in_entries (
  id TEXT PRIMARY KEY,
  check_in_id TEXT NOT NULL REFERENCES ch_check_ins(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES ch_tags(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

-- ch_settings: key-value store for user preferences (e.g., interval_minutes)
CREATE TABLE IF NOT EXISTS ch_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS ch_tags_user_id_idx ON ch_tags(user_id);
CREATE INDEX IF NOT EXISTS ch_tags_user_archived_idx ON ch_tags(user_id, is_archived);
CREATE INDEX IF NOT EXISTS ch_sessions_user_id_idx ON ch_sessions(user_id);
CREATE INDEX IF NOT EXISTS ch_sessions_started_at_idx ON ch_sessions(started_at);
CREATE INDEX IF NOT EXISTS ch_check_ins_session_id_idx ON ch_check_ins(session_id);
CREATE INDEX IF NOT EXISTS ch_check_ins_checked_at_idx ON ch_check_ins(checked_at);
CREATE INDEX IF NOT EXISTS ch_check_in_entries_check_in_id_idx ON ch_check_in_entries(check_in_id);
CREATE INDEX IF NOT EXISTS ch_check_in_entries_tag_id_idx ON ch_check_in_entries(tag_id);
CREATE INDEX IF NOT EXISTS ch_settings_key_idx ON ch_settings(key);

-- Seed default settings
INSERT OR REPLACE INTO ch_settings (key, value) VALUES ('interval_minutes', '30');
