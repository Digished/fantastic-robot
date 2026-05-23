-- Self-owned, sealed, recurring celebration pages.
--
--  • A user can create a page for THEMSELVES (is_self). Bank details live on
--    the user profile, not the page, and are reused across pages + years.
--  • Sealed pages hide the wall and all totals from EVERYONE until the date.
--  • Recurring (birthday) pages roll forward one year at a time, snapshotting
--    each completed year into celebration_cycles so history is preserved.
-- Idempotent.

-- ── users: profile-level bank + avatar + cached transfer recipient ──────
alter table public.users
  add column if not exists bank_code text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists bank_verified_at timestamptz,
  add column if not exists avatar_path text,
  add column if not exists paystack_recipient_code text;

-- ── celebrations: self / sealed / recurring + cycle counter ─────────────
alter table public.celebrations
  add column if not exists is_self      boolean not null default false,
  add column if not exists is_sealed    boolean not null default false,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists current_cycle int   not null default 1;

-- Self-pages carry no per-page bank; the claim reads it from the profile.
alter table public.celebrations alter column recipient_bank_code      drop not null;
alter table public.celebrations alter column recipient_account_number drop not null;
alter table public.celebrations alter column recipient_account_name   drop not null;

create index if not exists celebrations_payout_status_idx on public.celebrations(payout_status);

-- ── cycle stamping so each year's messages/contributions are separable ──
alter table public.messages      add column if not exists cycle int not null default 1;
alter table public.contributions add column if not exists cycle int not null default 1;
create index if not exists messages_wall_cycle_idx
  on public.messages(celebration_id, cycle, created_at desc) where deleted_at is null;

-- ── payouts: one per (celebration, cycle) instead of per celebration ────
alter table public.payouts add column if not exists cycle int not null default 1;
do $do$ begin
  alter table public.payouts drop constraint payouts_celebration_id_key;
exception when undefined_object then null; end $do$;
do $do$ begin
  alter table public.payouts add constraint payouts_celebration_cycle_key unique (celebration_id, cycle);
exception when duplicate_object then null; end $do$;

-- ── per-cycle history snapshot ──────────────────────────────────────────
create table if not exists public.celebration_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  celebration_id uuid not null references public.celebrations(id) on delete cascade,
  cycle int not null,
  celebration_date timestamptz not null,
  total_raised_kobo bigint not null default 0,
  total_gross_kobo  bigint not null default 0,
  contributor_count int    not null default 0,
  payout_status text not null default 'pending',
  payout_completed_at timestamptz,
  archived_at timestamptz not null default now(),
  unique (celebration_id, cycle)
);
create index if not exists celebration_cycles_idx on public.celebration_cycles(celebration_id);

alter table public.celebration_cycles enable row level security;
drop policy if exists celebration_cycles_public_read on public.celebration_cycles;
create policy celebration_cycles_public_read on public.celebration_cycles
  for select to anon, authenticated using (true);

-- ── seal the wall at the database ───────────────────────────────────────
-- A message is only readable once its page is unsealed OR the date arrives.
drop policy if exists messages_public_read on public.messages;
create policy messages_public_read on public.messages
  for select to anon, authenticated using (
    deleted_at is null
    and exists (
      select 1 from public.celebrations c
      where c.id = messages.celebration_id
        and (c.is_sealed = false or now() >= c.claimable_at)
    )
  );

-- ── annual renewal ──────────────────────────────────────────────────────
-- Once a recurring page's year is fully settled (paid/failed, or nothing was
-- raised), archive it and roll the live row forward to next year. The
-- celebration_date update fires sync_celebration_dates to recompute the gates.
create or replace function public.renew_recurring_celebrations() returns void as $func$
declare r record;
begin
  for r in
    select * from public.celebrations
    where is_recurring = true
      and claimable_at < now() - interval '72 hours'
      and (payout_status in ('paid','failed') or total_raised_kobo = 0)
  loop
    insert into public.celebration_cycles
      (celebration_id, cycle, celebration_date, total_raised_kobo, total_gross_kobo,
       contributor_count, payout_status, payout_completed_at)
    values
      (r.id, r.current_cycle, r.celebration_date, r.total_raised_kobo, r.total_gross_kobo,
       r.contributor_count, r.payout_status, r.payout_completed_at)
    on conflict (celebration_id, cycle) do nothing;

    update public.celebrations
       set current_cycle      = current_cycle + 1,
           celebration_date    = celebration_date + interval '1 year',
           status              = 'active',
           total_raised_kobo   = 0,
           total_gross_kobo    = 0,
           contributor_count   = 0,
           payout_status       = 'pending',
           payout_claimed_at   = null,
           payout_completed_at = null,
           paystack_transfer_code = null
     where id = r.id;
  end loop;
end;
$func$ language plpgsql;

select cron.schedule(
  'spendbox-renew-recurring',
  '0 * * * *',
  $cron$ select public.renew_recurring_celebrations(); $cron$
);
