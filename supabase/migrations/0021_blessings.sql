-- 52 Weeks of Blessings — a year-long gift. A creator buys a plan for a
-- celebration; the celebrant redeems it with their email (72h window) and then
-- receives one blessing/prayer by email each week for a year.

do $$ begin
  create type blessing_status as enum (
    'pending_payment',     -- created, awaiting the Paystack charge
    'awaiting_redemption', -- paid; share link is live, 72h to redeem
    'active',              -- celebrant redeemed; weekly sends running
    'completed',           -- all 52 weeks sent
    'expired',             -- redeem window passed unredeemed
    'cancelled'            -- celebrant unsubscribed
  );
exception when duplicate_object then null; end $$;

create table if not exists public.blessing_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  celebration_id uuid not null references public.celebrations(id) on delete cascade,
  creator_id uuid references public.users(id),
  recipient_name text not null,
  sender_name text,
  tone text not null default 'prayer',          -- 'prayer' | 'affirmation' | 'scripture'
  status blessing_status not null default 'pending_payment',
  amount_kobo bigint not null,
  paystack_reference text unique,
  redeem_token text unique not null,
  redeem_expires_at timestamptz,                -- set to now()+72h when paid
  recipient_email text,
  opted_in boolean not null default false,
  started_at timestamptz,                       -- when week 1 went out
  weeks_total int not null default 52,
  created_at timestamptz not null default now()
);
create index if not exists blessing_plans_celebration_idx on public.blessing_plans(celebration_id);

-- A celebration can hold only one *paid* blessing plan — it's a one-time
-- keepsake gift, not a subscription. Abandoned 'pending_payment' attempts may
-- stack harmlessly; the moment one is paid, no second payment can settle.
create unique index if not exists blessing_plans_one_paid_per_celebration
  on public.blessing_plans(celebration_id)
  where status in ('awaiting_redemption', 'active', 'completed');

create table if not exists public.blessing_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null references public.blessing_plans(id) on delete cascade,
  week_no int not null,
  source text not null default 'ai',            -- 'ai' | 'wall'
  title text not null,
  body text not null,
  scheduled_for date not null,
  sent_at timestamptz,
  resend_id text,
  status text not null default 'scheduled',     -- 'scheduled' | 'sent' | 'failed'
  unique (plan_id, week_no)
);
-- The weekly cron scans for due, still-scheduled rows.
create index if not exists blessing_messages_due_idx
  on public.blessing_messages(scheduled_for)
  where status = 'scheduled';

-- All access is through service-role API routes (redeem token, cron, webhook)
-- or server components that verify ownership first. Lock out anon/auth roles.
alter table public.blessing_plans enable row level security;
alter table public.blessing_messages enable row level security;
