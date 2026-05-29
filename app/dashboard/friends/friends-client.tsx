"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, Clock, Copy, Mail, Cake, Loader2, X } from "lucide-react";
import type { PublicProfile } from "@/lib/friends";
import {
  searchPeople,
  sendFriendRequest,
  respondToRequest,
  cancelRequest,
  unfriend,
  inviteByEmail,
  type PersonResult,
} from "./actions";

export type FriendItem = {
  profile: PublicProfile;
  slug: string | null;
  days: number | null;
  turning: number | null;
};
export type RequestItem = { id: string; profile: PublicProfile };

function avatarUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

function name(p: PublicProfile) {
  return p.displayName?.trim() || (p.username ? `@${p.username}` : "A friend");
}

function countdownLabel(days: number | null): string {
  if (days === null) return "Birthday not set";
  if (days === 0) return "Today 🎉";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

function Avatar({ p, size = 44 }: { p: PublicProfile; size?: number }) {
  const url = avatarUrl(p.avatarPath);
  return (
    <div
      className="rounded-full overflow-hidden bg-ink/8 grid place-items-center shrink-0"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="serif text-ink/40">{name(p).replace("@", "").charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export function FriendsClient({
  inviteUrl,
  friends,
  incoming,
  outgoing,
}: {
  inviteUrl: string;
  friends: FriendItem[];
  incoming: RequestItem[];
  outgoing: RequestItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults(null); return; }
    setSearching(true);
    startTransition(async () => {
      const r = await searchPeople(q);
      setResults(r);
      setSearching(false);
    });
  }

  function act(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) { window.alert(res.error); return; }
      router.refresh();
    });
  }

  // Invite link + email
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function sendInvite() {
    if (!email.trim()) return;
    startTransition(async () => {
      const res = await inviteByEmail(email);
      if (res?.error) { window.alert(res.error); return; }
      setEmail("");
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 2500);
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Add friends ── */}
      <section className="card space-y-4">
        <h2 className="serif text-xl text-ink">Add friends</h2>

        <div className="relative">
          <Search className="size-4 text-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="field pl-10"
            placeholder="Search by @username, name or email"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
          />
        </div>

        {searching && (
          <p className="text-sm text-ink/50 inline-flex items-center gap-1.5">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </p>
        )}
        {results && results.length === 0 && !searching && (
          <p className="text-sm text-ink/50">No one found. Try their email, or invite them below.</p>
        )}
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar p={p} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-medium truncate">{name(p)}</p>
                  {p.username && <p className="text-xs text-ink/45 truncate">@{p.username}</p>}
                </div>
                {p.relation === "friend" ? (
                  <span className="text-xs text-ink/45 inline-flex items-center gap-1"><Check className="size-3.5" /> Friends</span>
                ) : p.relation === "outgoing" ? (
                  <span className="text-xs text-ink/45 inline-flex items-center gap-1"><Clock className="size-3.5" /> Requested</span>
                ) : p.relation === "incoming" ? (
                  <button className="btn-accent text-sm py-2" disabled={pending} onClick={() => act(() => sendFriendRequest(p.id))}>
                    Accept
                  </button>
                ) : p.relation === "self" ? null : (
                  <button className="btn-outline text-sm py-2 inline-flex items-center gap-1.5" disabled={pending} onClick={() => act(() => sendFriendRequest(p.id))}>
                    <UserPlus className="size-3.5" /> Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Invite link + email */}
        <div className="pt-3 border-t border-ink/8 space-y-3">
          <div>
            <p className="label mb-1.5">Your invite link</p>
            <div className="flex gap-2">
              <input className="field text-sm flex-1" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={copyLink} className="btn-outline text-sm py-2 inline-flex items-center gap-1.5 shrink-0">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-ink/45 mt-1">Anyone who opens this link becomes your friend.</p>
          </div>

          <div>
            <p className="label mb-1.5">Invite by email</p>
            <div className="flex gap-2">
              <input
                className="field text-sm flex-1"
                type="email"
                placeholder="friend@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="button" onClick={sendInvite} disabled={pending || !email.trim()} className="btn-accent text-sm py-2 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60">
                <Mail className="size-4" /> {emailSent ? "Sent" : "Invite"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Requests ── */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="card space-y-4">
          <h2 className="serif text-xl text-ink">Requests</h2>
          {incoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <Avatar p={r.profile} />
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{name(r.profile)}</p>
                <p className="text-xs text-ink/45">wants to be friends</p>
              </div>
              <button className="btn-accent text-sm py-2" disabled={pending} onClick={() => act(() => respondToRequest(r.id, true))}>Accept</button>
              <button className="btn-ghost text-sm py-2" disabled={pending} onClick={() => act(() => respondToRequest(r.id, false))}>
                <X className="size-4" />
              </button>
            </div>
          ))}
          {outgoing.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <Avatar p={r.profile} />
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{name(r.profile)}</p>
                <p className="text-xs text-ink/45">request sent</p>
              </div>
              <button className="btn-outline text-sm py-2" disabled={pending} onClick={() => act(() => cancelRequest(r.id))}>Cancel</button>
            </div>
          ))}
        </section>
      )}

      {/* ── Friends / upcoming birthdays ── */}
      <section className="space-y-3">
        <h2 className="serif text-xl text-ink">
          {friends.length ? "Upcoming birthdays" : "Your friends"}
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-ink/50 card">No friends yet. Search above or share your invite link.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map(({ profile, slug, days, turning }) => (
              <li key={profile.id} className="card flex items-center gap-3 py-3">
                <Avatar p={profile} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-medium truncate">{name(profile)}</p>
                  <p className="text-xs text-ink/55 inline-flex items-center gap-1.5">
                    <Cake className="size-3.5 text-[var(--accent)]" />
                    {countdownLabel(days)}{turning !== null ? ` · turning ${turning}` : ""}
                  </p>
                </div>
                {slug ? (
                  <Link href={`/c/${slug}`} className="btn-outline text-sm py-2 shrink-0">View</Link>
                ) : (
                  <span className="text-xs text-ink/40 shrink-0">No page yet</span>
                )}
                <button
                  className="text-ink/35 hover:text-red-600 text-xs shrink-0"
                  disabled={pending}
                  onClick={() => { if (window.confirm(`Remove ${name(profile)} from friends?`)) act(() => unfriend(profile.id)); }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
