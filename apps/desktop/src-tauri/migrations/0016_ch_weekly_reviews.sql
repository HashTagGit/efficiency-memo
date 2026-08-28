CREATE TABLE IF NOT EXISTS ch_weekly_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_started_on TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('on-track', 'overcommitted', 'underplanned', 'interrupted')),
  next_goal_minutes INTEGER NOT NULL CHECK (next_goal_minutes BETWEEN 15 AND 720),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, week_started_on)
);
