"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { signup } from "./actions";
import { checkUsername } from "@/app/create/actions";

export function SignupForm({ error, invite }: { error?: string; invite?: string }) {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  function onUsernameChange(raw: string) {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(v);
    latest.current = v;
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    if (!/^[a-z0-9_]{3,20}$/.test(v)) return;
    setStatus("checking");
    timer.current = setTimeout(async () => {
      const res = await checkUsername(v);
      if (latest.current === v) setStatus(res.available ? "available" : "taken");
    }, 400);
  }

  return (
    <form action={signup} className="mt-10 space-y-4">
      {invite && <input type="hidden" name="invite" value={invite} />}
      <div className="space-y-1.5">
        <label className="label">Your name</label>
        <input className="field" name="displayName" autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <label className="label">Username</label>
        <div className="relative">
          <input
            className="field pr-9"
            name="username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            autoComplete="username"
            placeholder="yourname"
            pattern="[A-Za-z0-9_]{3,20}"
            title="3–20 letters, numbers or underscores"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === "checking" && <Loader2 className="size-4 animate-spin text-ink/40" />}
            {status === "available" && <Check className="size-4 text-[var(--accent)]" />}
            {status === "taken" && <X className="size-4 text-red-500" />}
          </span>
        </div>
        <p className={`text-xs ${status === "taken" ? "text-red-600" : "text-ink/45"}`}>
          {status === "taken"
            ? "That username is taken — try another."
            : status === "available"
              ? "Available!"
              : "Letters, numbers or underscores — how friends find you."}
        </p>
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
      <button type="submit" disabled={status === "taken"} className="btn-accent w-full py-4 shadow-soft disabled:opacity-60">
        Create account
      </button>
    </form>
  );
}
