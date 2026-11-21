ALTER TABLE desktop_reminder_preferences ADD COLUMN look_enabled INTEGER NOT NULL DEFAULT 0 CHECK (look_enabled IN (0, 1));
ALTER TABLE desktop_reminder_preferences ADD COLUMN walk_enabled INTEGER NOT NULL DEFAULT 0 CHECK (walk_enabled IN (0, 1));
