import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings, Lock, MessageCircle, Gift, Users, Cake } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logout } from "@/app/login/actions";
import { formatNaira } from "@/lib/utils";
import { formatDate } from "@/lib/time";
import { DraftCard, EmptyState } from "./draft-card";
import { DeleteCelebrationButton } from "./delete-celebration-button";
import { rehydrateDraft, type SavedDraft } from "@/lib/draft/draft";
import { BIRTHDAY_ONLY } from "@/lib/features";
import { getFriendIds, getPublicProfiles, daysUntilBirthday, profileName } from "@/lib/friends";

function avatarThumb(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

/** The age the celebrant turns on a celebration date, given their DOB. */
function ageOn(dateOfBirth: string | null, celebrationDate: string): number | null {
  if (!dateOfBirth) return null;
  const birthYear = Number(dateOfBirth.slice(0, 4));
  const year = new Date(celebrationDate).getUTCFullYear();
  if (!birthYear || !year) return null;
  const age = year - birthYear;
  return age > 0 && age < 130 ? age : null;
}

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [pagesQ, draftQ] = await Promise.all([
    supabase
      .from("celebrations")
      .select("id, slug, title, recipient_name, event_type, celebration_date, status, total_raised_kobo, contributor_count, theme, cover_photo_path, is_paid_for_creation, is_self, is_sealed, claimable_at, current_cycle")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("page_drafts")
      .select("data, updated_at")
      .eq("creator_id", user.id)
      .maybeSingle(),
  ]);
  const pages = pagesQ.data;

  // Birthdays-only: each user gets a single birthday page. Once they have one,
  // hide the "create" CTAs. The create flow lives at /create/me.
  const hasBirthdayPage =
    BIRTHDAY_ONLY && (pages ?? []).some((p) => p.is_self && p.event_type === "birthday");
  const createHref = BIRTHDAY_ONLY ? "/create/me" : "/create";
  const createLabel = BIRTHDAY_ONLY ? "Create my birthday page" : "New celebration";
  const showCreate = !hasBirthdayPage;

  // The user's date of birth drives the age shown on birthday cards. Fetched in
  // its own query so a not-yet-applied migration can't break the dashboard.
  const { data: dobRow } = await supabase
    .from("users")
    .select("date_of_birth")
    .eq("id", user.id)
    .maybeSingle();
  const dateOfBirth = (dobRow as { date_of_birth?: string | null } | null)?.date_of_birth ?? null;

  // Friends: pending-request badge + an upcoming-birthdays preview strip.
  const admin = supabaseAdmin();
  const friendIds = await getFriendIds(user.id);
  const [{ count: pendingRequests }, friendProfiles] = await Promise.all([
    admin
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    getPublicProfiles(friendIds),
  ]);
  const upcoming = friendProfiles
    .map((p) => ({ p, days: p.dateOfBirth ? daysUntilBirthday(p.dateOfBirth) : null }))
    .filter((x): x is { p: typeof x.p; days: number } => x.days !== null)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  // Sealed pages hide their wall — even from the owner. But the owner can still
  // see how many messages/gifts have landed (counts only, no content/amount).
  // Counting needs the service role since the wall-read policy hides the rows.
  const now = Date.now();
  const isSealedNow = (p: { is_self: boolean; is_sealed: boolean; claimable_at: string }) =>
    (p.is_self || p.is_sealed) && new Date(p.claimable_at).getTime() > now;
  const messageCounts = new Map<string, number>();
  const sealedPages = (pages ?? []).filter(isSealedNow);
  if (sealedPages.length) {
    await Promise.all(
      sealedPages.map(async (p) => {
        const { count } = await admin
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("celebration_id", p.id)
          .eq("cycle", p.current_cycle)
          .is("deleted_at", null);
        messageCounts.set(p.id, count ?? 0);
      }),
    );
  }

  let draft: SavedDraft | null = null;
  if (draftQ.data?.data) {
    draft = rehydrateDraft({
      ...(draftQ.data.data as Omit<SavedDraft, "updatedAt">),
      updatedAt: new Date(draftQ.data.updated_at).getTime(),
    });
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-28">
      <div className="mx-auto max-w-6xl px-5 md:px-10">

        {/* Header */}
        <header className="py-5 md:py-7 flex items-center justify-between border-b border-ink/8">
          <Link href="/" className="serif text-xl md:text-2xl text-ink">Spendbox</Link>
          <div className="flex items-center gap-4">
            {showCreate && (
              <Link href={createHref} className="btn-accent shadow-soft hidden md:inline-flex gap-2">
                <Plus className="size-4" /> {createLabel}
              </Link>
            )}
            <Link
              href="/dashboard/friends"
              className="relative text-sm text-ink/55 hover:text-ink transition inline-flex items-center gap-1.5"
              title="Friends"
            >
              <Users className="size-4" />
              <span className="hidden md:inline">Friends</span>
              {!!pendingRequests && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--accent)] text-white text-[10px] grid place-items-center">
                  {pendingRequests}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-sm text-ink/55 hover:text-ink transition inline-flex items-center gap-1.5"
              title="Profile settings"
            >
              <Settings className="size-4" />
              <span className="hidden md:inline">Settings</span>
            </Link>
            <form action={logout}>
              <button className="text-sm text-ink/55 hover:text-ink transition">Sign out</button>
            </form>
          </div>
        </header>

        <div className="pt-7 md:pt-12">
          <h1 className="fade-up serif text-4xl md:text-6xl text-ink">
            Your<br className="md:hidden" /> celebrations
          </h1>

          {/* Upcoming friend birthdays */}
          {upcoming.length > 0 && (
            <Link
              href="/dashboard/friends"
              className="mt-6 flex items-center gap-4 rounded-3xl2 bg-white shadow-ring px-4 py-3 hover:shadow-card transition fade-up"
            >
              <span className="text-[10px] uppercase tracking-widest text-ink/45 inline-flex items-center gap-1.5 shrink-0">
                <Cake className="size-3.5 text-[var(--accent)]" /> Upcoming
              </span>
              <div className="flex items-center gap-4 overflow-x-auto">
                {upcoming.map(({ p, days }) => {
                  const url = avatarThumb(p.avatarPath);
                  const label = days === 0 ? "today" : days === 1 ? "tomorrow" : `${days}d`;
                  return (
                    <span key={p.id} className="flex items-center gap-2 shrink-0">
                      <span className="size-8 rounded-full overflow-hidden bg-ink/8 grid place-items-center">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="text-xs text-ink/40">{profileName(p).replace("@", "").charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="text-xs text-ink/70 whitespace-nowrap">
                        {profileName(p).split(" ")[0]} · {label}
                      </span>
                    </span>
                  );
                })}
              </div>
            </Link>
          )}

          <div className="mt-7 md:mt-8 grid sm:grid-cols-2 gap-4">
            {draft && <DraftCard draft={draft.draft} updatedAt={draft.updatedAt} />}
            {showCreate && <EmptyState hasPages={!!pages?.length} hasDraft={!!draft} />}
            {pages?.map((p, i) => {
              const cover = coverUrl(p.cover_photo_path);
              const sealed = isSealedNow(p);
              const age =
                p.is_self && p.event_type === "birthday"
                  ? ageOn(dateOfBirth, p.celebration_date)
                  : null;
              return (
                <Link
                  key={p.id}
                  href={`/c/${p.slug}`}
                  data-theme={p.theme ?? "ivory"}
                  className="group rounded-3xl2 overflow-hidden bg-white shadow-ring hover:shadow-card transition fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Cover */}
                  <div className="relative aspect-[16/10]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 theme-mesh" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    {/* Birthday cards with no cover show the age they're turning. */}
                    {!cover && age !== null && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pb-10">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/70">Turning</span>
                        <span className="serif text-7xl leading-none text-white drop-shadow">{age}</span>
                      </div>
                    )}
                    {p.is_paid_for_creation === false ? (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest">
                        Awaiting payment
                      </span>
                    ) : p.status !== "active" && (
                      <span className="absolute top-3 right-3 glass-dark text-white rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest">
                        {p.status}
                      </span>
                    )}
                    <DeleteCelebrationButton
                      slug={p.slug}
                      title={p.title}
                      raisedKobo={Number(p.total_raised_kobo ?? 0)}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-[10px] uppercase tracking-widest text-white/75">
                        {p.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="serif text-2xl leading-tight mt-0.5 truncate">{p.title}</p>
                      <p className="text-sm text-white/80">For {p.recipient_name}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between px-4 py-3">
                    {sealed ? (
                      <div className="flex items-center gap-3 text-sm text-ink/60">
                        <span className="inline-flex items-center gap-1.5 text-ink/45">
                          <Lock className="size-3.5 text-[var(--accent)]" /> Sealed
                        </span>
                        <span className="inline-flex items-center gap-1" title="Messages waiting">
                          <MessageCircle className="size-3.5 text-ink/40" /> {messageCounts.get(p.id) ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Gifts waiting">
                          <Gift className="size-3.5 text-ink/40" /> {p.contributor_count ?? 0}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="serif text-lg text-[var(--accent)]">
                          {formatNaira(Number(p.total_raised_kobo ?? 0))}
                        </p>
                        <p className="text-[11px] text-ink/45">{p.contributor_count ?? 0} contributors</p>
                      </div>
                    )}
                    <p className="text-xs text-ink/45">{formatDate(p.celebration_date)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      {showCreate && (
        <Link href={createHref} className="btn-accent fixed bottom-6 right-6 shadow-glow z-20 md:hidden gap-2">
          <Plus className="size-4" /> {BIRTHDAY_ONLY ? "Birthday" : "New"}
        </Link>
      )}
    </main>
  );
}
