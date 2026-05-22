"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Lock, Info } from "lucide-react";
import { createSelfCelebration, type CreateState } from "../actions";
import { THEME_IDS } from "@/lib/themes";

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "birthday", label: "Birthday (renews every year)" },
  { value: "graduation", label: "Graduation" },
  { value: "wedding", label: "Wedding" },
  { value: "other", label: "Other celebration" },
];

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SelfCreateForm({ defaultName, hasBank }: { defaultName: string; hasBank: boolean }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createSelfCelebration, {});
  const [eventType, setEventType] = useState("birthday");

  const defaultTitle = defaultName
    ? `${defaultName}'s ${eventType === "birthday" ? "Birthday" : "Celebration"}`
    : "";

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-1.5">
        <label className="label" htmlFor="title">Page title</label>
        <input
          id="title"
          name="title"
          className="field"
          defaultValue={defaultTitle}
          maxLength={80}
          placeholder="My Birthday"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="eventType">Occasion</label>
        <select
          id="eventType"
          name="eventType"
          className="field"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {EVENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="date">
          {eventType === "birthday" ? "Your birthday" : "The date"}
        </label>
        <input id="date" name="date" type="date" className="field" required />
        <p className="text-xs text-ink/45">
          {eventType === "birthday"
            ? "We'll celebrate the next one and renew it every year."
            : "Must be at least 4 days away."}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="theme">Theme</label>
        <select id="theme" name="theme" className="field" defaultValue="ivory">
          {THEME_IDS.map((t) => (
            <option key={t} value={t}>{titleCase(t)}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-ink/60 rounded-2xl bg-ink/5 px-4 py-3 flex gap-2.5">
        <Lock className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" />
        Messages and gifts stay sealed — nobody (not even you) sees them until the day.
      </p>

      {!hasBank && (
        <p className="text-sm text-ink/60 rounded-2xl bg-amber-50 text-amber-800 px-4 py-3 flex gap-2.5">
          <Info className="size-4 mt-0.5 shrink-0" />
          <span>
            Add your{" "}
            <Link href="/dashboard/settings" className="underline">payout bank account</Link>{" "}
            in settings before the day so you can receive your gift.
          </span>
        </p>
      )}

      {state.error && (
        <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-accent shadow-soft w-full py-4 disabled:opacity-60">
        {pending ? "Creating…" : "Create my page"}
      </button>
    </form>
  );
}
