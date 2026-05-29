-- Phase 2: friends & birthdays social layer.
--
-- Adds usernames + a personal invite token to users, a friend graph
-- (requests + symmetric friendships), email invites, and an idempotency log
-- for birthday reminder emails. Mirrors the RLS conventions in 0001_init.sql /
-- 0014_page_drafts.sql: enable RLS + owner-scoped policies on auth.uid().
-- Cross-user reads and symmetric writes happen via the service-role client.

-- ── users: username + personal invite link ──────────────────────────────
alter table public.users
  add column if not exists username text,
  add column if not exists invite_token text;

create unique index if not exists users_username_lower_idx
  on public.users (lower(username));
create unique index if not exists users_invite_token_idx
  on public.users (invite_token);

-- ── friend_requests (search-based adds go through approve) ───────────────
create table if not exists public.friend_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friend_requests_addressee_idx
  on public.friend_requests(addressee_id) where status = 'pending';
create index if not exists friend_requests_requester_idx
  on public.friend_requests(requester_id);

-- ── friendships: two rows per friendship (a→b and b→a) ───────────────────
create table if not exists public.friendships (
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ── friend_invites: emailed invites (recipient may have no account yet) ──
create table if not exists public.friend_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  inviter_id uuid not null references public.users(id) on delete cascade,
  email text,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending','accepted','expired')),
  accepted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists friend_invites_inviter_idx on public.friend_invites(inviter_id);

-- ── birthday_reminder_log: idempotency for the daily reminder cron ───────
create table if not exists public.birthday_reminder_log (
  recipient_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  birthday_year int not null,
  offset_days int not null,
  sent_at timestamptz not null default now(),
  primary key (recipient_id, friend_id, birthday_year, offset_days)
);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_invites enable row level security;
alter table public.birthday_reminder_log enable row level security;

create policy friend_requests_party_read on public.friend_requests
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated with check (requester_id = auth.uid());
create policy friend_requests_party_update on public.friend_requests
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy friendships_self_read on public.friendships
  for select to authenticated using (user_id = auth.uid() or friend_id = auth.uid());

create policy friend_invites_owner_read on public.friend_invites
  for select to authenticated using (inviter_id = auth.uid());
create policy friend_invites_owner_insert on public.friend_invites
  for insert to authenticated with check (inviter_id = auth.uid());

-- friendships / friend_invites accepts / reminder log are written by the
-- service-role client in server actions, so they need no write policies.
