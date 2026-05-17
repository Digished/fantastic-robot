-- Contributor session id lets a contributor edit/delete their own messages
-- without an account. The id lives in an HTTP cookie scoped to the device.
alter table public.messages
  add column if not exists contributor_session_id text;

create index if not exists messages_contributor_session_idx
  on public.messages(contributor_session_id);

-- Six more interactive surprise kinds added to the existing enum.
alter type interactive_kind add value if not exists 'scratch';
alter type interactive_kind add value if not exists 'polaroid';
alter type interactive_kind add value if not exists 'balloons';
alter type interactive_kind add value if not exists 'jar';
alter type interactive_kind add value if not exists 'sparkler';
alter type interactive_kind add value if not exists 'toast';
