-- Track who referred each user (set on signup via an invite link/email).
-- Powers the "invite N friends" onboarding goal, which counts genuine signups
-- rather than friends you added who already had accounts.
alter table public.users
  add column if not exists referred_by uuid references public.users(id) on delete set null;

create index if not exists users_referred_by_idx on public.users(referred_by);
