"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCelebration } from "./actions";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/themes";

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

const STEPS = ["Vibe", "Details", "About them", "Recipient", "Review"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

export function CreateForm({ banks }: { banks: Bank[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // form state
  const [theme, setTheme] = useState<Theme>("ivory");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [eventType, setEventType] = useState("birthday");
  const [celebrationDate, setCelebrationDate] = useState("");
  const [messageFromCreator, setMessageFromCreator] = useState("");

  const [tagline, setTagline] = useState("");
  const [celebrantDescription, setCelebrantDescription] = useState("");

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // resolve bank account live
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
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-cover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    const put = await fetch(sign.signedUrl, {
      method: "PUT", headers: { "Content-Type": file.type }, body: file,
    });
    setUploading(false);
    if (!put.ok) { alert("Upload failed"); return; }
    setCoverPath(sign.path);
    setCoverPreview(URL.createObjectURL(file));
  }

  function step1Errors(): string[] {
    const errs: string[] = [];
    if (title.trim().length < 2) errs.push("Page title is required (at least 2 characters).");
    if (recipientName.trim().length < 1) errs.push("Recipient name is required.");
    if (!celebrationDate) errs.push("Please pick a celebration date.");
    else if (new Date(celebrationDate).getTime() <= Date.now()) errs.push("Celebration date must be in the future.");
    return errs;
  }

  function canAdvance(): boolean {
    if (step === 0) return true;
    if (step === 1) return step1Errors().length === 0;
    if (step === 2) return true;
    if (step === 3) {
      if (!resolved || !bankCode || accountNumber.length !== 10) return false;
      const hasQ = securityQuestion.trim().length >= 3;
      const hasA = securityAnswer.trim().length >= 1;
      if ((hasQ && !hasA) || (!hasQ && hasA)) return false;
      return true;
    }
    return true;
  }

  function next() { if (canAdvance() && step < 4) setStep((s) => (s + 1) as Step); }
  function back() { if (step > 0) setStep((s) => (s - 1) as Step); }

  async function submit() {
    setSubmitting(true); setSubmitError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("recipientName", recipientName);
    fd.set("eventType", eventType);
    fd.set("theme", theme);
    fd.set("celebrationDate", celebrationDate);
    if (messageFromCreator) fd.set("messageFromCreator", messageFromCreator);
    if (tagline) fd.set("tagline", tagline);
    if (celebrantDescription) fd.set("celebrantDescription", celebrantDescription);
    if (coverPath) fd.set("coverPhotoPath", coverPath);
    fd.set("recipientBankCode", bankCode);
    fd.set("recipientAccountNumber", accountNumber);
    if (securityQuestion) fd.set("securityQuestion", securityQuestion);
    if (securityAnswer) fd.set("securityAnswer", securityAnswer);

    const result = await createCelebration({}, fd);
    if (result && "error" in result && result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div data-theme={theme} className="mt-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-[var(--accent)]" : "bg-ink/10"}`} />
            <p className={`mt-1.5 text-[11px] uppercase tracking-widest ${i === step ? "text-ink" : "text-ink/40"}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 fade-up" key={step}>
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="serif text-3xl text-ink">Pick a vibe</h2>
              <p className="text-ink/55 text-sm mt-1">You can change this any time.</p>
            </div>
            <div className="relative h-32 rounded-3xl2 overflow-hidden shadow-ring theme-mesh">
              <p className="absolute bottom-3 left-4 text-[11px] uppercase tracking-widest text-ink/60">
                Live preview
              </p>
            </div>
            <ThemePicker value={theme} onChange={setTheme} />

            <div className="space-y-2 pt-2">
              <label className="label">Cover photo (recommended)</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
              {coverPreview ? (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-full aspect-[4/3] rounded-3xl2 overflow-hidden shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="" className="size-full object-cover" />
                  <span className="absolute bottom-3 right-3 glass-dark text-white rounded-full px-3 py-1 text-xs">Change</span>
                </button>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-3xl2 border-2 border-dashed border-ink/15 grid place-items-center text-ink/55 hover:bg-ink/5 transition">
                  {uploading ? "Uploading…" : "+ Add a photo of the celebrant"}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">The details</h2>
              <p className="text-ink/55 text-sm mt-1">Tell everyone what this is for.</p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Page title</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Tunde turns 30 🎉" maxLength={80} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Who is it for?</label>
              <input className="field" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Tunde Bakare" maxLength={60} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Type of celebration</label>
              <select className="field" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="label">Celebration date</label>
              <input type="datetime-local" className="field" min={minDate()}
                value={celebrationDate} onChange={(e) => setCelebrationDate(e.target.value)} />
              <p className="text-xs text-ink/50">Contributions close 72 hours before this date.</p>
            </div>

            <div className="space-y-1.5">
              <label className="label">A note from you (optional)</label>
              <textarea className="field min-h-[88px] resize-none"
                value={messageFromCreator} onChange={(e) => setMessageFromCreator(e.target.value)}
                placeholder="Let's spoil her this year ❤️" maxLength={280} />
            </div>

            {step1Errors().length > 0 && (title || recipientName || celebrationDate) && (
              <ul className="text-xs text-red-600 space-y-0.5 mt-1">
                {step1Errors().map((e) => <li key={e}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">About {recipientName.split(" ")[0] || "them"}</h2>
              <p className="text-ink/55 text-sm mt-1">
                This helps create a beautiful, personalised opening when {recipientName.split(" ")[0] || "the celebrant"} presses Play.
                The more you share, the richer the experience. ✨
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Who is this person to you? (optional)</label>
              <textarea
                className="field min-h-[140px] resize-none"
                value={celebrantDescription}
                onChange={(e) => setCelebrantDescription(e.target.value)}
                placeholder={`Tell us about ${recipientName.split(" ")[0] || "them"} — their personality, what they love, what makes them special, and why you're celebrating them. This appears as a beautiful story before their messages.`}
                maxLength={1500}
              />
              <p className="text-xs text-ink/45">{celebrantDescription.length}/1500 characters</p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-ink/10">
              <label className="label">Custom tagline (optional)</label>
              <input
                className="field"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder={`e.g. "We got you, queen ✨" or "Happy birthday, big head 🎂"`}
                maxLength={140}
              />
              <p className="text-xs text-ink/45">
                This appears on {recipientName.split(" ")[0] || "the celebrant"}'s cover page. Leave blank to hide it.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">Where the gift goes</h2>
              <p className="text-ink/55 text-sm mt-1">
                For monetary gifts friends may send to {recipientName.split(" ")[0] || "the celebrant"}.
                Locked once the page is live.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Recipient's bank</label>
              <select className="field" value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                <option value="" disabled>Select a bank</option>
                {banks.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="label">Account number</label>
              <input className="field" inputMode="numeric" pattern="\d{10}" maxLength={10}
                value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} />
            </div>

            <div className="min-h-[44px]" aria-live="polite">
              {resolving && <p className="text-sm text-ink/60">Verifying account…</p>}
              {resolved && (
                <p className="text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-2 font-medium">
                  ✓ {resolved}
                </p>
              )}
              {resolveError && (
                <p className="text-sm rounded-2xl bg-red-50 text-red-700 px-4 py-2">{resolveError}</p>
              )}
            </div>

            <div className="pt-5 border-t border-ink/10">
              <h3 className="serif text-2xl text-ink">A secret door <span className="text-ink/40 text-base font-sans not-italic ml-1">— optional</span></h3>
              <p className="text-ink/55 text-sm mt-1">
                Set a security question so only {recipientName.split(" ")[0] || "the celebrant"} can open their page.
                Share the answer with them privately — not in the group chat.
                Leave both fields blank to skip.
              </p>

              <div className="space-y-1.5 mt-4">
                <label className="label">Question only they can answer</label>
                <input className="field" value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  placeholder="What was your childhood nickname?" maxLength={140} />
              </div>
              <div className="space-y-1.5 mt-3">
                <label className="label">The answer</label>
                <input className="field" value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="lowercase, casing doesn't matter" maxLength={140} />
                <p className="text-xs text-ink/45">We store a one-way hash — even we can't read it.</p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">Looks good?</h2>
              <p className="text-ink/55 text-sm mt-1">A quick look before we publish.</p>
            </div>

            <div className="relative aspect-[4/5] rounded-3xl2 overflow-hidden shadow-card">
              {coverPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 theme-mesh" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/70" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/80">{eventType.replace("_", " ")}</p>
                <h3 className="serif text-3xl mt-2">{title || "Your celebration"}</h3>
                <p className="text-white/85 text-sm mt-1">For {recipientName || "—"}</p>
                {tagline && <p className="text-white/70 text-xs mt-1 italic">{tagline}</p>}
              </div>
            </div>

            <ul className="card text-sm divide-y divide-ink/5">
              <li className="py-2 flex justify-between"><span className="text-ink/55">Date</span><span className="text-ink">{celebrationDate ? new Date(celebrationDate).toLocaleString("en-NG") : "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Recipient</span><span className="text-ink">{resolved ?? "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Account</span><span className="text-ink">****{accountNumber.slice(-4)}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Theme</span><span className="text-ink capitalize">{theme}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Security gate</span><span className="text-ink">{securityQuestion ? "Yes ✓" : "None"}</span></li>
            </ul>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <button type="button" onClick={back} disabled={submitting} className="btn-outline flex-1">
            Back
          </button>
        )}
        {step < 4 && (
          <button type="button" onClick={next} disabled={!canAdvance()} className="btn-accent flex-1 shadow-soft">
            Continue
          </button>
        )}
        {step === 4 && (
          <button type="button" onClick={submit} disabled={submitting} className="btn-accent flex-1 shadow-glow">
            {submitting ? "Publishing…" : "Publish page"}
          </button>
        )}
      </div>
    </div>
  );
}
