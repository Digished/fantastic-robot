"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Loader2, User } from "lucide-react";
import { updateProfile, type ProfileState } from "./actions";
import { uploadWithProgress } from "@/lib/upload";

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
}: {
  initialDisplayName: string;
  email: string;
  banks: Bank[];
  initialBankCode: string;
  initialAccountNumber: string;
  initialAccountName: string;
  initialAvatarPath: string | null;
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
