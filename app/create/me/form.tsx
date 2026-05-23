"use client";

import { useActionState, useState } from "react";
import { Lock, Check, Loader2 } from "lucide-react";
import { createSelfCelebration, type CreateState } from "../actions";
import { type Theme } from "@/lib/themes";
import { ThemePickerButton } from "@/components/page-editor/theme-picker-button";
import { BankCombobox, type Bank } from "@/components/page-editor/bank-combobox";
import { MusicPicker } from "@/components/music-picker";
import type { MusicTrack } from "@/lib/music";

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "birthday", label: "Birthday (renews every year)" },
  { value: "graduation", label: "Graduation" },
  { value: "wedding", label: "Wedding" },
  { value: "other", label: "Other celebration" },
];

export function SelfCreateForm({
  defaultName,
  banks,
  tracks,
  initialBankCode,
  initialAccountNumber,
  initialAccountName,
}: {
  defaultName: string;
  banks: Bank[];
  tracks: MusicTrack[];
  initialBankCode: string;
  initialAccountNumber: string;
  initialAccountName: string;
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

  // Bank (compulsory)
  const [bankCode, setBankCode] = useState(initialBankCode);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [resolving, setResolving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

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

  function save() {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("eventType", eventType);
    fd.set("date", date);
    fd.set("theme", theme);
    if (music) fd.set("backgroundMusic", music);
    fd.set("bankCode", bankCode);
    fd.set("accountNumber", accountNumber);
    dispatch(fd);
  }

  return (
    <div className="space-y-6">
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
