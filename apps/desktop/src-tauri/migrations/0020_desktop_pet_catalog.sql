ALTER TABLE desktop_reminder_preferences
ADD COLUMN selected_pet_id TEXT NOT NULL DEFAULT 'amber-cat';

CREATE TABLE desktop_pet_packs (
    id TEXT PRIMARY KEY NOT NULL,
    manifest TEXT NOT NULL,
    atlas TEXT NOT NULL,
    thumbnail TEXT NOT NULL
);
