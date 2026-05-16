import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="relative min-h-[100dvh] mesh-warm grain">
      <div className="relative z-10 px-5 pt-10 max-w-md mx-auto">
        <Link href="/" className="text-plum/60 text-sm">← Back</Link>
        <h1 className="font-serif text-5xl mt-8 text-plum leading-[0.95]">Welcome back.</h1>
        <p className="text-plum/70 mt-3">Sign in to manage your celebrations.</p>

        <form action={login} className="mt-10 space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="space-y-1">
            <label className="label">Email</label>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1">
            <label className="label">Password</label>
            <input className="field" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-terracotta">{error}</p>}
          <button className="btn-accent w-full py-4 shadow-soft">Sign in</button>
        </form>

        <p className="mt-8 text-sm text-plum/70 text-center">
          New here? <Link href="/signup" className="text-terracotta font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
