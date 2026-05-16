import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Start a<br/>celebration.</h1>
        <p className="text-ink/65 mt-3">It takes a minute. No confirmation email.</p>

        <form action={signup} className="mt-10 space-y-4">
          <div className="space-y-1.5">
            <label className="label">Your name</label>
            <input className="field" name="displayName" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <label className="label">Email</label>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Password</label>
            <input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-accent w-full py-4 shadow-soft">Create account</button>
        </form>

        <p className="mt-8 text-sm text-ink/60 text-center">
          Already have one? <Link href="/login" className="text-[var(--accent)] font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
