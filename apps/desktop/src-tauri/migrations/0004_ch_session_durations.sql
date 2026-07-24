-- Keep CoreHour durations accurate across pauses and completed sessions.
ALTER TABLE ch_sessions ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ch_check_ins ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0;
