-- Add lightweight activity context for Today, recent activities, and favorites.
ALTER TABLE ch_sessions ADD COLUMN activity TEXT NOT NULL DEFAULT '';
ALTER TABLE ch_sessions ADD COLUMN default_tag_id TEXT REFERENCES ch_tags(id) ON DELETE SET NULL;
ALTER TABLE ch_sessions ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ch_sessions_user_activity_idx ON ch_sessions(user_id, activity);
