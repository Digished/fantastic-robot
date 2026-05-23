-- Optional wishlist on a celebration: a list of { title, url } items the
-- celebrant would love. Shown to contributors on the live page so they know
-- what the cash gift could go toward. Sealed pages reveal it on the date.
alter table public.celebrations
  add column if not exists wishlist jsonb not null default '[]'::jsonb;
