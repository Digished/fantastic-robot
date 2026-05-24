-- Anchor for the "edit date & account within 24h of publishing" rule. Set
-- when a page goes live (creation fee paid, or a free self page is inserted).
alter table public.celebrations
  add column if not exists published_at timestamptz;

-- Backfill already-live pages so the window is closed for them (their
-- created_at is in the past, which is the correct, safe default).
update public.celebrations
  set published_at = created_at
  where is_paid_for_creation = true and published_at is null;
