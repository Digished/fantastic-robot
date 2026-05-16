-- Spendbox initial schema.
-- Money is stored in kobo as bigint. Never use floats for money.

create extension if not exists "pgcrypto";

-- ─── enums ────────────────────────────────────────────────────────────
create type event_type as enum (
  'birthday','graduation','wedding','appreciation',
  'farewell','baby_shower','surprise_gift','other'
);
create type celebration_status as enum ('active','closed','archived');
create type media_kind as enum ('none','audio','video','image');
create type contribution_status as enum ('pending','paid','failed','refunded');

-- ─── users (mirror of auth.users) ─────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- ─── celebrations ─────────────────────────────────────────────────────
create table public.celebrations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  creator_id uuid not null references public.users(id) on delete restrict,

  title text not null,
  recipient_name text not null,
  event_type event_type not null,
  cover_photo_path text,
  message_from_creator text,

  celebration_date timestamptz not null,
  deadline_at timestamptz generated always as (celebration_date - interval '72 hours') stored,
  claimable_at timestamptz generated always as (celebration_date) stored,
  timezone text not null default 'Africa/Lagos',
  status celebration_status not null default 'active',

  -- Recipient payout details (locked at creation, immutable).
  recipient_bank_code text not null,
  recipient_account_number text not null,
  recipient_account_name text not null,
  paystack_recipient_code text,

  -- Denormalized totals (authoritative via contributions sum, kept in sync via trigger).
  total_raised_kobo bigint not null default 0,
  total_gross_kobo  bigint not null default 0,
  contributor_count int    not null default 0,

  -- Payout state machine.
  payout_status text not null default 'pending'
    check (payout_status in ('pending','processing','paid','failed')),
  payout_claimed_at timestamptz,
  payout_completed_at timestamptz,
  paystack_transfer_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index celebrations_creator_idx on public.celebrations(creator_id);
create index celebrations_deadline_idx on public.celebrations(deadline_at) where status = 'active';

-- ─── messages (wall cards) ────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
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
create index messages_wall_idx on public.messages(celebration_id, created_at desc)
  where deleted_at is null;

-- ─── contributions ────────────────────────────────────────────────────
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
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
create index contributions_celebration_idx on public.contributions(celebration_id, status);

alter table public.messages
  add constraint messages_contribution_fk
  foreign key (contribution_id) references public.contributions(id) on delete set null;

-- ─── payouts ──────────────────────────────────────────────────────────
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  celebration_id uuid not null unique references public.celebrations(id) on delete restrict,
  amount_kobo bigint not null,
  paystack_transfer_code text not null unique,
  paystack_reference text not null unique,
  status text not null,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  raw_response jsonb
);

-- ─── webhook audit / replay protection ───────────────────────────────
create table public.webhook_events (
  id bigserial primary key,
  paystack_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  error text
);

-- ─── triggers ─────────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

create trigger celebrations_touch
  before update on public.celebrations
  for each row execute function touch_updated_at();

-- Keep celebration totals in sync as contributions are marked paid.
create or replace function bump_celebration_totals() returns trigger as $$
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

create trigger contributions_totals
  after update on public.contributions
  for each row execute function bump_celebration_totals();

-- ─── RLS ──────────────────────────────────────────────────────────────
alter table public.users        enable row level security;
alter table public.celebrations enable row level security;
alter table public.messages     enable row level security;
alter table public.contributions enable row level security;
alter table public.payouts      enable row level security;
alter table public.webhook_events enable row level security;

-- users: a user reads/updates their own profile.
create policy users_self_read on public.users
  for select to authenticated using (id = auth.uid());
create policy users_self_write on public.users
  for update to authenticated using (id = auth.uid());

-- celebrations: public read for non-archived; creator writes.
create policy celebrations_public_read on public.celebrations
  for select to anon, authenticated using (status <> 'archived');
create policy celebrations_creator_insert on public.celebrations
  for insert to authenticated with check (creator_id = auth.uid());
create policy celebrations_creator_update on public.celebrations
  for update to authenticated using (creator_id = auth.uid());

-- messages: public read for non-deleted; anon can insert; creator can soft-delete.
create policy messages_public_read on public.messages
  for select to anon, authenticated using (deleted_at is null);
create policy messages_anon_insert on public.messages
  for insert to anon, authenticated with check (true);
create policy messages_creator_update on public.messages
  for update to authenticated using (
    exists (
      select 1 from public.celebrations c
      where c.id = messages.celebration_id and c.creator_id = auth.uid()
    )
  );

-- contributions: no direct anon access (server-side service role only writes).
-- A redacted public view exposes the safe columns.
create view public.contributions_public as
  select id, celebration_id, contributor_name, is_anonymous,
         amount_gross_kobo, amount_net_kobo, paid_at
  from public.contributions
  where status = 'paid';
grant select on public.contributions_public to anon, authenticated;

-- payouts & webhook_events: service role only (default-deny since RLS is on with no policies).
