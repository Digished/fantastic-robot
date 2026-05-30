import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: { searchParams: Promise<{ error?: string; invite?: string }> }) {
  const { error, invite } = await searchParams;
  // Preserve an invite through the sign-in path too, so existing users get
  // friended after logging in.
  const signinHref = invite
    ? `/login?next=${encodeURIComponent(`/i/${invite}`)}`
    : "/login";
  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Start a<br/>celebration.</h1>
        <p className="text-ink/65 mt-3">It takes a minute. No confirmation email.</p>
        <SignupForm error={error} invite={invite} />
        <p className="mt-8 text-sm text-ink/60 text-center">
          Already have one? <Link href={signinHref} className="text-[var(--accent)] font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
