-- UP
-- CoreHour schema: 5 tables with ch_ namespace
-- Converted from SQLite (CoreHour Tauri) to PostgreSQL (Supabase)

-- ch_tags: user-defined labels for categorizing work sessions
CREATE TABLE IF NOT EXISTS ch_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced boolean NOT NULL DEFAULT false
);

-- ch_sessions: time tracking sessions with configurable intervals
CREATE TABLE IF NOT EXISTS ch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  interval_minutes integer NOT NULL DEFAULT 30,
  synced boolean NOT NULL DEFAULT false
);

-- ch_check_ins: periodic prompts during a session to log progress
CREATE TABLE IF NOT EXISTS ch_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ch_sessions(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL,
  skipped boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  synced boolean NOT NULL DEFAULT false
);

-- ch_check_in_entries: tag allocations per check-in with percentage
CREATE TABLE IF NOT EXISTS ch_check_in_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid NOT NULL REFERENCES ch_check_ins(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES ch_tags(id) ON DELETE CASCADE,
  percentage integer NOT NULL,
  synced boolean NOT NULL DEFAULT false
);

-- ch_settings: key-value store for user preferences (e.g., interval_minutes)
CREATE TABLE IF NOT EXISTS ch_settings (
  key text PRIMARY KEY,
  value text NOT NULL
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
INSERT INTO ch_settings (key, value) VALUES ('interval_minutes', '30')
ON CONFLICT (key) DO NOTHING;

-- DOWN
DROP TABLE IF EXISTS ch_check_in_entries;
DROP TABLE IF EXISTS ch_check_ins;
DROP TABLE IF EXISTS ch_sessions;
DROP TABLE IF EXISTS ch_tags;
DROP TABLE IF EXISTS ch_settings;