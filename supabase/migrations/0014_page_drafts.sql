-- In-progress celebration drafts. One row per creator — every autosave
-- upserts onto the same key so we keep a single live draft per user.
-- The draft is opaque JSON (the editor's PageDraft shape) so future field
-- additions don't need a migration here.

create table if not exists public.page_drafts (
  creator_id uuid primary key references public.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.page_drafts enable row level security;

drop policy if exists page_drafts_owner_read   on public.page_drafts;
drop policy if exists page_drafts_owner_insert on public.page_drafts;
drop policy if exists page_drafts_owner_update on public.page_drafts;
drop policy if exists page_drafts_owner_delete on public.page_drafts;

create policy page_drafts_owner_read on public.page_drafts
  for select to authenticated using (creator_id = auth.uid());

create policy page_drafts_owner_insert on public.page_drafts
  for insert to authenticated with check (creator_id = auth.uid());

create policy page_drafts_owner_update on public.page_drafts
  for update to authenticated using (creator_id = auth.uid());

create policy page_drafts_owner_delete on public.page_drafts
  for delete to authenticated using (creator_id = auth.uid());
