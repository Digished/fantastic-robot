import Link from "next/link";

export default function Landing() {
  return (
    <main className="relative min-h-[100dvh] mesh-warm grain overflow-hidden">
      {/* Floating decorative orbs */}
      <span className="float-slow absolute -top-8 -left-10 size-40 rounded-full bg-terracotta/30 blur-2xl" style={{ ["--r" as never]: "8deg" }} />
      <span className="float-slow absolute top-1/3 -right-12 size-52 rounded-full bg-gold/30 blur-3xl" style={{ ["--r" as never]: "-6deg", animationDelay: "1.5s" }} />
      <span className="float-slow absolute bottom-20 left-1/3 size-32 rounded-full bg-plum/15 blur-2xl" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <header className="px-5 pt-6 flex items-center justify-between">
          <span className="font-serif text-2xl text-plum">Spendbox</span>
          <Link href="/login" className="text-sm text-plum/70 hover:text-plum">Sign in</Link>
        </header>

        <section className="flex-1 px-5 flex flex-col justify-center max-w-md mx-auto w-full pb-16">
          <p className="fade-up text-xs uppercase tracking-[0.25em] text-plum/60">
            For Nigeria · with love
          </p>
          <h1 className="fade-up mt-4 font-serif text-[64px] leading-[0.95] text-plum">
            celebrate <em className="text-terracotta not-italic">together</em>
          </h1>
          <p className="fade-up mt-5 text-plum/75 text-lg leading-relaxed" style={{ animationDelay: ".05s" }}>
            A beautiful page friends can fill with voice notes, video greetings
            and a group gift. Share it once on WhatsApp.
          </p>

          <div className="fade-up mt-10 flex flex-col gap-3" style={{ animationDelay: ".1s" }}>
            <Link href="/create" className="btn-accent text-base py-4 shadow-glow">
              Start a celebration
            </Link>
            <Link href="/login" className="btn-glass text-base py-4">
              I have an account
            </Link>
          </div>

          {/* Sample card stack */}
          <div className="fade-up relative mt-16 h-44" style={{ animationDelay: ".15s" }}>
            <div className="polaroid polaroid--a tint-2 absolute left-2 top-2 w-44">
              <p className="font-serif text-plum text-lg leading-tight">happy birthday tunde 🎂</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-plum/50">— ada</p>
            </div>
            <div className="polaroid polaroid--b tint-4 absolute right-2 top-6 w-44">
              <p className="font-serif text-plum text-lg leading-tight">"you are loved more than you know"</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-plum/50">— anonymous</p>
            </div>
            <div className="polaroid polaroid--c tint-1 absolute left-1/2 -translate-x-1/2 top-20 w-40">
              <p className="font-serif text-plum text-base leading-tight">to many many more 🥂</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-plum/50">— chika</p>
            </div>
          </div>
        </section>

        <footer className="relative z-10 px-5 py-6 text-center text-xs text-plum/50">
          ₦ delivered straight to the bank · powered by Paystack
        </footer>
      </div>
    </main>
  );
}
