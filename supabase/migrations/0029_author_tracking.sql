-- Tag wall posts and gifts with the signed-in author (when there is one), so we
-- can credit onboarding goals like "send a message/gift to a friend". Anonymous
-- contributions simply leave this null.
alter table public.messages
  add column if not exists author_user_id uuid references public.users(id) on delete set null;
alter table public.contributions
  add column if not exists author_user_id uuid references public.users(id) on delete set null;

create index if not exists messages_author_idx on public.messages(author_user_id) where author_user_id is not null;
create index if not exists contributions_author_idx on public.contributions(author_user_id) where author_user_id is not null;
