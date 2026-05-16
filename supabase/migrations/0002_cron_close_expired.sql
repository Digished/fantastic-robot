-- Auto-close celebrations once their deadline has passed.
-- Requires the pg_cron extension to be enabled in the Supabase project.

create extension if not exists pg_cron;

create or replace function close_expired_celebrations() returns void as $$
  update public.celebrations
     set status = 'closed'
   where status = 'active'
     and deadline_at < now();
$$ language sql;

select cron.schedule(
  'spendbox-close-expired',
  '* * * * *',
  $$ select close_expired_celebrations(); $$
);
