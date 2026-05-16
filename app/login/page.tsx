import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Welcome back.</h1>
        <p className="text-ink/65 mt-3">Sign in to manage your celebrations.</p>

        <form action={login} className="mt-10 space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="space-y-1.5">
            <label className="label">Email</label>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Password</label>
            <input className="field" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-accent w-full py-4 shadow-soft">Sign in</button>
        </form>

        <p className="mt-8 text-sm text-ink/60 text-center">
          New here? <Link href="/signup" className="text-[var(--accent)] font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
