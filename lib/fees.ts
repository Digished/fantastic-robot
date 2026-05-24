// Single source of truth for fee math. Amounts in kobo (bigint).
// Platform fee is 5% on top of the contributor's chosen amount.
// Paystack processing fees are absorbed by the platform.

export const PLATFORM_FEE_BPS = 500n; // 5.00%
export const MIN_CONTRIBUTION_KOBO = 50_000n; // ₦500
export const PAGE_CREATION_FEE_KOBO = 50_000n; // ₦500 to publish a page
export const BLESSINGS_FEE_KOBO = 500_000n; // ₦5,000 for 52 Weeks of Blessings

export function computeCharge(amountKobo: bigint) {
  if (amountKobo < MIN_CONTRIBUTION_KOBO) {
    throw new Error("amount below minimum");
  }
  const platformFee = (amountKobo * PLATFORM_FEE_BPS) / 10_000n;
  const grossCharge = amountKobo + platformFee; // what the contributor pays
  const netToPool = amountKobo;                 // what credits the recipient pool
  return { platformFee, grossCharge, netToPool };
}
