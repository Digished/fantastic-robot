ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS celebrant_description text;
