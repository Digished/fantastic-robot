"use client";

import { useState, useTransition } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { addFriend } from "@/app/dashboard/friends/actions";

/** Shown to a signed-in viewer who isn't the celebrant and isn't yet a friend. */
export function AddFriendButton({ targetUserId }: { targetUserId: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function add() {
    start(async () => {
      const res = await addFriend(targetUserId);
      if (res?.error) { window.alert(res.error); return; }
      setSent(true);
    });
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={pending || sent}
      className="glass-dark rounded-full px-3 py-1.5 text-xs text-white inline-flex items-center gap-1.5 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : sent ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {sent ? "Friends" : "Add friend"}
    </button>
  );
}
