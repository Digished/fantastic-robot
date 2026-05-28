import Link from "next/link";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyResetPage({
  searchParams,
}: { searchParams: Promise<{ email?: string; error?: string }> }) {
  const { email = "", error } = await searchParams;

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="page-shell pt-10">
        <Link href="/forgot-password" className="text-ink/55 text-sm">← Back</Link>
        <h1 className="serif text-5xl mt-8 text-ink">Check your email.</h1>
        <p className="text-ink/65 mt-3">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-ink">{email || "your email"}</span>.
          Enter it below along with your new password.
        </p>
        <VerifyForm email={email} error={error ? decodeURIComponent(error) : undefined} />
      </div>
    </main>
  );
}
