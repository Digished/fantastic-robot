import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Sparkles } from "@/components/sparkles";

export default async function Landing() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main data-theme="ivory" className="min-h-[100dvh] bg-white overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-ink/5">
        <div className="mx-auto max-w-6xl px-5 md:px-10 py-4 flex items-center justify-between">
          <span className="serif text-2xl text-ink">Spendbox</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink/65 hover:text-ink transition">Sign in</Link>
            <Link href="/create" className="btn-accent shadow-soft text-sm py-2.5 hidden md:inline-flex">
              Start a celebration
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="theme-mesh relative overflow-hidden">
        <Sparkles count={18} />

        <div className="mx-auto max-w-6xl px-5 md:px-10 py-16 md:py-24 md:grid md:grid-cols-2 md:gap-16 md:items-center">

          {/* Left: Copy */}
          <div className="md:order-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/50 mb-6 fade-up">Celebrations, reimagined</p>
            <h1 className="fade-up serif text-ink text-[52px] md:text-[68px] leading-[0.9]" style={{ animationDelay: "60ms" }}>
              celebrate<br />
              <em className="shimmer-text not-italic">together</em>
            </h1>
            <p className="fade-up mt-6 text-ink/65 text-lg leading-relaxed max-w-sm" style={{ animationDelay: "120ms" }}>
              A beautiful surprise page your whole group fills with messages, voice notes and a group gift — delivered straight to their bank.
            </p>
            <div className="fade-up mt-9 flex flex-col sm:flex-row gap-3 max-w-sm" style={{ animationDelay: "180ms" }}>
              <Link href="/create" className="btn-accent text-base py-4 shadow-glow flex-1 text-center">
                Start a celebration
              </Link>
              <Link href="/login" className="btn-outline text-base py-4 flex-1 text-center">
                Sign in
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="md:order-2 mt-12 md:mt-0 flex items-center justify-center">
            <div className="relative" style={{ width: 340, height: 440 }}>

              {/* Ambient glow */}
              <div
                className="absolute rounded-full blur-[80px] opacity-25 pointer-events-none"
                style={{ background: "var(--accent)", width: 260, height: 260, top: 80, left: 40 }}
              />

              {/* Back card — Chiamaka */}
              <div
                className="absolute rounded-[26px] overflow-hidden shadow-2xl"
                style={{
                  width: 195, height: 265,
                  right: 10, top: 15,
                  transform: "rotate(8deg)",
                  zIndex: 0,
                  animation: "floatY 11s ease-in-out infinite 1.8s",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://hxhjbqmzhpmfmyrmtmhr.supabase.co/storage/v1/object/public/landingpage-assets/african%20female.jpeg"
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[8px] uppercase tracking-[0.28em] text-white/65 font-medium">Wedding · 22 Aug</p>
                  <p className="serif text-white text-lg mt-1 leading-[1.1]">Chiamaka&apos;s<br />big day</p>
                  <p className="text-white/60 text-[10px] mt-0.5">For Chiamaka Eze</p>
                </div>
              </div>

              {/* Front card — Tunde Bakare */}
              <div
                className="absolute rounded-[26px] overflow-hidden shadow-2xl"
                style={{
                  width: 210, height: 285,
                  left: 0, top: 30,
                  transform: "rotate(-7deg)",
                  zIndex: 1,
                  animation: "floatY 9s ease-in-out infinite",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://hxhjbqmzhpmfmyrmtmhr.supabase.co/storage/v1/object/public/landingpage-assets/african%20male.jpeg"
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/65" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-[8px] uppercase tracking-[0.28em] text-white/65 font-medium">Birthday · 14 June</p>
                  <p className="serif text-white text-xl mt-1.5 leading-[1.1]">Tunde<br />turns 30</p>
                  <p className="text-white/60 text-[11px] mt-1">For Tunde Bakare</p>
                </div>
              </div>

              {/* Message card */}
              <div
                className="absolute bg-white rounded-[22px] shadow-2xl p-5"
                style={{
                  width: 195, height: "auto",
                  right: 0, top: 220,
                  transform: "rotate(4deg)",
                  zIndex: 2,
                  animation: "floatY 12s ease-in-out infinite 2.5s",
                }}
              >
                <p className="serif text-ink text-sm leading-snug">
                  &ldquo;You&apos;ve changed my life. Happy birthday, my love.&rdquo;
                </p>
                <p className="text-[10px] uppercase tracking-wide text-ink/40 mt-2.5">— Chidinma</p>
              </div>

              {/* Gift pill */}
              <div
                className="absolute bg-white rounded-2xl shadow-card px-5 py-3.5"
                style={{
                  bottom: 12, left: 20,
                  zIndex: 3,
                  animation: "floatY 7s ease-in-out infinite 1.2s",
                }}
              >
                <p className="text-[9px] uppercase tracking-[0.28em] text-ink/40">Raised</p>
                <p className="serif text-2xl mt-0.5" style={{ color: "var(--accent)" }}>₦47,500</p>
                <p className="text-[10px] text-ink/40 mt-0.5">from 23 contributors</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-10 py-20">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-10 text-center">How it works</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { num: "01", title: "Create a page", body: "Pick a theme, write about the celebrant, set a date — two minutes flat." },
            { num: "02", title: "Friends pile on", body: "Share the link on WhatsApp. Everyone leaves voice notes, videos, photos and a cash gift." },
            { num: "03", title: "They unwrap it", body: "A cinematic play-through of every message, then the gift lands in their bank account." },
          ].map(({ num, title, body }) => (
            <div key={num} className="card flex flex-col gap-4">
              <span className="serif text-[56px] leading-none text-ink/8">{num}</span>
              <div>
                <p className="serif text-xl text-ink">{title}</p>
                <p className="text-ink/55 text-sm mt-2 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample cards ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-10 pb-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-8">Messages in the wild</p>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="polaroid polaroid--a tint-1 md:rotate-0">
            <p className="serif text-ink text-xl leading-tight">happy birthday tunde 🎂</p>
            <p className="mt-4 text-[10px] uppercase tracking-wide text-ink/55">— ada</p>
          </div>
          <div className="polaroid polaroid--b tint-3 md:rotate-0">
            <p className="serif text-ink text-xl leading-tight">&ldquo;you are loved more than you know&rdquo;</p>
            <p className="mt-4 text-[10px] uppercase tracking-wide text-ink/55">— anonymous</p>
          </div>
          <div className="polaroid polaroid--c tint-5 md:rotate-0">
            <p className="serif text-ink text-xl leading-tight">to many many more 🥂</p>
            <p className="mt-4 text-[10px] uppercase tracking-wide text-ink/55">— chika</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="theme-mesh py-20 text-center px-5">
        <Sparkles count={8} />
        <h2 className="serif text-ink text-[44px] md:text-[56px] leading-[0.92]">Ready to celebrate?</h2>
        <p className="text-ink/60 mt-4 text-lg max-w-xs mx-auto">It only takes two minutes to set up.</p>
        <Link href="/create" className="btn-accent text-base py-4 px-10 shadow-glow mt-8 inline-flex">
          Start a celebration
        </Link>
      </section>

    </main>
  );
}
