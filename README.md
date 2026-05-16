# Spendbox

Beautiful, mobile-first celebration pages with group gifting. Built for Nigeria.

See [`SPEC.md`](./SPEC.md) for the full product and engineering spec.

## Local dev

```bash
cp .env.example .env.local         # fill in Supabase + Paystack keys
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project in `eu-west-1`.
2. In Auth settings, disable "Confirm email".
3. Run the SQL in `supabase/migrations/0001_init.sql` then `0002_cron_close_expired.sql`.
4. Create a public storage bucket named `celebrations` for cover photos and media.

## Paystack setup

1. Sign up at paystack.com, get test secret + public keys.
2. Set the webhook URL to `https://<your-domain>/api/paystack/webhook` and copy the secret.
3. Request access to the **Transfers** API (required to pay out to recipients).

## Phases

- **0** Foundation, auth, base layout — *done*
- 1 Create celebration + Paystack account resolution
- 2 Public wall (read)
- 3 Messages (text / audio / video)
- 4 Contributions + Paystack charge + webhook
- 5 Deadline close + claim + Paystack transfer
- 6 Polish, OG images, Lighthouse, Sentry
