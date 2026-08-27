CREATE TABLE IF NOT EXISTS ch_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    tag_id TEXT REFERENCES ch_tags(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped')),
    session_id TEXT UNIQUE REFERENCES ch_sessions(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0 CHECK (synced IN (0, 1)),
    CHECK (ended_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_ch_plans_user_start
    ON ch_plans(user_id, started_at);
