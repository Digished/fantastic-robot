-- Persist the user's full date of birth.
--
-- Birthday pages are recurring and intentionally discard the year when
-- computing the next celebration date (see lib/self-celebration.ts). Storing
-- the full DOB on the user lets us compute age / "turned N" milestones for the
-- throwback section, pre-fill the date on return visits, and anchor the future
-- friends/upcoming-birthdays feed.
alter table public.users
  add column if not exists date_of_birth date;
