-- Optional background music track for the celebration slideshow.
-- Stores the track id from lib/music.ts; NULL means no music.
ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS background_music text;
