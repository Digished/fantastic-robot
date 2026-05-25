-- Presentation style for a celebration: the default cinematic "reel", or a
-- "book" treatment (page-turn slideshow + bound-book main page).
alter table public.celebrations
  add column if not exists presentation text not null default 'reel'
    check (presentation in ('reel', 'book'));
