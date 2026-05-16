import Link from "next/link";
import { THEMES } from "@/lib/themes";

export default function Landing() {
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell">
        <header className="pt-6 flex items-center justify-between">
          <span className="serif text-2xl text-ink">Spendbox</span>
          <Link href="/login" className="text-sm text-ink/65 hover:text-ink">Sign in</Link>
        </header>

        <section className="pt-14 pb-16">
          <p className="fade-up text-[11px] uppercase tracking-[0.3em] text-ink/55">
            For Nigeria · with love
          </p>
          <h1 className="fade-up mt-4 serif text-ink text-[56px] sm:text-[64px] leading-[0.95]">
            celebrate <em className="text-[var(--accent)] not-italic">together</em>
          </h1>
          <p className="fade-up mt-5 text-ink/70 text-lg leading-relaxed" style={{ animationDelay: ".05s" }}>
            Build a beautiful page. Friends drop voice notes, video greetings
            and a group gift. Share it once on WhatsApp.
          </p>

          <div className="fade-up mt-10 flex flex-col gap-3" style={{ animationDelay: ".08s" }}>
            <Link href="/create" className="btn-accent text-base py-4 shadow-glow">
              Start a celebration
            </Link>
            <Link href="/login" className="btn-outline text-base py-4">
              I have an account
            </Link>
          </div>
        </section>

        {/* Sample card stack */}
        <section className="pb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/50 mb-4">A wall in motion</p>
          <div className="relative h-56">
            <div className="polaroid polaroid--a tint-1 absolute left-0 top-2 w-44">
              <p className="serif text-ink text-lg leading-tight">happy birthday tunde 🎂</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— ada</p>
            </div>
            <div className="polaroid polaroid--b tint-3 absolute right-0 top-8 w-44">
              <p className="serif text-ink text-lg leading-tight">"you are loved more than you know"</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— anonymous</p>
            </div>
            <div className="polaroid polaroid--c tint-5 absolute left-1/2 -translate-x-1/2 top-24 w-40">
              <p className="serif text-ink text-base leading-tight">to many many more 🥂</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-ink/55">— chika</p>
            </div>
          </div>
        </section>

        {/* Themes preview */}
        <section className="pb-20">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/50 mb-3">Pick a vibe</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <div key={t.id} className="rounded-2xl p-3 shadow-ring relative overflow-hidden"
                   style={{ background: t.swatch }}>
                <span className="block aspect-[5/4] w-full" />
                <span className={`absolute bottom-2 left-2 right-2 text-[10px] uppercase tracking-widest rounded-full px-2 py-1 backdrop-blur ${t.id === "midnight" ? "bg-white/15 text-white" : "bg-white/70 text-ink"}`}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-10 text-center text-xs text-ink/45">
          ₦ delivered straight to the bank · powered by Paystack
        </footer>
      </div>
    </main>
  );
}
