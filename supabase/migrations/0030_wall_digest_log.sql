-- Idempotency log for the end-of-day wall digest email. One row per page per
-- day the digest is sent, so a re-run of the cron never double-emails.
create table if not exists public.wall_digest_log (
  celebration_id uuid not null references public.celebrations(id) on delete cascade,
  digest_date date not null,
  sent_at timestamptz not null default now(),
  primary key (celebration_id, digest_date)
);
