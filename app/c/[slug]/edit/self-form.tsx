"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { editSelfCelebration, deleteSealedCelebration, type SelfEditState } from "./actions";
import { SlugEditor } from "./slug-editor";
import { isTheme, type Theme } from "@/lib/themes";
import { ThemePickerButton } from "@/components/page-editor/theme-picker-button";
import { BankCombobox, type Bank } from "@/components/page-editor/bank-combobox";
import { MusicPicker } from "@/components/music-picker";
import { StepProgress } from "@/components/step-progress";
import { isValidUploadedTrackId, makeUploadedTrack, parseMusicValue, type MusicTrack } from "@/lib/music";
import type { WishlistItem } from "@/lib/validation/schemas";

export function SelfEditForm({
  slug,
  banks,
  tracks,
  initial,
}: {
  slug: string;
  banks: Bank[];
  tracks: MusicTrack[];
  initial: {
    title: string;
    theme: string;
    messageFromCreator: string;
    backgroundMusic: string | null;
    wishlist: WishlistItem[];
    bankCode: string;
    accountNumber: string;
    accountName: string;
    dateOfBirth: string;
  };
}) {
  const router = useRouter();
  const action = editSelfCelebration.bind(null, slug);
  const [state, dispatch, pending] = useActionState<SelfEditState, FormData>(action, {});

  const [title, setTitle] = useState(initial.title);
  const [theme, setTheme] = useState<Theme>(isTheme(initial.theme) ? initial.theme : "ivory");
  const [note, setNote] = useState(initial.messageFromCreator);
  const [wishlist, setWishlist] = useState<WishlistItem[]>(
    initial.wishlist.length ? initial.wishlist : [],
  );

  // Celebration song. Surface a previously uploaded track in the list so it
  // shows as selected and can be previewed.
  const [music, setMusic] = useState<string | null>(initial.backgroundMusic);
  const [trackList, setTrackList] = useState<MusicTrack[]>(() => {
    const { id } = parseMusicValue(initial.backgroundMusic);
    if (id && isValidUploadedTrackId(id) && !tracks.some((t) => t.id === id)) {
      return [makeUploadedTrack(id), ...tracks];
    }
    return tracks;
  });

  // Bank (profile-level; reused across pages/years)
  const [bankCode, setBankCode] = useState(initial.bankCode);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [accountName, setAccountName] = useState(initial.accountName);
  const [resolving, setResolving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

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

  function updateItem(i: number, patch: Partial<WishlistItem>) {
    setWishlist((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }
  function addItem() {
    setWishlist((prev) => (prev.length >= 20 ? prev : [...prev, { title: "", url: "" }]));
  }
  function removeItem(i: number) {
    setWishlist((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("theme", theme);
    if (note) fd.set("messageFromCreator", note);
    // Birthday pages always renew every year.
    fd.set("isRecurring", "on");
    if (music) fd.set("backgroundMusic", music);
    fd.set(
      "wishlist",
      JSON.stringify(
        wishlist
          .map((w) => {
            const url = (w.url ?? "").trim();
            // Accept bare domains like "amazon.com" by adding a scheme.
            const normalized = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;
            return { title: w.title.trim(), url: normalized };
          })
          .filter((w) => w.title.length > 0),
      ),
    );
    if (bankCode && /^\d{10}$/.test(accountNumber)) {
      fd.set("bankCode", bankCode);
      fd.set("accountNumber", accountNumber);
    }
    dispatch(fd);
  }

  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  function remove() {
    if (!window.confirm("Delete this celebration for good? This can't be undone.")) return;
    setDeleteError(null);
    startDelete(async () => {
      const res = await deleteSealedCelebration(slug);
      if (res.error) { setDeleteError(res.error); return; }
      router.push("/dashboard");
    });
  }

  // ── Multi-step wizard ──
  const steps = ["About", "Look", "Wishlist & gifts"];
  const [step, setStep] = useState(0);
  const stepValid = step === 0 ? title.trim().length >= 2 : true;

  return (
    <main className="min-h-[100dvh] bg-white pb-28" data-theme={theme}>
      <div className="mx-auto max-w-2xl px-5 md:px-10 pt-6 space-y-7">
        <button
          onClick={() => router.push(`/c/${slug}`)}
          className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" /> Back to page
        </button>

        <div>
          <h1 className="serif text-4xl text-ink">Your celebration</h1>
          <p className="text-ink/55 mt-2 text-sm">
            This is your own page. Messages and gifts stay sealed until the day —
            even from you.
          </p>
        </div>

        <StepProgress steps={steps} current={step} />

        {/* ── Step 1: About ── */}
        {step === 0 && (
          <div className="space-y-6 fade-up">
            <div className="space-y-1.5">
              <label className="label" htmlFor="title">Page title</label>
              <input
                id="title"
                className="field"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Birthday"
              />
            </div>


            <div className="space-y-1.5">
              <label className="label" htmlFor="note">A note on your page</label>
              <textarea
                id="note"
                className="field min-h-[90px] resize-none"
                value={note}
                maxLength={280}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything you'd like your guests to see — a thank-you, a wish, a vibe."
              />
              <p className="text-xs text-ink/45">{note.length}/280</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Look ── */}
        {step === 1 && (
          <div className="space-y-6 fade-up">
            <div className="space-y-1.5">
              <label className="label">Theme</label>
              <ThemePickerButton value={theme} onChange={setTheme} />
            </div>
            <MusicPicker
              value={music}
              onChange={setMusic}
              tracks={trackList}
              allowUpload
              onAddTrack={(t) => setTrackList((prev) => (prev.some((x) => x.id === t.id) ? prev : [t, ...prev]))}
            />
          </div>
        )}

        {/* ── Step 3: Wishlist & gifts ── */}
        {step === 2 && (
          <div className="space-y-6 fade-up">
            <div className="space-y-3">
              <div>
                <h2 className="serif text-xl text-ink">Wishlist <span className="text-ink/40 text-sm font-normal">(optional)</span></h2>
                <p className="text-xs text-ink/45 mt-1">
                  Things you&apos;d love. Shown to your guests so they know what the gift could go toward.
                </p>
              </div>
              {wishlist.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input
                      className="field"
                      value={item.title}
                      maxLength={120}
                      placeholder="What you'd love"
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                    />
                    <input
                      className="field text-sm"
                      value={item.url ?? ""}
                      maxLength={500}
                      inputMode="url"
                      placeholder="Link (optional)"
                      onChange={(e) => updateItem(i, { url: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-ink/40 hover:text-red-600 p-2 mt-1"
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {wishlist.length < 20 && (
                <button type="button" onClick={addItem} className="btn-outline text-sm py-2 inline-flex items-center gap-1.5">
                  <Plus className="size-4" /> Add item
                </button>
              )}
            </div>

            {/* Payout bank */}
            <div className="space-y-3 pt-2 border-t border-ink/8">
              <div>
                <h2 className="serif text-xl text-ink">Payout account</h2>
                <p className="text-xs text-ink/45 mt-1">
                  Where your gift is sent when you receive it on the day.
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

            <p className="text-xs text-ink/50 inline-flex items-center gap-1.5">
              <Lock className="size-3.5 text-[var(--accent)]" />
              Messages and gifts stay sealed until the day — even from you.
            </p>
          </div>
        )}

        {state.error && (
          <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">{state.error}</p>
        )}
        {state.ok && !pending && (
          <p className="text-sm rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-2 inline-flex items-center gap-1.5">
            <Check className="size-4" /> Saved
          </p>
        )}

        {/* ── Wizard navigation ── */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-outline py-3.5 inline-flex items-center gap-1.5">
              <ArrowLeft className="size-4" /> Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid}
              className="btn-accent shadow-soft flex-1 py-3.5 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button onClick={save} disabled={pending} className="btn-accent shadow-soft flex-1 py-3.5 disabled:opacity-60">
              {pending ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>

        <SlugEditor slug={slug} />
      </div>
    </main>
  );
}
