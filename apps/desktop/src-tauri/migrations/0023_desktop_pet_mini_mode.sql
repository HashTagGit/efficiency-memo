ALTER TABLE desktop_reminder_preferences ADD COLUMN mini_enabled INTEGER NOT NULL DEFAULT 0 CHECK (mini_enabled IN (0, 1));
