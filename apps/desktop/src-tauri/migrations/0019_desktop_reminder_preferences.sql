CREATE TABLE desktop_reminder_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pet_enabled INTEGER NOT NULL CHECK (pet_enabled IN (0, 1))
);
