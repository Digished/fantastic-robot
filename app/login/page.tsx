import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return <Form sp={searchParams} />;
}

async function Form({ sp }: { sp: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await sp;
  return (
    <main className="min-h-[100dvh] px-5 pt-10 max-w-md mx-auto">
      <Link href="/" className="text-plum/60 text-sm">← Back</Link>
      <h1 className="font-serif text-4xl mt-6 text-plum">Welcome back</h1>
      <p className="text-plum/70 mt-2">Sign in to manage your celebrations.</p>

      <form action={login} className="mt-8 space-y-4">
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
        <button className="btn-primary w-full py-4">Sign in</button>
      </form>

      <p className="mt-6 text-sm text-plum/70 text-center">
        New here? <Link href="/signup" className="text-terracotta">Create an account</Link>
      </p>
    </main>
  );
}
