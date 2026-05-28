"use client";

import { useState } from "react";
import { Gift, Mail, CalendarDays, ArrowLeft, ArrowRight, Check } from "lucide-react";

type Tone = "prayer" | "affirmation" | "scripture";

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: "prayer", label: "Prayers", desc: "Gentle, hopeful, faith-warm" },
  { value: "affirmation", label: "Affirmations", desc: "Grounding, kind, present-tense" },
  { value: "scripture", label: "Scripture-style", desc: "Timeless, poetic, reverent" },
];

const STEPS = ["How it works", "The gift", "Send"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewBlessingForm({ slug, firstName }: { slug: string; firstName: string }) {
  const [step, setStep] = useState(0);
  const [tone, setTone] = useState<Tone>("prayer");
  const [senderName, setSenderName] = useState("");
  const [gifterEmail, setGifterEmail] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedGifter = gifterEmail.trim();
  const trimmedEmail = email.trim();
  const trimmedConfirm = confirmEmail.trim();
  const gifterValid = EMAIL_RE.test(trimmedGifter);
  const emailsMatch = trimmedEmail.toLowerCase() === trimmedConfirm.toLowerCase();
  const emailValid = EMAIL_RE.test(trimmedEmail);
  const showMismatch = trimmedConfirm.length > 0 && !emailsMatch;
  const canPay = gifterValid && emailValid && emailsMatch && !busy;

  async function pay() {
    if (!gifterValid) {
      setError("Enter your email for the receipt.");
      return;
    }
    if (!emailValid) {
      setError(`Enter ${firstName}'s email address.`);
      return;
    }
    if (!emailsMatch) {
      setError("The two email addresses don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blessings/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          tone,
          senderName: senderName.trim() || undefined,
          gifterEmail: trimmedGifter,
          recipientEmail: trimmedEmail,
          recipientEmailConfirm: trimmedConfirm,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.authorization_url) {
        setError(json?.error ?? "Could not start payment. Try again.");
        setBusy(false);
        return;
      }
      window.location.href = json.authorization_url;
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl2 bg-white shadow-ring overflow-hidden">
      <Stepper step={step} />

      <div className="p-6">
        {step === 0 && (
          <div key="s0" className="fade-up">
            <HowItWorks firstName={firstName} />
            <button type="button" onClick={() => setStep(1)} className="btn-primary w-full mt-7">
              Begin <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="fade-up space-y-5">
            <div>
              <h2 className="serif text-2xl text-ink">Make it theirs</h2>
              <p className="text-sm text-ink/55 mt-1">
                Pick the voice of the year. You can sign it too.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ink mb-2">Choose the tone</p>
              <div className="space-y-2">
                {TONES.map((t) => {
                  const active = tone === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      aria-pressed={active}
                      className={`w-full rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-ink/12 hover:border-ink/25"
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">{t.label}</p>
                      <p className="text-xs text-ink/55 mt-0.5">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="sender" className="text-sm font-medium text-ink">
                Sign it from <span className="text-ink/45">(optional)</span>
              </label>
              <input
                id="sender"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
              <p className="text-xs text-ink/45 mt-1">Shown to {firstName} in every weekly blessing.</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(0)} className="btn-outline">
                <ArrowLeft className="size-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(2)} className="btn-primary flex-1">
                Continue <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="fade-up space-y-5">
            <div>
              <h2 className="serif text-2xl text-ink">Send it to {firstName}</h2>
              <p className="text-sm text-ink/55 mt-1">
                Their blessings go straight to their inbox. We&apos;ll email your receipt to you.
              </p>
            </div>

            <div>
              <label htmlFor="gifter-email" className="text-sm font-medium text-ink">
                Your email <span className="text-ink/45">(for the receipt)</span>
              </label>
              <input
                id="gifter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={gifterEmail}
                onChange={(e) => setGifterEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label htmlFor="recipient-email" className="text-sm font-medium text-ink">
                {firstName}&apos;s email
              </label>
              <input
                id="recipient-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
              <p className="text-xs text-ink/45 mt-1">Where their year of blessings will arrive. Ask them if you&apos;re not sure.</p>
            </div>

            <div>
              <label htmlFor="recipient-email-confirm" className="text-sm font-medium text-ink">
                Confirm {firstName}&apos;s email
              </label>
              <input
                id="recipient-email-confirm"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="Re-type to confirm"
                className={`mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:border-[var(--accent)] ${
                  showMismatch ? "border-red-400" : "border-ink/15"
                }`}
              />
              {showMismatch && <p className="text-xs text-red-600 mt-1">These don&apos;t match yet.</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(1)} disabled={busy} className="btn-outline disabled:opacity-60">
                <ArrowLeft className="size-4" /> Back
              </button>
              <button type="button" onClick={pay} disabled={!canPay} className="btn-primary flex-1 disabled:opacity-60">
                {busy ? "Starting…" : "Pay ₦3,000"}
              </button>
            </div>
            <p className="text-xs text-ink/45 text-center">
              A one-time payment. The first blessing reaches {firstName} as soon as you pay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 px-6 pt-5">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              className={`size-6 shrink-0 rounded-full grid place-items-center text-[11px] font-medium transition ${
                done
                  ? "bg-[var(--accent)] text-white"
                  : current
                    ? "bg-ink text-white"
                    : "bg-ink/10 text-ink/40"
              }`}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={`text-xs hidden sm:inline ${current ? "text-ink font-medium" : "text-ink/40"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-px flex-1 rounded ${done ? "bg-[var(--accent)]" : "bg-ink/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Animated explainer: a dove over a year of weeks filling in one by one, with
// the three beats of the gift spelled out beneath it.
function HowItWorks({ firstName }: { firstName: string }) {
  const beats: { icon: typeof Gift; text: string }[] = [
    { icon: Gift, text: "You pay once — ₦3,000 for the whole year." },
    { icon: Mail, text: `Every week, a short blessing emails to ${firstName}.` },
    { icon: CalendarDays, text: "52 weeks — some written for them, some from their wall." },
  ];

  return (
    <div className="text-center">
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in srgb, var(--accent-soft) 70%, white) 0%, #FFFFFF 100%)",
        }}
      >
        <div className="text-4xl" style={{ animation: "floatY 3s ease-in-out infinite" }}>
          🕊️
        </div>
        <h1 className="serif text-2xl text-ink mt-2 leading-tight">52 Weeks of Blessings</h1>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)] mt-1">
          A year-long gift
        </p>

        <div
          className="mt-5 grid gap-1 mx-auto max-w-[260px]"
          style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
          aria-hidden
        >
          {Array.from({ length: 52 }).map((_, i) => (
            <span key={i} className="week-dot" style={{ animationDelay: `${i * 55}ms` }} />
          ))}
        </div>
        <p className="text-[11px] text-ink/45 mt-2">one blessing each week, for a year</p>
      </div>

      <ul className="space-y-3 text-left">
        {beats.map((b, i) => {
          const Icon = b.icon;
          return (
            <li
              key={i}
              className="flex items-start gap-3 fade-up"
              style={{ animationDelay: `${120 + i * 110}ms` }}
            >
              <span className="size-8 shrink-0 rounded-full grid place-items-center bg-[var(--accent-soft)]">
                <Icon className="size-4 text-[var(--accent)]" />
              </span>
              <span className="text-sm text-ink/75 leading-relaxed pt-1">{b.text}</span>
            </li>
          );
        })}
      </ul>

      <style>{`
        .week-dot {
          aspect-ratio: 1;
          border-radius: 4px;
          border: 1px solid rgba(0,0,0,.12);
          background: transparent;
          animation: weekFill 4.8s ease-in-out infinite;
        }
        @keyframes weekFill {
          0%, 100% { background: transparent; border-color: rgba(0,0,0,.12); transform: scale(1); }
          6%       { background: var(--accent); border-color: var(--accent); transform: scale(1.3); }
          55%      { background: var(--accent); border-color: var(--accent); transform: scale(1); }
          85%      { background: color-mix(in srgb, var(--accent) 22%, transparent); border-color: rgba(0,0,0,.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .week-dot { animation: none; background: color-mix(in srgb, var(--accent) 60%, white); border-color: var(--accent); }
        }
      `}</style>
    </div>
  );
}
