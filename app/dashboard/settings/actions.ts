"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { profileBankSchema, shippingAddressesSchema } from "@/lib/validation/schemas";

export type ProfileState = { error?: string; ok?: boolean };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const raw = (formData.get("displayName") as string | null)?.trim() ?? "";
  if (raw.length > 60) return { error: "Name is too long (max 60 chars)." };
  // Empty string means "use email prefix" — store as null.
  const displayName = raw.length === 0 ? null : raw;

  const update: Record<string, unknown> = { display_name: displayName };

  // Avatar (optional) — the client uploads to storage and passes the path.
  const avatarPath = (formData.get("avatarPath") as string | null)?.trim();
  if (avatarPath) update.avatar_path = avatarPath;

  // Bank details (optional). Only re-verify with Paystack when they change,
  // and reset the cached transfer recipient so payouts use the new account.
  const bankCode = (formData.get("bankCode") as string | null)?.trim() ?? "";
  const accountNumber = (formData.get("accountNumber") as string | null)?.trim() ?? "";
  if (bankCode && accountNumber) {
    const parsed = profileBankSchema.safeParse({ bankCode, accountNumber });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const { data: current } = await supabase
      .from("users")
      .select("bank_code, account_number")
      .eq("id", user.id)
      .maybeSingle();

    const changed =
      current?.bank_code !== parsed.data.bankCode ||
      current?.account_number !== parsed.data.accountNumber;

    if (changed) {
      try {
        const { data } = await paystack.resolveAccount(
          parsed.data.accountNumber,
          parsed.data.bankCode,
        );
        update.bank_code = parsed.data.bankCode;
        update.account_number = parsed.data.accountNumber;
        update.account_name = data.account_name;
        update.bank_verified_at = new Date().toISOString();
        update.paystack_recipient_code = null;
      } catch (err) {
        const msg = err instanceof PaystackError ? err.message : "Could not verify account";
        return { error: `Bank check failed: ${msg}` };
      }
    }
  }

  const addressesRaw = (formData.get("shippingAddresses") as string | null)?.trim();
  if (addressesRaw) {
    try {
      const parsed = shippingAddressesSchema.safeParse(JSON.parse(addressesRaw));
      if (parsed.success) update.shipping_addresses = parsed.data;
    } catch { /* ignore malformed JSON */ }
  }

  const { error } = await supabase.from("users").update(update).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
