"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toggleBuiltinMusic } from "./actions";

export function ToggleBuiltinButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("action", disabled ? "enable" : "disable");
    start(() => toggleBuiltinMusic(fd));
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`text-xs px-3 py-1.5 rounded-full font-medium transition disabled:opacity-60 ${
        disabled
          ? "bg-ink/8 text-ink/55 hover:bg-ink/14"
          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
      }`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : disabled ? (
        "Enable"
      ) : (
        "Enabled"
      )}
    </button>
  );
}
