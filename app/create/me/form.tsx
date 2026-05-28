"use client";

import { useActionState, useRef, useState } from "react";
import { Lock, Check, Loader2, Camera, User, MapPin } from "lucide-react";
import { createSelfCelebration, type CreateState } from "../actions";
import { type Theme } from "@/lib/themes";
import { ThemePickerButton } from "@/components/page-editor/theme-picker-button";
import { BankCombobox, type Bank } from "@/components/page-editor/bank-combobox";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";
import { uploadWithProgress } from "@/lib/upload";
import { AddressFormFields, BLANK_ADDRESS, type AddressDraft } from "@/components/address-form-fields";
import type { ShippingAddress } from "@/lib/validation/schemas";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "birthday", label: "Birthday (renews every year)" },
  { value: "graduation", label: "Graduation" },
  { value: "wedding", label: "Wedding" },
  { value: "other", label: "Other celebration" },
];

function AvatarUploader({
  path,
  previewUrl,
  onUploaded,
}: {
  path: string | null;
  previewUrl: string | null;
  onUploaded: (result: { path: string; previewUrl: string }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Photo must be under 8 MB."); return; }
    const objectUrl = URL.createObjectURL(file);
    setProgress(0);
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: IMAGE_EXTS.includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    try {
      await uploadWithProgress({ url: sign.signedUrl, file, contentType: file.type, onProgress: setProgress });
    } catch (e) {
      setUploading(false);
      alert(e instanceof Error ? e.message : "Upload failed");
      return;
    }
    setUploading(false);
    onUploaded({ path: sign.path, previewUrl: objectUrl });
  }

  const display = previewUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative size-24 rounded-full overflow-hidden bg-ink/8 ring-2 ring-ink/10 hover:ring-[var(--accent)] transition-all"
        aria-label={display ? "Change profile photo" : "Add a profile photo"}
      >
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={display} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <User className="size-10 text-ink/30" />
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-ink/30 opacity-0 hover:opacity-100 transition-opacity rounded-full">
          <Camera className="size-5 text-white" />
        </span>
        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-ink/50 rounded-full">
            <Loader2 className="size-5 text-white animate-spin" />
          </span>
        )}
      </button>
      <p className="text-xs text-ink/45">
        {display ? "Tap to change" : "Add a profile photo"}
        {uploading ? ` · ${progress}%` : ""}
      </p>
    </div>
  );
}

export function SelfCreateForm({
  defaultName,
  banks,
  tracks,
  initialBankCode,
  initialAccountNumber,
  initialAccountName,
  savedAddresses,
}: {
  defaultName: string;
  banks: Bank[];
  tracks: MusicTrack[];
  initialBankCode: string;
  initialAccountNumber: string;
  initialAccountName: string;
  savedAddresses: ShippingAddress[];
}) {
  const [state, dispatch, pending] = useActionState<CreateState, FormData>(createSelfCelebration, {});

  const [eventType, setEventType] = useState("birthday");
  const [title, setTitle] = useState(
    defaultName ? `${defaultName}'s Birthday` : "",
  );
  const [date, setDate] = useState("");
  const [theme, setTheme] = useState<Theme>("ivory");
  const [music, setMusic] = useState<string | null>(null);
  const [trackList, setTrackList] = useState<MusicTrack[]>(tracks);

  // Avatar
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Bank (compulsory)
  const [bankCode, setBankCode] = useState(initialBankCode);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [resolving, setResolving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Shipping address (optional)
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(BLANK_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);

  const bankReady = !!bankCode && /^\d{10}$/.test(accountNumber);

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

  function confirmDraftAddress() {
    if (!addressDraft.fullName.trim()) { setAddressError("Full name is required"); return; }
    if (!addressDraft.line1.trim()) { setAddressError("Street address is required"); return; }
    if (!addressDraft.city.trim()) { setAddressError("City is required"); return; }
    if (!addressDraft.state.trim()) { setAddressError("State is required"); return; }
    const addr: ShippingAddress = {
      fullName: addressDraft.fullName.trim(),
      line1: addressDraft.line1.trim(),
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim(),
      country: addressDraft.country.trim() || "Nigeria",
      ...(addressDraft.label.trim() ? { label: addressDraft.label.trim() } : {}),
      ...(addressDraft.line2.trim() ? { line2: addressDraft.line2.trim() } : {}),
      ...(addressDraft.phone.trim() ? { phone: addressDraft.phone.trim() } : {}),
    };
    setSelectedAddress(addr);
    setAddingAddress(false);
    setAddressError(null);
  }

  function save() {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("eventType", eventType);
    fd.set("date", date);
    fd.set("theme", theme);
    if (music) fd.set("backgroundMusic", music);
    fd.set("bankCode", bankCode);
    fd.set("accountNumber", accountNumber);
    if (avatarPath) fd.set("avatarPath", avatarPath);
    if (selectedAddress) fd.set("shippingAddress", JSON.stringify(selectedAddress));
    dispatch(fd);
  }

  // Whether the selected address came from the saved list
  const isFromSaved = (addr: ShippingAddress) =>
    savedAddresses.some((a) => a.id && a.id === addr.id);

  return (
    <div className="space-y-6">
      {/* Profile photo */}
      <AvatarUploader
        path={avatarPath}
        previewUrl={avatarPreview}
        onUploaded={({ path, previewUrl }) => {
          setAvatarPath(path);
          setAvatarPreview(previewUrl);
        }}
      />

      <div className="space-y-1.5">
        <label className="label" htmlFor="title">Page title</label>
        <input
          id="title"
          className="field"
          value={title}
          maxLength={80}
          placeholder="My Birthday"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="eventType">Occasion</label>
        <select
          id="eventType"
          className="field"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {EVENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="date">
          {eventType === "birthday" ? "Your birthday" : "The date"}
        </label>
        <input
          id="date"
          type="date"
          className="field"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="text-xs text-ink/45">
          {eventType === "birthday"
            ? "We'll celebrate the next one and renew it every year."
            : "Must be at least 4 days away."}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="label">Theme</label>
        <ThemePickerButton value={theme} onChange={setTheme} />
      </div>

      {/* Celebration song — same picker & functionality as the main flow */}
      <MusicPicker
        value={music}
        onChange={setMusic}
        tracks={trackList}
        allowUpload
        onAddTrack={(t) => setTrackList((prev) => [t, ...prev])}
      />

      {/* Payout bank — compulsory */}
      <div className="space-y-3 pt-2 border-t border-ink/8">
        <div>
          <h2 className="serif text-xl text-ink">Payout account</h2>
          <p className="text-xs text-ink/45 mt-1">
            Where your gift is sent on the day. Required to create your page.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="label">Bank</label>
          <BankCombobox
            banks={banks}
            value={bankCode}
            onChange={(code) => { setBankCode(code); resolveBank(code, accountNumber); }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="accountNumber">Account number</label>
          <input
            id="accountNumber"
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

      {/* Shipping address — optional */}
      <div className="space-y-3 pt-2 border-t border-ink/8">
        <div>
          <h2 className="serif text-xl text-ink">Shipping address</h2>
          <p className="text-xs text-ink/45 mt-1">
            Optional. So friends can also send you a physical gift.
          </p>
        </div>

        {savedAddresses.length > 0 ? (
          <div className="space-y-2">
            {/* No address option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                className="accent-[var(--accent)]"
                checked={selectedAddress === null && !addingAddress}
                onChange={() => { setSelectedAddress(null); setAddingAddress(false); }}
              />
              <span className="text-sm text-ink/70">No shipping address</span>
            </label>

            {/* Saved addresses */}
            {savedAddresses.map((addr) => (
              <label key={addr.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  className="accent-[var(--accent)] mt-0.5"
                  checked={selectedAddress?.id === addr.id}
                  onChange={() => { setSelectedAddress(addr); setAddingAddress(false); }}
                />
                <div className="text-sm">
                  {addr.label && (
                    <p className="text-[10px] uppercase tracking-widest text-ink/45">{addr.label}</p>
                  )}
                  <p className="font-medium text-ink">{addr.fullName}</p>
                  <p className="text-ink/55 text-xs">{addr.line1}, {addr.city}, {addr.state}</p>
                </div>
              </label>
            ))}

            {/* Add new option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                className="accent-[var(--accent)]"
                checked={addingAddress}
                onChange={() => { setSelectedAddress(null); setAddingAddress(true); }}
              />
              <span className="text-sm text-ink/70">Add a new address</span>
            </label>
          </div>
        ) : (
          !addingAddress && (
            <button
              type="button"
              onClick={() => setAddingAddress(true)}
              className="text-sm text-[var(--accent)] hover:underline inline-flex items-center gap-1.5"
            >
              <MapPin className="size-3.5" /> Add a shipping address
            </button>
          )
        )}

        {/* Inline address form */}
        {addingAddress && (
          <div className="rounded-xl border border-ink/10 p-4 space-y-4 bg-ink/2">
            <AddressFormFields
              draft={addressDraft}
              onChange={(updates) => setAddressDraft({ ...addressDraft, ...updates })}
            />
            {addressError && <p className="text-sm text-red-600">{addressError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmDraftAddress}
                className="btn-accent text-sm py-2"
              >
                Use this address
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingAddress(false);
                  setAddressError(null);
                  setAddressDraft(BLANK_ADDRESS);
                }}
                className="btn-outline text-sm py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview of confirmed new address */}
        {selectedAddress && !addingAddress && !isFromSaved(selectedAddress) && (
          <div className="rounded-xl bg-ink/4 px-3 py-2.5 text-sm flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{selectedAddress.fullName}</p>
              <p className="text-ink/55 text-xs">
                {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.state}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setAddingAddress(true); }}
              className="text-xs text-ink/50 hover:text-ink shrink-0"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-ink/60 rounded-2xl bg-ink/5 px-4 py-3 flex gap-2.5">
        <Lock className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" />
        Messages and gifts stay sealed — nobody (not even you) sees them until the day.
      </p>

      {state.error && (
        <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">{state.error}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending || !bankReady}
        className="btn-accent shadow-soft w-full py-4 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create my page"}
      </button>
      {!bankReady && (
        <p className="text-xs text-ink/45 text-center -mt-3">Add your payout account to continue.</p>
      )}
    </div>
  );
}
