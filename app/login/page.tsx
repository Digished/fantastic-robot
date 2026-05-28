import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const { next, error, message } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Welcome back.</h1>
        <p className="text-ink/65 mt-3">Sign in to manage your celebrations.</p>
        {message && (
          <p className="mt-4 text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-3">
            {decodeURIComponent(message)}
          </p>
        )}
        <LoginForm next={next} error={error} />
        <p className="mt-8 text-sm text-ink/60 text-center">
          New here? <Link href="/signup" className="text-[var(--accent)] font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
