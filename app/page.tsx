import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Sparkles } from "@/components/sparkles";

export default async function Landing() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main data-theme="ivory" className="min-h-[100dvh] bg-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-ink/5">
        <div className="page-shell py-4 flex items-center justify-between">
          <span className="serif text-2xl text-ink">Spendbox</span>
          <Link href="/login" className="text-sm text-ink/65 hover:text-ink transition">Sign in</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="theme-mesh relative overflow-hidden flex flex-col items-center justify-center pt-12 pb-20 px-5 text-center">
        <Sparkles count={14} />

        {/* Gift box */}
        <div className="relative mb-10" style={{ width: 160, height: 210 }}>

          {/* Floating glow behind box */}
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-40"
            style={{ background: "var(--accent)", transform: "scale(0.8) translateY(20px)" }}
          />

          {/* Box body */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-[20px] shadow-2xl overflow-hidden"
            style={{
              height: 140,
              background: "linear-gradient(155deg, var(--mesh-a) 0%, var(--mesh-b) 60%, var(--mesh-c) 100%)",
              border: "1.5px solid rgba(255,255,255,0.6)",
            }}
          >
            {/* Vertical ribbon */}
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[18px]"
              style={{ background: "var(--accent)", opacity: 0.85 }}
            />
          </div>

          {/* Lid */}
          <div
            className="lid-float absolute left-0 right-0 rounded-t-[20px] shadow-lg overflow-hidden z-10"
            style={{
              top: 54,
              height: 50,
              background: "linear-gradient(155deg, var(--mesh-d) 0%, var(--mesh-a) 100%)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          >
            {/* Horizontal ribbon */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[18px]"
              style={{ background: "var(--accent)", opacity: 0.85 }}
            />
          </div>

          {/* Bow — floats with lid */}
          <div
            className="lid-float absolute z-20"
            style={{ top: 4, left: "50%", transform: "translateX(-50%)", width: 72, height: 40 }}
          >
            {/* Left loop */}
            <div
              className="absolute"
              style={{
                left: 0, top: 6, width: 34, height: 22,
                background: "var(--accent)",
                borderRadius: "50%",
                transform: "rotate(-28deg)",
                transformOrigin: "right center",
                opacity: 0.92,
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.15)",
              }}
            />
            {/* Right loop */}
            <div
              className="absolute"
              style={{
                right: 0, top: 6, width: 34, height: 22,
                background: "var(--accent)",
                borderRadius: "50%",
                transform: "rotate(28deg)",
                transformOrigin: "left center",
                opacity: 0.92,
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.15)",
              }}
            />
            {/* Ribbon tails */}
            <div
              className="absolute"
              style={{
                bottom: 0, left: "42%",
                width: 9, height: 14,
                background: "var(--accent)",
                transform: "rotate(-12deg)",
                borderRadius: "0 0 5px 5px",
                opacity: 0.8,
              }}
            />
            <div
              className="absolute"
              style={{
                bottom: 0, right: "42%",
                width: 9, height: 14,
                background: "var(--accent)",
                transform: "rotate(12deg)",
                borderRadius: "0 0 5px 5px",
                opacity: 0.8,
              }}
            />
            {/* Center knot */}
            <div
              className="absolute z-10"
              style={{
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 18, height: 18,
                borderRadius: "50%",
                background: "var(--accent)",
                filter: "brightness(0.78)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>

        {/* Tagline */}
        <h1 className="fade-up serif text-ink text-[54px] sm:text-[64px] leading-[0.92]">
          celebrate<br />
          <em className="shimmer-text not-italic">together</em>
        </h1>
        <p
          className="fade-up mt-5 text-ink/65 text-lg leading-relaxed max-w-xs"
          style={{ animationDelay: ".06s" }}
        >
          A beautiful surprise page your whole group fills with messages, voice notes and a group gift.
        </p>

        <div
          className="fade-up mt-9 w-full max-w-xs flex flex-col gap-3"
          style={{ animationDelay: ".11s" }}
        >
          <Link href="/create" className="btn-accent text-base py-4 shadow-glow">
            Start a celebration
          </Link>
          <Link href="/login" className="btn-outline text-base py-4">
            I have an account
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="page-shell py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-6 text-center">How it works</p>
        <div className="space-y-3">
          {[
            { emoji: "🎨", title: "Create a page", body: "Pick a theme, write about the celebrant, set a date — two minutes flat." },
            { emoji: "💌", title: "Friends pile on", body: "Share the link on WhatsApp. Everyone leaves voice notes, videos, photos and a cash gift." },
            { emoji: "🎁", title: "They unwrap it", body: "A cinematic play-through of every message, then the gift lands in their account." },
          ].map(({ emoji, title, body }) => (
            <div key={title} className="card flex items-start gap-4">
              <span className="text-3xl shrink-0 mt-0.5">{emoji}</span>
              <div>
                <p className="serif text-xl text-ink">{title}</p>
                <p className="text-ink/55 text-sm mt-1 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample cards ── */}
      <section className="page-shell pb-20">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-5">Messages in the wild</p>
        <div className="relative h-56">
          <div className="polaroid polaroid--a tint-1 absolute left-0 top-2 w-44">
            <p className="serif text-ink text-lg leading-tight">happy birthday tunde 🎂</p>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— ada</p>
          </div>
          <div className="polaroid polaroid--b tint-3 absolute right-0 top-8 w-44">
            <p className="serif text-ink text-lg leading-tight">&ldquo;you are loved more than you know&rdquo;</p>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— anonymous</p>
          </div>
          <div className="polaroid polaroid--c tint-5 absolute left-1/2 -translate-x-1/2 top-24 w-40">
            <p className="serif text-ink text-base leading-tight">to many many more 🥂</p>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— chika</p>
          </div>
        </div>
      </section>

      <footer className="pb-10 text-center text-xs text-ink/40">
        ₦ delivered straight to the bank · powered by Paystack
      </footer>
    </main>
  );
}
