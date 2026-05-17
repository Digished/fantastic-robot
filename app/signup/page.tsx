import Link from "next/link";
import { SignupForm } from "./SignupForm";

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
        <SignupForm error={error} />
        <p className="mt-8 text-sm text-ink/60 text-center">
          Already have one? <Link href="/login" className="text-[var(--accent)] font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
