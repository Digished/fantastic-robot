"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export function CelebrantGate({
  slug, question, recipientName,
}: { slug: string; question: string; recipientName: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/celebrant/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, answer }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="min-h-[100dvh] bg-white grid place-items-center">
      <div className="page-shell">
        <div className="card text-center fade-up">
          <div className="mx-auto size-12 rounded-full bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)]">
            <Lock className="size-5" />
          </div>
          <h1 className="serif text-3xl text-ink mt-5">For {recipientName.split(" ")[0]}</h1>
          <p className="text-ink/60 mt-2 text-sm">
            Your friends made something for you. Answer this to open it.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3 text-left">
            <p className="serif text-xl text-ink leading-snug">{question}</p>
            <input
              className="field"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-accent w-full py-4" disabled={busy || !answer.trim()}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Checking…</> : "Open"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
