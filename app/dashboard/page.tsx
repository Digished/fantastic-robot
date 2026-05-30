import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Lock, MessageCircle, Gift, Cake } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/utils";
import { formatDate, timeUntil } from "@/lib/time";
import { DraftCard, EmptyState } from "./draft-card";
import { FriendsPanel } from "./friends-panel";
import { DashboardChecklist } from "./checklist";
import { CardArt } from "./card-art";
import { rehydrateDraft, type SavedDraft } from "@/lib/draft/draft";
import { BIRTHDAY_ONLY } from "@/lib/features";
import { ensureInviteToken, getFriendsWithBirthdays, getFriendActivity } from "@/lib/friends";
import { env } from "@/lib/env";

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

  // Fetch everything the dashboard needs up front, in parallel.
  const admin = supabaseAdmin();
  const [pagesQ, draftQ, meRowQ, friends, inviteToken, referralsQ] = await Promise.all([
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
    supabase
      .from("users")
      .select("date_of_birth, avatar_path, username")
      .eq("id", user.id)
      .maybeSingle(),
    getFriendsWithBirthdays(user.id),
    ensureInviteToken(user.id),
    admin.from("users").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
  ]);
  const pages = pagesQ.data;
  const referralCount = referralsQ.count ?? 0;

  // A birthday page is required to use the app. If it's genuinely missing (new
  // user, or they deleted theirs) send them through creation — but never bounce
  // on a transient query error, which would hide the dashboard.
  const birthdayPage = (pages ?? []).find((p) => p.is_self && p.event_type === "birthday");
  if (BIRTHDAY_ONLY && !pagesQ.error && !birthdayPage) redirect("/create/me");

  // Birthdays-only: each user gets a single birthday page.
  const hasBirthdayPage = BIRTHDAY_ONLY ? !!birthdayPage : false;
  const createHref = BIRTHDAY_ONLY ? "/create/me" : "/create";
  const createLabel = BIRTHDAY_ONLY ? "Create my birthday page" : "New celebration";
  const showCreate = !hasBirthdayPage;

  const meRow = meRowQ.data as { date_of_birth?: string | null; avatar_path?: string | null; username?: string | null } | null;
  const dateOfBirth = meRow?.date_of_birth ?? null;
  const myAvatar = meRow?.avatar_path ?? null;
  const myUsername = meRow?.username ?? null;

  const inviteUrl = `${env.appUrl()}/i/${inviteToken}`;
  const activity = await getFriendActivity(user.id, friends.map((f) => f.profile.id));

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

        {/* Header — navigation lives in the global menu (top-right). */}
        <header className="py-5 md:py-7 flex items-center justify-between border-b border-ink/8">
          <Link href="/dashboard" className="serif text-xl md:text-2xl text-ink">Spendbox</Link>
          {showCreate && (
            <Link href={createHref} className="btn-accent shadow-soft hidden md:inline-flex gap-2">
              <Plus className="size-4" /> {createLabel}
            </Link>
          )}
        </header>

        <div className="pt-7 md:pt-10">
          <DashboardChecklist
            hasBirthdayPage={hasBirthdayPage}
            hasUsername={!!myUsername}
            hasPhoto={!!myAvatar}
            referralCount={referralCount}
            messageCount={activity.messageCount}
            giftCount={activity.giftCount}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            {draft && <DraftCard draft={draft.draft} updatedAt={draft.updatedAt} />}
            {showCreate && <EmptyState hasPages={!!pages?.length} hasDraft={!!draft} />}
            {pages?.map((p, i) => {
              const cover = coverUrl(p.cover_photo_path);
              const sealed = isSealedNow(p);
              const isBirthday = p.is_self && p.event_type === "birthday";
              const age = isBirthday ? ageOn(dateOfBirth, p.celebration_date) : null;
              const avatar = isBirthday ? coverUrl(myAvatar) : null;
              const upcoming = new Date(p.celebration_date).getTime() > Date.now();
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
                      <>
                        <div className="absolute inset-0 theme-mesh" />
                        <CardArt seed={p.slug} />
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

                    {/* Celebrant avatar + age, front and centre */}
                    {!cover && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        {avatar ? (
                          <div className="size-16 rounded-full overflow-hidden ring-2 ring-white/60 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={avatar} alt="" width={64} height={64} className="size-full object-cover" />
                          </div>
                        ) : (
                          <span className="size-16 rounded-full bg-white/15 grid place-items-center ring-2 ring-white/40">
                            <Cake className="size-7 text-white" />
                          </span>
                        )}
                        {age !== null && (
                          <p className="mt-2 text-white/85 text-xs uppercase tracking-[0.25em]">
                            Turning <span className="text-white font-semibold">{age}</span>
                          </p>
                        )}
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
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white flex items-end justify-between gap-2">
                      <p className="serif text-2xl leading-tight truncate">{p.recipient_name}</p>
                      {upcoming && (
                        <span className="shrink-0 glass-dark rounded-full px-2.5 py-1 text-[11px] inline-flex items-center gap-1">
                          <Cake className="size-3" /> {timeUntil(p.celebration_date)}
                        </span>
                      )}
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

          {/* Friends */}
          <FriendsPanel inviteUrl={inviteUrl} friends={friends} />
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
