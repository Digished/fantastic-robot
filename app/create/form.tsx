"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createCelebration, type CreateState } from "./actions";

type Bank = { name: string; code: string };

const EVENT_OPTIONS = [
  ["birthday", "Birthday"], ["graduation", "Graduation"], ["wedding", "Wedding"],
  ["appreciation", "Appreciation"], ["farewell", "Farewell"], ["baby_shower", "Baby shower"],
  ["surprise_gift", "Surprise gift"], ["other", "Other"],
] as const;

function minDate() {
  const d = new Date(Date.now() + 96 * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateForm({ banks }: { banks: Bank[] }) {
  const [state, action] = useActionState<CreateState, FormData>(createCelebration, {});

  // Cover photo upload (optional, recommended)
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Account resolution
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  useEffect(() => {
    setResolved(null); setResolveError(null);
    if (accountNumber.length !== 10 || !bankCode) return;
    startResolve(async () => {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const json = await res.json();
      if (res.ok) setResolved(json.account_name);
      else setResolveError(json.error ?? "Could not verify");
    });
  }, [accountNumber, bankCode]);

  async function onCover(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Cover must be under 8 MB."); return; }
    setUploading(true);
    // Sign as a generic image upload on a dummy slug — server actions will copy later.
    // For now use a transient slug 'pending' so RLS lookup succeeds; we'll fix later if needed.
    // Simplest path: upload via service-role signed URL with a temporary path.
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    const put = await fetch(sign.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    setUploading(false);
    if (!put.ok) { alert("Upload failed"); return; }
    setCoverPath(sign.path);
    setCoverPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action} className="mt-8 space-y-6">
      {/* Cover photo */}
      <div className="space-y-2">
        <label className="label">Cover photo (recommended)</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
        {coverPreview ? (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative w-full aspect-[3/2] rounded-3xl2 overflow-hidden shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="" className="size-full object-cover" />
            <span className="absolute bottom-3 right-3 glass-dark text-cream rounded-full px-3 py-1 text-xs">Change</span>
          </button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full aspect-[3/2] rounded-3xl2 border-2 border-dashed border-plum/20 grid place-items-center text-plum/60 hover:bg-plum/5 transition">
            {uploading ? "Uploading…" : "+ Add a photo of the celebrant"}
          </button>
        )}
        {coverPath && <input type="hidden" name="coverPhotoPath" value={coverPath} />}
      </div>

      <div className="space-y-1">
        <label className="label">Page title</label>
        <input name="title" className="field" placeholder="Tunde turns 30 🎉" required maxLength={80} />
      </div>

      <div className="space-y-1">
        <label className="label">Who is it for?</label>
        <input name="recipientName" className="field" placeholder="Tunde Bakare" required maxLength={60} />
      </div>

      <div className="space-y-1">
        <label className="label">Type of celebration</label>
        <select name="eventType" className="field" defaultValue="birthday" required>
          {EVENT_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="label">Celebration date</label>
        <input type="datetime-local" name="celebrationDate" className="field" min={minDate()} required />
        <p className="text-xs text-plum/50">Contributions close 72 hours before this date.</p>
      </div>

      <div className="space-y-1">
        <label className="label">A note from you (optional)</label>
        <textarea name="messageFromCreator" className="field min-h-[88px] resize-none"
          placeholder="Let's spoil her this year ❤️" maxLength={280} />
      </div>

      <div className="pt-4 border-t border-plum/10">
        <p className="font-serif text-2xl text-plum">Where the gift goes</p>
        <p className="text-sm text-plum/60 mt-1">Locked once the page is live. Contributors see this for transparency.</p>

        <div className="space-y-1 mt-4">
          <label className="label">Recipient's bank</label>
          <select name="recipientBankCode" className="field" required
            value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
            <option value="" disabled>Select a bank</option>
            {banks.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
          </select>
        </div>

        <div className="space-y-1 mt-3">
          <label className="label">Account number</label>
          <input name="recipientAccountNumber" className="field" inputMode="numeric" pattern="\d{10}"
            maxLength={10} required value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} />
        </div>

        <div className="mt-3 min-h-[44px]" aria-live="polite">
          {resolving && <p className="text-sm text-plum/60">Verifying account…</p>}
          {resolved && (
            <p className="text-sm rounded-2xl bg-terracotta/10 text-terracotta-700 px-4 py-2 font-medium">
              ✓ {resolved}
            </p>
          )}
          {resolveError && <p className="text-sm rounded-2xl bg-terracotta/10 text-terracotta-700 px-4 py-2">{resolveError}</p>}
        </div>
      </div>

      {state.error && <p className="text-sm text-terracotta">{state.error}</p>}

      <button className="btn-accent w-full py-5 text-base shadow-glow" disabled={!resolved || resolving}>
        Create celebration page
      </button>
    </form>
  );
}
