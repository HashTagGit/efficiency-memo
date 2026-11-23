ALTER TABLE desktop_reminder_preferences ADD COLUMN bubble_style TEXT NOT NULL DEFAULT 'classic'
    CHECK (bubble_style IN ('classic', 'argos', 'shimeji', 'pixel'));
