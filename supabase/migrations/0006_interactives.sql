-- Interactive surprise cards. A message can wrap its body text in an
-- interactive presentation that the celebrant unlocks by tapping.

do $$ begin
  create type interactive_kind as enum ('none','gift','letter','cake','heart');
exception when duplicate_object then null; end $$;

alter table public.messages
  add column if not exists interactive_kind    interactive_kind not null default 'none',
  add column if not exists interactive_payload jsonb;

-- A message can now be valid with just an interactive (body still optional).
-- Existing CHECK constraint already allows body OR media; interactives count
-- as media for the purpose of "must contain something" — enforced at app layer.
