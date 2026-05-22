-- Personal (self) pages are always a surprise. Earlier builds briefly let the
-- owner unseal one from the editor; this re-seals any that slipped through and
-- makes the rule structural so the flag can't drift again.

-- 1) Re-seal existing personal pages.
update public.celebrations
  set is_sealed = true
  where is_self = true and is_sealed = false;

-- 2) Harden the wall-read policy: a self page stays sealed until its date no
--    matter what is_sealed says. Non-self pages keep the old behaviour.
drop policy if exists messages_public_read on public.messages;
create policy messages_public_read on public.messages
  for select to anon, authenticated using (
    deleted_at is null
    and exists (
      select 1 from public.celebrations c
      where c.id = messages.celebration_id
        and (
          (c.is_sealed = false and c.is_self = false)
          or now() >= c.claimable_at
        )
    )
  );
