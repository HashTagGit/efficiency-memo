CREATE TABLE IF NOT EXISTS aa_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
    retention_hours INTEGER NOT NULL DEFAULT 72 CHECK (retention_hours IN (24, 48, 72, 168)),
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aa_exclusions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, application_id)
);

CREATE TABLE IF NOT EXISTS aa_activity_samples (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    CHECK (last_seen_at >= started_at)
);

CREATE INDEX IF NOT EXISTS aa_samples_user_last_seen_idx
    ON aa_activity_samples(user_id, last_seen_at DESC);
