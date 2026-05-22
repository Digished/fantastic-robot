-- Unclaimed-gift rule: a recurring page renews after a short grace even if its
-- gift was never claimed, so it never gets stuck on a past year. The finished
-- year is snapshotted into celebration_cycles with its pending payout status
-- intact, which keeps that gift claimable from history (see the claim route's
-- per-cycle path). No money moves automatically.

create or replace function public.renew_recurring_celebrations() returns void as $func$
declare r record;
begin
  for r in
    select * from public.celebrations
    where is_recurring = true
      and claimable_at < now() - interval '3 days'
  loop
    insert into public.celebration_cycles
      (celebration_id, cycle, celebration_date, total_raised_kobo, total_gross_kobo,
       contributor_count, payout_status, payout_completed_at)
    values
      (r.id, r.current_cycle, r.celebration_date, r.total_raised_kobo, r.total_gross_kobo,
       r.contributor_count, r.payout_status, r.payout_completed_at)
    on conflict (celebration_id, cycle) do nothing;

    update public.celebrations
       set current_cycle      = current_cycle + 1,
           celebration_date    = celebration_date + interval '1 year',
           status              = 'active',
           total_raised_kobo   = 0,
           total_gross_kobo    = 0,
           contributor_count   = 0,
           payout_status       = 'pending',
           payout_claimed_at   = null,
           payout_completed_at = null,
           paystack_transfer_code = null
     where id = r.id;
  end loop;
end;
$func$ language plpgsql;
