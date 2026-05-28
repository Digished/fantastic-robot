"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Loader2, User, MapPin } from "lucide-react";
import { updateProfile, type ProfileState } from "./actions";
import { uploadWithProgress } from "@/lib/upload";
import { AddressFormFields, BLANK_ADDRESS, type AddressDraft } from "@/components/address-form-fields";
import type { ShippingAddress } from "@/lib/validation/schemas";

type Bank = { name: string; code: string };

function publicUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export function ProfileForm({
  initialDisplayName,
  email,
  banks,
  initialBankCode,
  initialAccountNumber,
  initialAccountName,
  initialAvatarPath,
  initialAddresses,
}: {
  initialDisplayName: string;
  email: string;
  banks: Bank[];
  initialBankCode: string;
  initialAccountNumber: string;
  initialAccountName: string;
  initialAvatarPath: string | null;
  initialAddresses: ShippingAddress[];
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(initialAvatarPath);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Bank resolution
  const [bankCode, setBankCode] = useState(initialBankCode);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [resolving, setResolving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Addresses
  const [addresses, setAddresses] = useState<ShippingAddress[]>(initialAddresses);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(BLANK_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/media/sign-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: ext === "jpeg" ? "jpeg" : ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      await uploadWithProgress({ url: json.signedUrl, file, contentType: file.type });
      setAvatarPath(json.path);
    } catch {
      // Leave the previous avatar in place on failure.
    } finally {
      setAvatarBusy(false);
    }
  }

  async function resolveBank(code: string, num: string) {
    setBankError(null);
    setAccountName("");
    if (!code || !/^\d{10}$/.test(num)) return;
    setResolving(true);
    try {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: num, bank_code: code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not verify account");
      setAccountName(json.account_name);
    } catch (err) {
      setBankError(err instanceof Error ? err.message : "Could not verify account");
    } finally {
      setResolving(false);
    }
  }

  function addAddress() {
    if (!addressDraft.fullName.trim()) { setAddressError("Full name is required"); return; }
    if (!addressDraft.line1.trim()) { setAddressError("Street address is required"); return; }
    if (!addressDraft.city.trim()) { setAddressError("City is required"); return; }
    if (!addressDraft.state.trim()) { setAddressError("State is required"); return; }

    const newAddress: ShippingAddress = {
      id: crypto.randomUUID(),
      fullName: addressDraft.fullName.trim(),
      line1: addressDraft.line1.trim(),
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim(),
      country: addressDraft.country.trim() || "Nigeria",
      ...(addressDraft.label.trim() ? { label: addressDraft.label.trim() } : {}),
      ...(addressDraft.line2.trim() ? { line2: addressDraft.line2.trim() } : {}),
      ...(addressDraft.phone.trim() ? { phone: addressDraft.phone.trim() } : {}),
    };

    setAddresses([...addresses, newAddress]);
    setAddressDraft(BLANK_ADDRESS);
    setShowAddressForm(false);
    setAddressError(null);
  }

  const avatarUrl = publicUrl(avatarPath);

  return (
    <form action={action} className="space-y-7">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-full overflow-hidden bg-ink/8 grid place-items-center shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-8 text-ink/30" />
          )}
        </div>
        <div>
          <button
            type="button"
            data-no-loading="true"
            onClick={() => fileRef.current?.click()}
            disabled={avatarBusy}
            className="btn-outline text-sm py-2 disabled:opacity-60"
          >
            {avatarBusy ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
          </button>
          <p className="text-xs text-ink/45 mt-1.5">Optional. Shown on your celebration page.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
        <input type="hidden" name="avatarPath" value={avatarPath ?? ""} />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          name="displayName"
          className="field"
          defaultValue={initialDisplayName}
          maxLength={60}
          placeholder="How contributors see you"
        />
        <p className="text-xs text-ink/45">
          Shown under &ldquo;Put together by &hellip;&rdquo;. Leave blank to fall back to your email.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="label">Email</label>
        <input className="field bg-ink/5 text-ink/55" value={email} disabled />
      </div>

      {/* Bank details */}
      <div className="space-y-3 pt-2 border-t border-ink/8">
        <div>
          <h2 className="serif text-xl text-ink">Payout account</h2>
          <p className="text-xs text-ink/45 mt-1">
            Where your gifts are sent when you receive them. Used for your own celebration pages.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="bankCode">Bank</label>
          <select
            id="bankCode"
            name="bankCode"
            className="field"
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); resolveBank(e.target.value, accountNumber); }}
          >
            <option value="">Select your bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="accountNumber">Account number</label>
          <input
            id="accountNumber"
            name="accountNumber"
            className="field"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            placeholder="10-digit account number"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
              setAccountNumber(v);
              if (v.length === 10) resolveBank(bankCode, v);
              else setAccountName("");
            }}
          />
        </div>

        {resolving && (
          <p className="text-sm text-ink/55 inline-flex items-center gap-1.5">
            <Loader2 className="size-4 animate-spin" /> Checking account…
          </p>
        )}
        {accountName && !resolving && (
          <p className="text-sm rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-2 inline-flex items-center gap-1.5">
            <Check className="size-4" /> {accountName}
          </p>
        )}
        {bankError && <p className="text-sm text-red-600">{bankError}</p>}
      </div>

      {/* Delivery addresses */}
      <div className="space-y-3 pt-2 border-t border-ink/8">
        <div>
          <h2 className="serif text-xl text-ink">Delivery addresses</h2>
          <p className="text-xs text-ink/45 mt-1">
            Where friends can send you physical gifts. Shown on your sealed celebration pages.
          </p>
        </div>

        {addresses.length > 0 && (
          <ul className="space-y-2">
            {addresses.map((addr, i) => (
              <li
                key={addr.id ?? i}
                className="flex items-start justify-between gap-3 rounded-xl bg-ink/4 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  {addr.label && (
                    <p className="text-[10px] uppercase tracking-widest text-ink/45 mb-0.5">{addr.label}</p>
                  )}
                  <p className="font-medium text-ink">{addr.fullName}</p>
                  <p className="text-ink/55 text-xs mt-0.5">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
                    <br />
                    {addr.city}, {addr.state} · {addr.country}
                  </p>
                  {addr.phone && (
                    <p className="text-ink/45 text-xs mt-0.5">{addr.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddresses(addresses.filter((_, j) => j !== i))}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0 mt-1"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {showAddressForm ? (
          <div className="rounded-xl border border-ink/10 p-4 space-y-4 bg-ink/2">
            <AddressFormFields
              draft={addressDraft}
              onChange={(updates) => setAddressDraft({ ...addressDraft, ...updates })}
            />
            {addressError && <p className="text-sm text-red-600">{addressError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addAddress}
                className="btn-accent text-sm py-2"
              >
                Add address
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressForm(false);
                  setAddressError(null);
                  setAddressDraft(BLANK_ADDRESS);
                }}
                className="btn-outline text-sm py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          addresses.length < 5 && (
            <button
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="text-sm text-[var(--accent)] hover:underline inline-flex items-center gap-1.5"
            >
              <MapPin className="size-3.5" /> Add address
            </button>
          )
        )}

        <input type="hidden" name="shippingAddresses" value={JSON.stringify(addresses)} />
      </div>

      {state.error && (
        <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">{state.error}</p>
      )}
      {state.ok && !pending && (
        <p className="text-sm rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-2 inline-flex items-center gap-1.5">
          <Check className="size-4" /> Saved
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent shadow-soft disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
