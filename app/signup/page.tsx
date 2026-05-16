import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-[100dvh] px-5 pt-10 max-w-md mx-auto">
      <Link href="/" className="text-plum/60 text-sm">← Back</Link>
      <h1 className="font-serif text-4xl mt-6 text-plum">Start a celebration</h1>
      <p className="text-plum/70 mt-2">It takes a minute. No confirmation email.</p>

      <form action={signup} className="mt-8 space-y-4">
        <div className="space-y-1">
          <label className="label">Your name</label>
          <input className="field" name="displayName" autoComplete="name" />
        </div>
        <div className="space-y-1">
          <label className="label">Email</label>
          <input className="field" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1">
          <label className="label">Password</label>
          <input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {error && <p className="text-sm text-terracotta">{error}</p>}
        <button className="btn-primary w-full py-4">Create account</button>
      </form>

      <p className="mt-6 text-sm text-plum/70 text-center">
        Already have one? <Link href="/login" className="text-terracotta">Sign in</Link>
      </p>
    </main>
  );
}
