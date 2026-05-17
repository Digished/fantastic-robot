ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;
