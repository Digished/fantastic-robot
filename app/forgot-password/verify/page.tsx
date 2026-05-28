"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { verifyCodeAndReset } from "../actions";

export default function VerifyResetPage({
  searchParams,
}: { searchParams: { email?: string; error?: string } }) {
  const email = searchParams.email ?? "";
  const error = searchParams.error ? decodeURIComponent(searchParams.error) : undefined;
  const [show, setShow] = useState(false);

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

        <form action={verifyCodeAndReset} className="mt-10 space-y-4">
          <input type="hidden" name="email" value={email} />

          <div className="space-y-1.5">
            <label className="label" htmlFor="token">6-digit code</label>
            <input
              id="token"
              className="field tracking-[0.3em] text-center text-lg"
              name="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="label" htmlFor="password">New password</label>
            <div className="relative">
              <input
                id="password"
                className="field pr-11"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/65 transition"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-ink/45">Minimum 8 characters.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-accent w-full py-4 shadow-soft">Set new password</button>
        </form>

        <p className="mt-6 text-sm text-ink/55 text-center">
          Didn&apos;t get a code?{" "}
          <Link href="/forgot-password" className="text-[var(--accent)] font-medium">
            Try again
          </Link>
        </p>
      </div>
    </main>
  );
}
