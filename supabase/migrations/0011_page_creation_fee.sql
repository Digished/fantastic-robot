-- ₦500 page creation fee — gates publishing of new pages.
-- Existing pages are grandfathered as paid; new rows default to unpaid until
-- the creator completes Paystack checkout.

ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS is_paid_for_creation boolean NOT NULL DEFAULT true;

ALTER TABLE celebrations
  ALTER COLUMN is_paid_for_creation SET DEFAULT false;

ALTER TABLE celebrations
  ADD COLUMN IF NOT EXISTS creation_payment_reference text;

CREATE INDEX IF NOT EXISTS celebrations_creation_payment_ref_idx
  ON celebrations(creation_payment_reference)
  WHERE creation_payment_reference IS NOT NULL;
