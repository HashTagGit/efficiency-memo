CREATE TABLE IF NOT EXISTS aa_activity_rules (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL CHECK (length(application_id) BETWEEN 1 AND 128),
  activity TEXT NOT NULL CHECK (length(trim(activity)) BETWEEN 1 AND 160),
  default_tag_id TEXT REFERENCES ch_tags(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_aa_activity_rules_user_updated
  ON aa_activity_rules(user_id, updated_at DESC);
