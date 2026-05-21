"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label className="label" htmlFor="displayName">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          className="field"
          defaultValue={initialDisplayName}
          maxLength={60}
          placeholder="How contributors see you"
        />
        <p className="text-xs text-ink/45">
          Shown to guests under &ldquo;Put together by &hellip;&rdquo; on every page
          you create. Leave blank to fall back to your email.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="label">Email</label>
        <input className="field bg-ink/5 text-ink/55" value={email} disabled />
      </div>

      {state.error && (
        <p className="text-sm rounded-xl bg-red-50 text-red-700 px-3 py-2">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="text-sm rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-2 inline-flex items-center gap-1.5">
          <Check className="size-4" /> Saved
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-accent shadow-soft disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
