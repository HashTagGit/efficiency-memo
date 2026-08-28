CREATE TABLE IF NOT EXISTS ch_daily_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('on-track', 'overcommitted', 'underplanned', 'interrupted')),
  next_goal_minutes INTEGER NOT NULL CHECK (next_goal_minutes BETWEEN 15 AND 720),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_ch_daily_reviews_user_date
  ON ch_daily_reviews(user_id, local_date DESC);
