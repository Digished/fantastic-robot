"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signup } from "./actions";

export function SignupForm({ error }: { error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <form action={signup} className="mt-10 space-y-4">
      <div className="space-y-1.5">
        <label className="label">Your name</label>
        <input className="field" name="displayName" autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <label className="label">Email</label>
        <input className="field" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <label className="label">Password</label>
        <div className="relative">
          <input
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
        <p className="text-xs text-ink/45">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-accent w-full py-4 shadow-soft">Create account</button>
    </form>
  );
}
