"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, Clock, Copy, Mail, Cake, Loader2, X, Users } from "lucide-react";
import type { PublicProfile, FriendBirthday, RequestPerson } from "@/lib/friends";
import {
  searchPeople,
  sendFriendRequest,
  respondToRequest,
  unfriend,
  inviteByEmail,
  type PersonResult,
} from "./friends/actions";

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
    <div className="rounded-full overflow-hidden bg-ink/8 grid place-items-center shrink-0" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="serif text-ink/40">{name(p).replace("@", "").charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export function FriendsPanel({
  inviteUrl,
  friends,
  incoming,
}: {
  inviteUrl: string;
  friends: FriendBirthday[];
  incoming: RequestPerson[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  function act(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) { window.alert(res.error); return; }
      router.refresh();
    });
  }
  function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults(null); return; }
    setSearching(true);
    startTransition(async () => {
      setResults(await searchPeople(q));
      setSearching(false);
    });
  }
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
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="serif text-2xl md:text-3xl text-ink inline-flex items-center gap-2">
          <Users className="size-5 text-[var(--accent)]" /> Friends
        </h2>
        <button onClick={() => setOpen(true)} className="btn-accent shadow-soft text-sm py-2 inline-flex items-center gap-1.5">
          <UserPlus className="size-4" /> Find friends
        </button>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="card mb-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-ink/45">Requests</p>
          {incoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <Avatar p={r.profile} />
              <p className="text-ink font-medium truncate flex-1">{name(r.profile)}</p>
              <button className="btn-accent text-sm py-2" disabled={pending} onClick={() => act(() => respondToRequest(r.id, true))}>Accept</button>
              <button className="btn-ghost text-sm py-2" disabled={pending} onClick={() => act(() => respondToRequest(r.id, false))}><X className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      {friends.length === 0 ? (
        <div className="card text-center py-8">
          <p className="serif text-xl text-ink">No friends yet.</p>
          <p className="text-ink/55 text-sm mt-1.5">Find people celebrating and never miss a birthday.</p>
          <button onClick={() => setOpen(true)} className="btn-accent shadow-soft mt-5 inline-flex items-center gap-1.5">
            <UserPlus className="size-4" /> Find friends
          </button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
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
              {slug && <Link href={`/c/${slug}`} className="btn-outline text-sm py-2 shrink-0">View</Link>}
              <button
                className="text-ink/35 hover:text-red-600 text-xs shrink-0"
                disabled={pending}
                onClick={() => { if (window.confirm(`Remove ${name(profile)}?`)) act(() => unfriend(profile.id)); }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl2 sm:rounded-3xl2 shadow-card p-5 max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="serif text-xl text-ink">Find friends</h3>
              <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink"><X className="size-5" /></button>
            </div>

            <div className="relative">
              <Search className="size-4 text-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                className="field pl-10"
                placeholder="Search everyone by @username, name or email"
                value={query}
                onChange={(e) => runSearch(e.target.value)}
              />
            </div>

            {searching && <p className="text-sm text-ink/50 mt-3 inline-flex items-center gap-1.5"><Loader2 className="size-4 animate-spin" /> Searching…</p>}
            {results && results.length === 0 && !searching && (
              <p className="text-sm text-ink/50 mt-3">No one found. Invite them by email below.</p>
            )}
            {results && results.length > 0 && (
              <ul className="space-y-2 mt-3">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <Avatar p={p} />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-medium truncate">{name(p)}</p>
                      <p className="text-xs text-ink/45 truncate inline-flex items-center gap-1">
                        {p.days !== null ? <><Cake className="size-3 text-[var(--accent)]" /> {countdownLabel(p.days)}</> : p.username ? `@${p.username}` : ""}
                      </p>
                    </div>
                    {p.slug && <Link href={`/c/${p.slug}`} className="text-xs text-[var(--accent)] shrink-0">View</Link>}
                    {p.relation === "friend" ? (
                      <span className="text-xs text-ink/45 inline-flex items-center gap-1"><Check className="size-3.5" /> Friends</span>
                    ) : p.relation === "outgoing" ? (
                      <span className="text-xs text-ink/45 inline-flex items-center gap-1"><Clock className="size-3.5" /> Sent</span>
                    ) : (
                      <button className="btn-outline text-xs py-1.5 inline-flex items-center gap-1" disabled={pending} onClick={() => act(() => sendFriendRequest(p.id))}>
                        <UserPlus className="size-3.5" /> {p.relation === "incoming" ? "Accept" : "Add"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 pt-4 border-t border-ink/8 space-y-3">
              <div>
                <p className="label mb-1.5">Your invite link</p>
                <div className="flex gap-2">
                  <input className="field text-sm flex-1" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={copyLink} className="btn-outline text-sm py-2 inline-flex items-center gap-1.5 shrink-0">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <p className="label mb-1.5">Invite by email</p>
                <div className="flex gap-2">
                  <input className="field text-sm flex-1" type="email" placeholder="friend@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button type="button" onClick={sendInvite} disabled={pending || !email.trim()} className="btn-accent text-sm py-2 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60">
                    <Mail className="size-4" /> {emailSent ? "Sent" : "Invite"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
