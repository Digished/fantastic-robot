"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, Copy, Cake, Loader2, X, Users } from "lucide-react";
import type { PublicProfile, FriendBirthday } from "@/lib/friends";
import { searchPeople, addFriend, unfriend, type PersonResult } from "./friends/actions";

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
}: {
  inviteUrl: string;
  friends: FriendBirthday[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");
  function runSearch(q: string) {
    setQuery(q);
    latest.current = q;
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    // Debounce so we don't hit the server on every keystroke.
    timer.current = setTimeout(async () => {
      const r = await searchPeople(q);
      // Ignore stale responses if the query changed meanwhile.
      if (latest.current === q) { setResults(r); setSearching(false); }
    }, 250);
  }
  function addPerson(p: PersonResult) {
    // Optimistic: flip to "Friends" immediately, reconcile in the background.
    setResults((prev) => (prev ? prev.map((x) => (x.id === p.id ? { ...x, relation: "friend" } : x)) : prev));
    startTransition(async () => {
      const res = await addFriend(p.id);
      if (res?.error) {
        window.alert(res.error);
        setResults((prev) => (prev ? prev.map((x) => (x.id === p.id ? { ...x, relation: "none" } : x)) : prev));
        return;
      }
      router.refresh();
    });
  }
  function removeFriend(p: PublicProfile) {
    if (!window.confirm(`Remove ${name(p)}?`)) return;
    startTransition(async () => {
      const res = await unfriend(p.id);
      if (res?.error) { window.alert(res.error); return; }
      router.refresh();
    });
  }
  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="serif text-2xl md:text-3xl text-ink inline-flex items-center gap-2">
          <Users className="size-5 text-[var(--accent)]" /> Friends
        </h2>
        <button onClick={() => setOpen(true)} className="btn-accent shadow-soft text-sm py-2 inline-flex items-center gap-1.5">
          <UserPlus className="size-4" /> Find friends
        </button>
      </div>

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
          {friends.map(({ profile, slug, days }) => (
            <li key={profile.id} className="card flex items-center gap-3 py-3">
              <Avatar p={profile} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium truncate">{name(profile)}</p>
                <p className="text-xs text-ink/55 inline-flex items-center gap-1.5">
                  <Cake className="size-3.5 text-[var(--accent)]" />
                  {countdownLabel(days)}
                </p>
              </div>
              {slug && <Link href={`/c/${slug}`} className="btn-outline text-sm py-2 shrink-0">View</Link>}
              <button className="text-ink/35 hover:text-red-600 text-xs shrink-0" disabled={pending} onClick={() => removeFriend(profile)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Find friends modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl2 sm:rounded-3xl2 shadow-card p-5 max-h-[88dvh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="serif text-xl text-ink">Find friends</h3>
                <p className="text-xs text-ink/45 mt-0.5">Search anyone, or share your link — adding is instant.</p>
              </div>
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
              <p className="text-sm text-ink/50 mt-3">No one found. Share your invite link below.</p>
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
                      <span className="text-xs text-[var(--accent)] inline-flex items-center gap-1 shrink-0"><Check className="size-3.5" /> Friends</span>
                    ) : (
                      <button className="btn-accent text-xs py-1.5 px-3 inline-flex items-center gap-1 shrink-0" onClick={() => addPerson(p)}>
                        <UserPlus className="size-3.5" /> Add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 pt-4 border-t border-ink/8">
              <p className="label mb-1.5">Your invite link</p>
              <div className="flex gap-2">
                <input className="field text-sm flex-1" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={copyLink} className="btn-outline text-sm py-2 inline-flex items-center gap-1.5 shrink-0">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-ink/45 mt-1">Anyone who opens this link becomes your friend.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
