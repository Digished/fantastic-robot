# Spendbox — Product & Engineering Spec

Spendbox is a mobile-first web app for creating collaborative celebration pages.
Friends drop messages (text, audio, video) on a digital wall and optionally
contribute money as a group gift. Optimized for WhatsApp sharing.

---

## 1. Product summary

- **Creator** builds a celebration page for someone else (the **recipient**).
- **Contributors** open the link, leave a card on the wall, optionally chip in.
- On the **celebration date** the recipient claims the pooled gift in one tap.
- Funds held in escrow on Spendbox's Paystack account; paid out via Paystack
  Transfer to the pre-locked recipient bank account.

## 2. Lifecycle

```
                  ┌── 72h ──┐                           ┌── 72h ──┐
Created ─► Active ──────────► Closed ───────────────────────────► Claimable
       (collecting)         deadline_at                  celebration_date
```

- `celebration_date` — required, Africa/Lagos, must be ≥ `now() + 96h`.
- `deadline_at` = `celebration_date − 72h` (auto-derived).
- `claimable_at` = `celebration_date`. "Receive gift" button only renders on/after this moment.
- The 72h gap doubles as Paystack settlement clearing, so transfers go through instantly when clicked.

## 3. Roles

| Role | Authenticated? | What they can do |
|---|---|---|
| Creator | Yes (email + password, no confirmation email) | Create page, set bank details, delete messages, copy claim link |
| Contributor | No (anonymous) | Post card (text / audio ≤20s / video ≤15s), contribute ≥₦500, anonymous toggle |
| Recipient | No (no account) | On `celebration_date`, click "Receive gift" — money transfers to the locked bank account |

## 4. Money model

- **Escrow.** All charges land in Spendbox's Paystack platform balance.
- **5% platform fee** added **on top** of the contributor's chosen amount.
  Contributor pays `amount + 5%`; recipient pool receives `amount`.
- **Paystack processing fees** absorbed by the platform.
- **Minimum contribution:** ₦500.
- **Payout:** single Paystack Transfer to the pre-resolved recipient account on claim.
- **All amounts stored in kobo as `bigint`.** No floats.

## 5. Recipient identity & security

- Creator inputs `recipient_name`, `bank_code`, `account_number`.
- Spendbox calls Paystack `/bank/resolve` → must return matching account name.
- If resolution fails → **page creation is blocked**.
- `recipient_account_*` fields are **immutable** after creation.
- No recipient email collected. No emails sent. Creator shares the link manually (WhatsApp).
- The claim button transfers only to the locked account, so anyone with the link clicking it still pays the right person.

## 6. Wall

- Public by unguessable slug (`nanoid(10)`).
- Cards: text, audio (≤20s), video (≤15s), optional image cover.
- One-tap card creation; anonymous toggle hides name as "Someone special".
- Creator can soft-delete any card.
- Realtime updates via Supabase Realtime.

## 7. Media

- **Record in browser** (`MediaRecorder`) OR upload from gallery.
- **Client-side compression only** for MVP:
  - Audio: `opus` ~32 kbps mono, hard-capped at 20s.
  - Video: `vp9` ~600 kbps, 480p, hard-capped at 15s.
- Reject post-compression files > 10 MB.
- Direct-to-Supabase Storage via signed upload URLs.

## 8. Stack

- **Next.js 15** App Router, RSC, Server Actions
- **TypeScript** strict
- **Tailwind CSS + shadcn/ui**
- **Supabase** (Postgres, Auth, Storage, Realtime) — `eu-west-1`
- **Paystack** (Charge, Bank Resolve, Transfer Recipients, Transfers)
- **Zod**, **React Hook Form**, **TanStack Query**, **jose** (JWT)
- **Vercel** single project — `spendbox`

## 9. Brand

- **Palette:** cream `#FBF6EE`, terracotta `#D9613C`, deep plum `#3B1F2B`, soft gold `#E8B84B`.
- **Type:** Instrument Serif (headings), Inter (body).
- Mobile-first, 100dvh layouts, generous whitespace, no clutter.

## 10. Database schema (high-level)

See `supabase/migrations/0001_init.sql` for canonical DDL.

- `users` — mirrors `auth.users`.
- `celebrations` — page, recipient bank details, totals, payout state.
- `messages` — wall cards (text + optional media).
- `contributions` — money rows with idempotency keys.
- `payouts` — one row per successful transfer.
- `webhook_events` — Paystack event audit & replay protection.

## 11. API surface

Server Actions for writes, route handlers only when needed (external webhook,
file uploads).

| Endpoint | Method | Purpose |
|---|---|---|
| `createCelebration` (action) | — | Resolve account → insert page |
| `postMessage` (action) | — | Anonymous insert into messages |
| `deleteMessage` (action) | — | Creator soft-delete |
| `/api/paystack/resolve-account` | POST | Bank account name lookup |
| `/api/paystack/init` | POST | Init Paystack transaction |
| `/api/paystack/webhook` | POST | Verify HMAC → flip contribution status |
| `/api/paystack/claim` | POST | Recipient triggers transfer |
| `/api/media/sign-upload` | POST | Signed Supabase Storage upload URL |

## 12. Security

- HMAC verify Paystack webhook (`x-paystack-signature`).
- Webhook events deduped by `paystack_event_id` UNIQUE.
- Contributions deduped by `paystack_reference` UNIQUE + `idempotency_key` UNIQUE.
- Payout state machine: `pending → processing → paid|failed`. One payout row per celebration enforced by UNIQUE.
- All money mutations inside Postgres transactions with row locks.
- RLS: `anon` can `select` published pages and non-deleted messages; only service role writes contributions/payouts.

## 13. Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold, Tailwind, Supabase, auth, layout | ✅ done |
| 1 | Create celebration flow + Paystack account resolution | ✅ done |
| 2 | Public wall (read) + share + claim button | ✅ done |
| 3 | Messages (text / audio / video) with caps | ✅ done |
| 4 | Contributions + Paystack charge + webhook | ✅ done |
| 5 | Deadline close + claim + Paystack transfer | ✅ done |
| 6 | OG images, creator delete, storage bucket migration | ✅ done |

## Post-MVP backlog
- Birthday reminders cron (column already collected).
- Sentry + observability.
- Refund / dispute reconciliation flow.
- Optional Supabase Edge Function for server-side ffmpeg compression fallback.
- Lighthouse pass on a real device + Vercel preview.
