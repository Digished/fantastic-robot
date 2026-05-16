-- Spendbox initial schema. Money in kobo as bigint. Idempotent.

create extension if not exists pgcrypto with schema extensions;

-- ── enums ────────────────────────────────────────────────────────────
do $$ begin
  create type event_type as enum (
    'birthday','graduation','wedding','appreciation',
    'farewell','baby_shower','surprise_gift','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type celebration_status as enum ('active','closed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_kind as enum ('none','audio','video','image');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contribution_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

-- ── users (mirror of auth.users) ─────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- ── celebrations ─────────────────────────────────────────────────────
-- deadline_at and claimable_at are kept in sync by a trigger because
-- timestamptz arithmetic is STABLE (not IMMUTABLE) and so isn't allowed
-- inside a generated column.
create table if not exists public.celebrations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  creator_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  recipient_name text not null,
  event_type event_type not null,
  cover_photo_path text,
  message_from_creator text,
  celebration_date timestamptz not null,
  deadline_at  timestamptz not null,
  claimable_at timestamptz not null,
  timezone text not null default 'Africa/Lagos',
  status celebration_status not null default 'active',
  recipient_bank_code text not null,
  recipient_account_number text not null,
  recipient_account_name text not null,
  paystack_recipient_code text,
  total_raised_kobo bigint not null default 0,
  total_gross_kobo  bigint not null default 0,
  contributor_count int    not null default 0,
  payout_status text not null default 'pending'
    check (payout_status in ('pending','processing','paid','failed')),
  payout_claimed_at timestamptz,
  payout_completed_at timestamptz,
  paystack_transfer_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists celebrations_creator_idx  on public.celebrations(creator_id);
create index if not exists celebrations_deadline_idx on public.celebrations(deadline_at) where status = 'active';

-- ── messages ─────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  celebration_id uuid not null references public.celebrations(id) on delete cascade,
  contributor_name text not null,
  contributor_email text,
  contributor_phone text,
  is_anonymous boolean not null default false,
  body text,
  media_kind media_kind not null default 'none',
  media_path text,
  media_duration_ms int,
  contribution_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or media_kind <> 'none')
);
create index if not exists messages_wall_idx on public.messages(celebration_id, created_at desc)
  where deleted_at is null;

-- ── contributions ────────────────────────────────────────────────────
create table if not exists public.contributions (
  id uuid primary key default extensions.gen_random_uuid(),
  celebration_id uuid not null references public.celebrations(id) on delete restrict,
  contributor_name text not null,
  contributor_email text not null,
  contributor_phone text,
  is_anonymous boolean not null default false,
  amount_gross_kobo  bigint not null check (amount_gross_kobo >= 50000),
  platform_fee_kobo  bigint not null,
  paystack_fee_kobo  bigint not null default 0,
  amount_net_kobo    bigint not null,
  status contribution_status not null default 'pending',
  paystack_reference text not null unique,
  paystack_transaction_id bigint unique,
  idempotency_key text not null unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contributions_celebration_idx on public.contributions(celebration_id, status);

do $$ begin
  alter table public.messages
    add constraint messages_contribution_fk
    foreign key (contribution_id) references public.contributions(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── payouts ──────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id uuid primary key default extensions.gen_random_uuid(),
  celebration_id uuid not null unique references public.celebrations(id) on delete restrict,
  amount_kobo bigint not null,
  paystack_transfer_code text not null unique,
  paystack_reference text not null unique,
  status text not null,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  raw_response jsonb
);

-- ── webhook audit ────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  id bigserial primary key,
  paystack_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  error text
);

-- ── triggers ─────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

drop trigger if exists celebrations_touch on public.celebrations;
create trigger celebrations_touch
  before update on public.celebrations
  for each row execute function public.touch_updated_at();

-- Keep deadline_at / claimable_at in sync with celebration_date.
create or replace function public.sync_celebration_dates() returns trigger as $$
begin
  new.deadline_at  := new.celebration_date - interval '72 hours';
  new.claimable_at := new.celebration_date;
  return new;
end;
$$ language plpgsql;

drop trigger if exists celebrations_sync_dates on public.celebrations;
create trigger celebrations_sync_dates
  before insert or update of celebration_date on public.celebrations
  for each row execute function public.sync_celebration_dates();

create or replace function public.bump_celebration_totals() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status <> 'paid' and new.status = 'paid') then
    update public.celebrations set
      total_raised_kobo = total_raised_kobo + new.amount_net_kobo,
      total_gross_kobo  = total_gross_kobo  + new.amount_gross_kobo,
      contributor_count = contributor_count + 1
    where id = new.celebration_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists contributions_totals on public.contributions;
create trigger contributions_totals
  after update on public.contributions
  for each row execute function public.bump_celebration_totals();

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.users          enable row level security;
alter table public.celebrations   enable row level security;
alter table public.messages       enable row level security;
alter table public.contributions  enable row level security;
alter table public.payouts        enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists users_self_read  on public.users;
drop policy if exists users_self_write on public.users;
create policy users_self_read  on public.users for select to authenticated using (id = auth.uid());
create policy users_self_write on public.users for update to authenticated using (id = auth.uid());

drop policy if exists celebrations_public_read     on public.celebrations;
drop policy if exists celebrations_creator_insert  on public.celebrations;
drop policy if exists celebrations_creator_update  on public.celebrations;
create policy celebrations_public_read on public.celebrations
  for select to anon, authenticated using (status <> 'archived');
create policy celebrations_creator_insert on public.celebrations
  for insert to authenticated with check (creator_id = auth.uid());
create policy celebrations_creator_update on public.celebrations
  for update to authenticated using (creator_id = auth.uid());

drop policy if exists messages_public_read    on public.messages;
drop policy if exists messages_anon_insert    on public.messages;
drop policy if exists messages_creator_update on public.messages;
create policy messages_public_read on public.messages
  for select to anon, authenticated using (deleted_at is null);
create policy messages_anon_insert on public.messages
  for insert to anon, authenticated with check (true);
create policy messages_creator_update on public.messages
  for update to authenticated using (
    exists (select 1 from public.celebrations c
      where c.id = messages.celebration_id and c.creator_id = auth.uid())
  );

drop view if exists public.contributions_public;
create view public.contributions_public
  with (security_invoker = true) as
  select id, celebration_id, contributor_name, is_anonymous,
         amount_gross_kobo, amount_net_kobo, paid_at
  from public.contributions
  where status = 'paid';
grant select on public.contributions_public to anon, authenticated;
