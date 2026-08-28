CREATE TABLE IF NOT EXISTS aa_activity_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_sample_id TEXT NOT NULL UNIQUE,
  application_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed', 'accepted')),
  session_id TEXT UNIQUE REFERENCES ch_sessions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (ended_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_aa_activity_suggestions_review
  ON aa_activity_suggestions(user_id, status, started_at);
