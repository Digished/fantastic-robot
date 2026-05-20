"use client";

import { useActionState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadCustomMusic, type SoundsActionState } from "./actions";

export function UploadCustomMusic() {
  const [state, dispatch, pending] = useActionState<SoundsActionState, FormData>(
    uploadCustomMusic,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form when an upload succeeds so the next upload starts clean.
  if (state.ok && formRef.current && !pending) {
    formRef.current.reset();
  }

  return (
    <form ref={formRef} action={dispatch} className="mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label">Label</label>
          <input
            name="label"
            required
            maxLength={60}
            placeholder="e.g. Happy Anthem"
            className="field"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label">Mood</label>
          <input
            name="mood"
            required
            maxLength={80}
            placeholder="e.g. Bouncy pop sing-along"
            className="field"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="label">Audio file</label>
        <input
          name="file"
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
          required
          className="field"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700">{state.ok}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-accent inline-flex items-center gap-2 px-5 py-3 shadow-soft disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {pending ? "Uploading…" : "Add sound"}
      </button>
    </form>
  );
}
