ALTER TABLE ph_schedule_policies
ADD COLUMN natural_break_enabled INTEGER NOT NULL DEFAULT 0 CHECK (natural_break_enabled IN (0, 1));

ALTER TABLE ph_schedule_policies
ADD COLUMN natural_break_minutes INTEGER NOT NULL DEFAULT 5 CHECK (natural_break_minutes BETWEEN 2 AND 30);

ALTER TABLE ph_reminder_events
ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'natural'));
