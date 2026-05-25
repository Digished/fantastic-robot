-- 52 Weeks of Blessings now starts the moment payment settles: the recipient's
-- email is captured at checkout, so there's no claim step, no share-link
-- redemption, and no expiry window. Retire the schema that backed the old flow.

-- 1. The redeem-expiry column is no longer written or read.
alter table public.blessing_plans drop column if exists redeem_expires_at;

-- 2. Retire the now-dead 'awaiting_redemption' and 'expired' statuses. Postgres
--    can't drop enum values in place, so move any legacy rows off them, swap the
--    type, and recreate the partial "one paid plan per celebration" index that
--    referenced the old value. Guarded so the migration is safe to re-run.
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'blessing_status'
      and e.enumlabel in ('awaiting_redemption', 'expired')
  ) then
    -- Legacy paid-but-unclaimed / expired plans have no place in the new model.
    update public.blessing_plans
      set status = 'cancelled'
      where status in ('awaiting_redemption', 'expired');

    -- The index predicate references the enum, so it must go before the swap.
    drop index if exists public.blessing_plans_one_paid_per_celebration;

    alter type public.blessing_status rename to blessing_status_old;
    create type public.blessing_status as enum (
      'pending_payment',
      'active',
      'completed',
      'cancelled'
    );

    alter table public.blessing_plans
      alter column status drop default,
      alter column status type public.blessing_status
        using status::text::public.blessing_status,
      alter column status set default 'pending_payment';

    drop type public.blessing_status_old;

    create unique index blessing_plans_one_paid_per_celebration
      on public.blessing_plans(celebration_id)
      where status in ('active', 'completed');
  end if;
end $$;
