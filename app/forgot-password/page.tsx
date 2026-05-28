import Link from "next/link";
import { sendResetCode } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/login" className="text-ink/55 text-sm">← Back to sign in</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Reset your password.</h1>
        <p className="text-ink/65 mt-3">
          Enter your email and we&apos;ll send you a 6-digit code to reset your password.
        </p>

        <form action={sendResetCode} className="mt-10 space-y-4">
          <div className="space-y-1.5">
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>}
          <button className="btn-accent w-full py-4 shadow-soft">Send code</button>
        </form>
      </div>
    </main>
  );
}
