"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "./actions";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <form action={login} className="mt-10 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
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
            autoComplete="current-password"
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
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-accent w-full py-4 shadow-soft">Sign in</button>
    </form>
  );
}
