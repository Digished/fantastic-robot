import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="px-5 pt-6 flex items-center justify-between">
        <span className="font-serif text-2xl text-plum">Spendbox</span>
        <Link href="/login" className="text-sm text-plum/70 hover:text-plum">Sign in</Link>
      </header>

      <section className="flex-1 px-5 flex flex-col justify-center max-w-md mx-auto w-full">
        <h1 className="font-serif text-5xl leading-[1.05] text-plum">
          Celebrate the people you love, together.
        </h1>
        <p className="mt-5 text-plum/70 text-lg">
          Build a beautiful page. Friends drop voice notes, video greetings and a
          group gift. Share it on WhatsApp.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/create" className="btn-primary text-base py-4">
            Create a celebration
          </Link>
          <Link href="/login" className="btn-outline text-base py-4">
            I have an account
          </Link>
        </div>
      </section>

      <footer className="px-5 py-6 text-center text-xs text-muted">
        Made for Nigeria · ₦ paid out instantly on the day
      </footer>
    </main>
  );
}
