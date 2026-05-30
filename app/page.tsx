import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Mic, Video, Gift, Sparkles as SparklesIcon, Wand2, Palette, Music,
  Image as ImageIcon, Users, ShieldCheck, Lock, Banknote, Share2, Play,
  Check, PartyPopper, ArrowRight, Cake, Repeat, ListChecks, CalendarClock,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Sparkles } from "@/components/sparkles";
import { Reveal } from "@/components/reveal";
import { SealedPreview } from "@/components/sealed-preview";
import { BIRTHDAY_ONLY } from "@/lib/features";

const SELF_HIGHLIGHTS = [
  { icon: Lock, title: "Sealed until the day", body: "Messages and gifts stay a surprise — even from you. Nobody peeks until the date arrives." },
  { icon: CalendarClock, title: "A countdown to the moment", body: "Friends land on a live countdown and a way to chip in, building the anticipation." },
  { icon: ListChecks, title: "Add a wishlist", body: "Share a few things you'd love so the group gift goes toward what matters to you." },
  { icon: Repeat, title: "Renews every year", body: "Set a birthday once and the page rolls forward automatically — every single year." },
];


const FEATURES = [
  {
    icon: Mic,
    title: "Voice notes & video",
    body: "Friends record a voice note (up to 20s) or a video (up to 15s) right in the browser — or upload one from their gallery.",
  },
  {
    icon: Gift,
    title: "Interactive surprises",
    body: "Messages arrive as things to open — gift boxes, scratch cards, polaroids, balloons, cake and more. Eleven playful ways to say it.",
  },
  {
    icon: Wand2,
    title: "AI-crafted opening",
    body: "A warm, personalised opening sets the scene before your friends' messages begin to play.",
  },
  {
    icon: Palette,
    title: "16 beautiful themes",
    body: "Pick a palette that fits your vibe — from soft Ivory to deep Midnight — and the whole page transforms.",
  },
  {
    icon: Music,
    title: "Background music",
    body: "Choose from a free library of looping tracks — Happy Birthday and more — that play gently through the celebration.",
  },
  {
    icon: ImageIcon,
    title: "Photo & video gallery",
    body: "Add up to 20 photos and clips that play as full-screen memories during the cinematic opening.",
  },
];

const STEPS = [
  { num: "01", title: "Set up your page", body: "Add your date of birth, pick a theme and a song, and choose where the gift goes — about two minutes." },
  { num: "02", title: "Friends pile on", body: "Share the link in your group chat. Everyone adds voice notes, videos, photos and a cash gift — no account needed." },
  { num: "03", title: "You unwrap it", body: "On the day, relive every message — then the pooled gift lands in your bank account." },
];

const TIMELINE = [
  { label: "Page created", note: "You publish and share the link" },
  { label: "Friends contribute", note: "Messages and gifts collect on the wall" },
  { label: "Collection closes", note: "72 hours before the big day" },
  { label: "They receive it", note: "One tap on the celebration date" },
];

const ROLES = [
  { icon: Cake, title: "You", body: "Add your date of birth, pick a theme and a song, and share your page link with everyone who loves you." },
  { icon: Users, title: "Your friends", body: "Open the link, leave a heartfelt message or media card, and chip in to the group gift. No sign-up — anonymous if they like." },
  { icon: Gift, title: "On the day", body: "Relive every message, then receive the pooled cash gift straight to your bank in one tap." },
];

const TRUST = [
  { icon: Lock, title: "Held in escrow", body: "Every contribution sits safely with Paystack until the celebration date — never touched early." },
  { icon: ShieldCheck, title: "Bank-verified payout", body: "The recipient's account is checked and locked at setup. The gift can only ever go there." },
  { icon: Banknote, title: "Secure payments", body: "All charges run through Paystack, with verified webhooks and duplicate protection on every transaction." },
  { icon: Users, title: "Anonymous option", body: "Contributors can hide their name and post as “Someone special” — the sentiment, not the spotlight." },
];

const MESSAGES = [
  { text: "happy birthday tunde 🎂", who: "ada", tint: "tint-1", rot: "polaroid--a" },
  { text: "“you are loved more than you know”", who: "anonymous", tint: "tint-3", rot: "polaroid--b" },
  { text: "to many many more 🥂", who: "chika", tint: "tint-5", rot: "polaroid--c" },
  { text: "couldn’t be there in person but my whole heart is", who: "emeka", tint: "tint-2", rot: "polaroid--d" },
  { text: "watching you grow has been the gift ❤️", who: "mum", tint: "tint-4", rot: "polaroid--e" },
  { text: "proud of you every single day", who: "david", tint: "tint-1", rot: "polaroid--a" },
];

const FAQ = [
  {
    q: "Can I make a page for myself?",
    a: "Yes. Set up your own birthday or milestone page and it stays sealed — a surprise even from you — until the day. Friends leave messages and chip in to a group gift, you can add a wishlist, and birthdays renew automatically every year. It's free to create your own page.",
  },
  {
    q: "How much does it cost?",
    a: "Creating a page for someone else is a one-time ₦500 — your own page is free. Contributing is free for friends — a small 5% fee is added on top of each gift, so the celebrant always receives the full amount chosen. The minimum contribution is ₦500.",
  },
  {
    q: "When does the recipient get the money?",
    a: "Contributions close 72 hours before the celebration date. On the day, the recipient taps once to receive everything — it transfers straight to the bank account verified at setup.",
  },
  {
    q: "Is the money safe?",
    a: "Yes. Every contribution is held in escrow with Paystack and can only ever be paid out to the recipient's pre-verified, locked bank account.",
  },
  {
    q: "Do friends need an account?",
    a: "No. Anyone with the link can leave a message or contribute without signing up — and they can post anonymously if they prefer.",
  },
  {
    q: "What can friends post?",
    a: "Text notes, voice notes up to 20 seconds, videos up to 15 seconds, and photos — recorded in the browser or uploaded from their device.",
  },
  {
    q: "How do I share it?",
    a: "Copy the link and drop it in your group chat or WhatsApp. New messages appear on the wall in real time as friends add them.",
  },
];

// Birthdays-only FAQ — avoids advertising the hidden "for someone else" flow.
const FAQ_BIRTHDAY = [
  {
    q: "How does it work?",
    a: "Add your date of birth and we set up your birthday page. It stays sealed — a surprise even from you — until the day. Friends leave messages and chip in to a group gift, you can add a wishlist, and the page renews automatically every year. Creating your page is free.",
  },
  {
    q: "How much does it cost?",
    a: "Creating your birthday page is free. Contributing is free for friends — a small 5% fee is added on top of each gift, so you always receive the full amount chosen. The minimum contribution is ₦500.",
  },
  {
    q: "When do I get the money?",
    a: "Contributions close 72 hours before your birthday. On the day, you tap once to receive everything — it transfers straight to the bank account verified at setup.",
  },
  {
    q: "Is the money safe?",
    a: "Yes. Every contribution is held in escrow with Paystack and can only ever be paid out to your pre-verified, locked bank account.",
  },
  {
    q: "Do friends need an account?",
    a: "No. Anyone with the link can leave a message or contribute without signing up — and they can post anonymously if they prefer.",
  },
  {
    q: "What can friends post?",
    a: "Text notes, voice notes up to 20 seconds, videos up to 15 seconds, and photos — recorded in the browser or uploaded from their device.",
  },
  {
    q: "How do I share it?",
    a: "Copy the link and drop it in your group chat or WhatsApp. New messages appear on the wall in real time as friends add them.",
  },
];

export default async function Landing() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const faq = BIRTHDAY_ONLY ? FAQ_BIRTHDAY : FAQ;

  return (
    <main data-theme="ivory" className="min-h-[100dvh] bg-white overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-ink/5">
        <div className="mx-auto max-w-6xl px-5 md:px-10 py-4 flex items-center justify-between">
          <span className="serif text-2xl text-ink">Spendbox</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink/65 hover:text-ink transition">Sign in</Link>
            {BIRTHDAY_ONLY ? (
              <Link href="/create/me" className="btn-accent shadow-soft text-sm py-2.5 hidden md:inline-flex items-center gap-2">
                <Cake className="size-4" /> Create my birthday page
              </Link>
            ) : (
              <Link href="/create" className="btn-accent shadow-soft text-sm py-2.5 hidden md:inline-flex">
                Start a celebration
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="theme-mesh relative overflow-hidden">
        <Sparkles count={18} />

        <div className="mx-auto max-w-6xl px-5 md:px-10 py-16 md:py-24 md:grid md:grid-cols-2 md:gap-16 md:items-center">

          {/* Left: Copy */}
          <div className="md:order-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/50 mb-6 fade-up">Birthdays, reimagined</p>
            <h1 className="fade-up serif text-ink text-[52px] md:text-[68px] leading-[0.9]" style={{ animationDelay: "60ms" }}>
              Celebrate Together,<br />
              <em className="shimmer-text not-italic">Perfectly</em>
            </h1>
            <p className="fade-up mt-6 text-ink/65 text-lg leading-relaxed max-w-sm" style={{ animationDelay: "120ms" }}>
              {BIRTHDAY_ONLY
                ? <>Add your date of birth and we set up your own birthday page — sealed until the day, while the people who love you fill it with messages and cash gifts. It renews automatically every year.</>
                : <>Create a beautiful group surprise page filled with heartfelt messages, voice notes, photos, and cash gifts — delivered straight to their bank account. Or set up your own page and let everyone surprise <em className="not-italic text-[var(--accent)]">you</em>.</>}
            </p>
            <div className="fade-up mt-9 flex flex-col sm:flex-row gap-3 max-w-sm" style={{ animationDelay: "180ms" }}>
              {BIRTHDAY_ONLY ? (
                <Link href="/create/me" className="btn-accent text-base py-4 shadow-glow flex-1 text-center inline-flex items-center justify-center gap-2">
                  <Cake className="size-4" /> Create my birthday page
                </Link>
              ) : (
                <>
                  <Link href="/create" className="btn-accent text-base py-4 shadow-glow flex-1 text-center">
                    Start a celebration
                  </Link>
                  <Link href="/create/me" className="btn-outline text-base py-4 flex-1 text-center inline-flex items-center justify-center gap-2">
                    <Cake className="size-4" /> Make my page
                  </Link>
                </>
              )}
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
                  <p className="text-[8px] uppercase tracking-[0.28em] text-white/65 font-medium">Birthday · 22 Aug</p>
                  <p className="serif text-white text-lg mt-1 leading-[1.1]">Amara<br />turns 27</p>
                  <p className="text-white/60 text-[10px] mt-0.5">Amara&apos;s big day</p>
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

        {/* Marquee trust strip */}
        <div className="border-t border-ink/8 bg-white/55 backdrop-blur">
          <div className="mx-auto max-w-6xl px-5 md:px-10 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] text-ink/55">
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[var(--accent)]" /> Powered by Paystack</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[var(--accent)]" /> Bank-verified payouts</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[var(--accent)]" /> No account needed to contribute</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[var(--accent)]" /> Funds held safely in escrow</span>
          </div>
        </div>
      </section>

      {/* ── Two ways to celebrate (full product only) ── */}
      {!BIRTHDAY_ONLY && (
      <section className="mx-auto max-w-6xl px-5 md:px-10 py-20 md:py-28">
        <Reveal className="text-center max-w-xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Two ways to celebrate</p>
          <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
            For someone you love — or your own big day
          </h2>
          <p className="text-ink/60 mt-4 text-base leading-relaxed">
            Plan a surprise for a friend, or make your own page and let the people who love you pile on.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-4 mt-12">
          <Reveal>
            <div className="card h-full flex flex-col gap-4 hover:shadow-card transition-shadow">
              <span className="size-12 rounded-2xl grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <PartyPopper className="size-5" />
              </span>
              <div>
                <p className="serif text-2xl text-ink">Celebrate someone</p>
                <p className="text-ink/55 text-sm mt-2 leading-relaxed">
                  Build a surprise page for a friend. Pick a theme, gather everyone&apos;s messages, and send the pooled gift to their account on the day.
                </p>
              </div>
              <ul className="space-y-2 mt-1">
                {["Set the theme, music and cover", "Friends add messages & a cash gift", "Lands in their bank in one tap"].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-ink/70">
                    <Check className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" /> {line}
                  </li>
                ))}
              </ul>
              <Link href="/create" className="btn-accent shadow-soft mt-auto inline-flex items-center justify-center gap-2">
                Start a celebration <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="card h-full flex flex-col gap-4 hover:shadow-card transition-shadow relative overflow-hidden">
              <span className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-soft)] rounded-full px-2.5 py-1">
                New
              </span>
              <span className="size-12 rounded-2xl grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <Cake className="size-5" />
              </span>
              <div>
                <p className="serif text-2xl text-ink">Set up your own page</p>
                <p className="text-ink/55 text-sm mt-2 leading-relaxed">
                  Make your own birthday or milestone page. It stays sealed — a surprise even from you — while friends fill it with messages and gifts.
                </p>
              </div>
              <ul className="space-y-2 mt-1">
                {["Sealed until your day arrives", "Add a wishlist for the group gift", "Renews every year for birthdays"].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-ink/70">
                    <Check className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" /> {line}
                  </li>
                ))}
              </ul>
              <Link href="/create/me" className="btn-accent shadow-soft mt-auto inline-flex items-center justify-center gap-2">
                Make my page <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      )}

      {/* ── Self-page spotlight ── */}
      <section className="theme-mesh py-20 md:py-28 overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 md:px-10 md:grid md:grid-cols-2 md:gap-16 md:items-center">
          <Reveal className="mx-auto w-full max-w-[360px] md:max-w-none order-2 md:order-1 mt-10 md:mt-0">
            <SealedPreview />
          </Reveal>

          <Reveal delay={120} className="order-1 md:order-2 mt-12 md:mt-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Your own page</p>
            <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
              Sealed until your day arrives
            </h2>
            <p className="text-ink/60 mt-4 text-base leading-relaxed">
              Share the link and watch the countdown begin. Friends leave notes and chip in, but it all stays hidden —
              even from you — until the date. Then you press play, relive every message, and the pooled gift lands in your account.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {SELF_HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <span className="size-10 shrink-0 rounded-2xl grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="text-xs text-ink/55 mt-1 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/create/me" className="btn-accent shadow-soft mt-9 inline-flex items-center gap-2">
              Make my page <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-10 py-20 md:py-28">
        <Reveal className="text-center max-w-xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Everything inside</p>
          <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
            More than a card. A whole celebration.
          </h2>
          <p className="text-ink/60 mt-4 text-base leading-relaxed">
            Spendbox turns the usual birthday group chat into one beautiful page the whole circle builds together.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <div className="card h-full flex flex-col gap-4 hover:shadow-card transition-shadow">
                <span
                  className="size-12 rounded-2xl grid place-items-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="serif text-xl text-ink">{title}</p>
                  <p className="text-ink/55 text-sm mt-2 leading-relaxed">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="theme-mesh py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 md:px-10">
          <Reveal className="text-center max-w-xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">How it works</p>
            <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
              Three steps to a perfect surprise
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {STEPS.map(({ num, title, body }, i) => (
              <Reveal key={num} delay={i * 110}>
                <div className="card h-full flex flex-col gap-4 bg-white/90">
                  <span className="serif text-[56px] leading-none text-ink/10">{num}</span>
                  <div>
                    <p className="serif text-xl text-ink">{title}</p>
                    <p className="text-ink/55 text-sm mt-2 leading-relaxed">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cinematic play-through ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-10 py-20 md:py-28 md:grid md:grid-cols-2 md:gap-16 md:items-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">The big reveal</p>
          <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
            A surprise worth pressing play on
          </h2>
          <p className="text-ink/60 mt-4 text-base leading-relaxed">
            On the celebration day, the page becomes a full-screen, cinematic experience. A personalised opening leads
            into every message — voice notes, videos and photos — set to background music that softens whenever a clip
            plays. It ends with the moment that matters most: the group gift, revealed.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Personalised AI opening built from your words",
              "Each message animated as its own beautiful slide",
              "Background music that ducks under voice notes & video",
              "A final gift reveal — claimed in a single tap",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-ink/70">
                <span className="mt-0.5 size-5 shrink-0 rounded-full grid place-items-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <Check className="size-3" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="mt-10 md:mt-0">
          <div className="relative aspect-[4/5] rounded-3xl2 overflow-hidden shadow-card bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://hxhjbqmzhpmfmyrmtmhr.supabase.co/storage/v1/object/public/landingpage-assets/happy%20child.png"
              alt="A child celebrating"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/75" />
            <div className="absolute inset-0 grid place-items-center">
              <span
                className="inline-grid place-items-center size-20 rounded-full float-y shadow-glow"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Play className="size-8 fill-current translate-x-0.5" />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="serif text-3xl text-white leading-tight">For Tunde</p>
              <p className="text-white/70 text-sm mt-1">23 messages · ₦47,500 raised</p>
              <div className="mt-4 flex gap-1.5">
                {[100, 100, 64, 0, 0, 0].map((w, idx) => (
                  <span key={idx} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                    <span className="block h-full rounded-full bg-white" style={{ width: `${w}%` }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Group gift / money model ── */}
      <section className="bg-[var(--accent-soft)] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 md:px-10">
          <Reveal className="text-center max-w-xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">One gift, from everyone</p>
            <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
              The whole group chips in together
            </h2>
            <p className="text-ink/60 mt-4 text-base leading-relaxed">
              No chasing transfers or holding cash. Friends contribute on the page, the money pools safely, and the
              celebrant receives it all at once.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              { big: "Free", label: "Creating your birthday page costs nothing." },
              { big: "₦500", label: "Minimum contribution — everyone can join in." },
              { big: "5%", label: "Small fee added on top, so the gift stays whole." },
              { big: "1 tap", label: "To receive the pooled gift on the day." },
            ].map(({ big, label }, i) => (
              <Reveal key={label} delay={(i % 4) * 80}>
                <div className="card h-full text-center">
                  <p className="serif text-4xl" style={{ color: "var(--accent)" }}>{big}</p>
                  <p className="text-ink/60 text-sm mt-2 leading-relaxed">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Lifecycle timeline */}
          <Reveal delay={120}>
            <div className="mt-10 card bg-white">
              <div className="grid sm:grid-cols-4 gap-6 sm:gap-3">
                {TIMELINE.map(({ label, note }, i) => (
                  <div key={label} className="relative sm:text-center">
                    <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                      <span
                        className="size-8 shrink-0 rounded-full grid place-items-center text-xs font-semibold text-white"
                        style={{ background: "var(--accent)" }}
                      >
                        {i + 1}
                      </span>
                      {i < TIMELINE.length - 1 && (
                        <span className="hidden sm:block absolute top-4 left-1/2 w-full h-px bg-ink/10" />
                      )}
                      <div className="sm:mt-1">
                        <p className="text-sm font-medium text-ink">{label}</p>
                        <p className="text-xs text-ink/50 mt-0.5">{note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-10 py-20 md:py-28">
        <Reveal className="text-center max-w-xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Who does what</p>
          <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
            Everyone has a part to play
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {ROLES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 110}>
              <div className="card h-full flex flex-col gap-4">
                <span
                  className="size-12 rounded-2xl grid place-items-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="serif text-xl text-ink">{title}</p>
                  <p className="text-ink/55 text-sm mt-2 leading-relaxed">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Trust & safety ── */}
      <section className="theme-mesh py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 md:px-10">
          <Reveal className="text-center max-w-xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Safe by design</p>
            <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
              Built so the gift is never at risk
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4 mt-12">
            {TRUST.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={(i % 2) * 90}>
                <div className="card h-full bg-white/90 flex gap-4">
                  <span
                    className="size-11 shrink-0 rounded-2xl grid place-items-center"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="serif text-lg text-ink">{title}</p>
                    <p className="text-ink/55 text-sm mt-1.5 leading-relaxed">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Messages marquee ── */}
      <section className="py-20 md:py-28 overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 md:px-10">
          <Reveal>
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-3">Messages in the wild</p>
            <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95] max-w-md">
              The words people leave
            </h2>
          </Reveal>
        </div>
        <div className="mt-12 relative">
          <div className="flex gap-5 w-max marquee hover:[animation-play-state:paused]">
            {[...MESSAGES, ...MESSAGES].map((m, i) => (
              <div key={i} className={`polaroid ${m.rot} ${m.tint} w-64 shrink-0`}>
                <p className="serif text-ink text-xl leading-tight">{m.text}</p>
                <p className="mt-4 text-[10px] uppercase tracking-wide text-ink/55">— {m.who}</p>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-5 md:px-10 py-20 md:py-28">
        <Reveal className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-4">Good to know</p>
          <h2 className="serif text-ink text-[38px] md:text-[48px] leading-[0.95]">
            Questions, answered
          </h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {faq.map(({ q, a }, i) => (
            <Reveal key={q} delay={(i % 3) * 70}>
              <details className="group card cursor-pointer">
                <summary className="flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                  <span className="serif text-lg text-ink">{q}</span>
                  <span
                    className="size-7 shrink-0 rounded-full grid place-items-center transition-transform group-open:rotate-45"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <span className="text-lg leading-none">+</span>
                  </span>
                </summary>
                <p className="text-ink/60 text-sm mt-3 leading-relaxed">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="theme-mesh py-20 md:py-28 text-center px-5 relative overflow-hidden">
        <Sparkles count={12} />
        <Reveal>
          <span
            className="inline-grid place-items-center size-14 rounded-full mb-6 float-y"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <SparklesIcon className="size-6" />
          </span>
          <h2 className="serif text-ink text-[44px] md:text-[60px] leading-[0.92]">Ready to celebrate?</h2>
          <p className="text-ink/60 mt-4 text-lg max-w-sm mx-auto">
            {BIRTHDAY_ONLY
              ? "Add your date of birth and your birthday page sets itself up — renewed every year."
              : "Start a page in two minutes — for someone you love, or your own big day."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            {BIRTHDAY_ONLY ? (
              <Link href="/create/me" className="btn-accent text-base py-4 px-10 shadow-glow inline-flex items-center gap-2">
                <Cake className="size-4" /> Create my birthday page
              </Link>
            ) : (
              <>
                <Link href="/create" className="btn-accent text-base py-4 px-10 shadow-glow inline-flex items-center gap-2">
                  Start a celebration <ArrowRight className="size-4" />
                </Link>
                <Link href="/create/me" className="btn-outline text-base py-4 px-10 inline-flex items-center gap-2">
                  <Cake className="size-4" /> Make my page
                </Link>
              </>
            )}
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink/8">
        <div className="mx-auto max-w-6xl px-5 md:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="serif text-xl text-ink">Spendbox</span>
          <p className="text-xs text-ink/45">Beautiful birthdays, celebrated together.</p>
          <div className="flex items-center gap-5 text-sm text-ink/60">
            <Link href="/login" className="hover:text-ink transition">Sign in</Link>
            {!BIRTHDAY_ONLY && (
              <Link href="/create" className="hover:text-ink transition">Start a celebration</Link>
            )}
            <Link href="/create/me" className="hover:text-ink transition">
              {BIRTHDAY_ONLY ? "Create my birthday page" : "Make my page"}
            </Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
