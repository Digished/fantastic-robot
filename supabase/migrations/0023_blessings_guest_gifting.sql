-- Anyone can gift 52 Weeks of Blessings now, not just the page creator, and they
-- check out anonymously (like a contribution). Capture the gifter's own email so
-- their payment receipt / "gift started" confirmation has somewhere to land —
-- creator_id stays null for guest gifts.
alter table public.blessing_plans add column if not exists purchaser_email text;
