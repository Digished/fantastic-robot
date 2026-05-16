// Cached Nigerian bank list with a 12h TTL. Avoids an extra Paystack roundtrip
// on every create-celebration page load.
import { paystack } from "./client";

type Bank = { name: string; code: string; slug: string };
let cache: { banks: Bank[]; expires: number } | null = null;

export async function getBanks(): Promise<Bank[]> {
  if (cache && cache.expires > Date.now()) return cache.banks;
  const { data } = await paystack.listBanks();
  cache = { banks: data, expires: Date.now() + 12 * 3600 * 1000 };
  return data;
}
