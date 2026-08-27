ALTER TABLE ph_schedule_policies
ADD COLUMN system_deferral_enabled INTEGER NOT NULL DEFAULT 1 CHECK (system_deferral_enabled IN (0, 1));

ALTER TABLE ph_schedule_policies
ADD COLUMN deferral_grace_minutes INTEGER NOT NULL DEFAULT 5 CHECK (deferral_grace_minutes BETWEEN 1 AND 30);

ALTER TABLE ph_schedule_policies
ADD COLUMN system_deferred INTEGER NOT NULL DEFAULT 0 CHECK (system_deferred IN (0, 1));
