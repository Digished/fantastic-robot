import { notFound } from "next/navigation";
import Link from "next/link";
import { Play, Gift, MessageCircleHeart } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { ClaimButton } from "../claim-button";
import { isTheme, type Theme } from "@/lib/themes";
import { Sparkles } from "@/components/sparkles";
import { CelebrantGate } from "./gate";
import { isCelebrantUnlocked } from "@/lib/celebrant-unlock";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/celebrations/${path}`;
}

export default async function CelebrantPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, payout_status, recipient_account_name, cover_photo_path, creator_id, theme, security_question, security_answer_hash",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isCreator = !!user && user.id === page.creator_id;

  // Gate: if a security question is set and the visitor isn't unlocked
  // (and isn't the creator), show the gate.
  const needsGate = !!page.security_answer_hash && !isCreator && !(await isCelebrantUnlocked(slug));
  if (needsGate && page.security_question) {
    return (
      <CelebrantGate
        slug={slug}
        question={page.security_question}
        recipientName={page.recipient_name}
      />
    );
  }

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";
  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const cover = coverUrl(page.cover_photo_path);

  const { count: messageCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("celebration_id", page.id)
    .is("deleted_at", null);

  return (
    <main className="min-h-[100dvh] bg-white pb-20" data-theme={theme}>
      <div className="page-shell pt-4">

        <section className="relative rounded-3xl2 overflow-hidden shadow-card">
          <div className="relative aspect-[4/5]">
            {cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="absolute inset-0 size-full object-cover ken-burns" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/85" />
              </>
            ) : (
              <div className="absolute inset-0 theme-mesh" />
            )}

            <Sparkles count={10} />

            <div className="absolute inset-0 flex flex-col">
              <header className="relative z-10 px-5 pt-5 flex items-center justify-between">
                <Link href={`/c/${slug}`} className="serif text-lg text-white drop-shadow">Spendbox</Link>
                <span className="glass-dark rounded-full px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                  For you
                </span>
              </header>

              <div className="relative z-10 mt-auto px-5 pb-7 text-white">
                <p className="fade-up text-[10px] uppercase tracking-[0.35em] text-white/85">
                  {page.event_type.replace("_", " ")} · {formatDate(page.celebration_date)}
                </p>
                <h1 className="fade-up mt-3 serif text-5xl leading-[0.95] drop-shadow-sm">
                  Hi {page.recipient_name.split(" ")[0]},
                </h1>
                <p className="fade-up mt-3 text-white/90 text-lg leading-snug">
                  Your friends made you something.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PLAY BUTTON — the main affordance */}
        <Link
          href={`/c/${slug}/celebrate/play`}
          className="btn-accent w-full py-5 mt-4 shadow-glow text-base"
        >
          <Play className="size-5 fill-current" />
          Play
          {messageCount ? <span className="opacity-70">· {messageCount} cards</span> : null}
        </Link>

        {/* Creator's note */}
        {page.message_from_creator && (
          <blockquote className="mt-8 serif text-ink text-2xl leading-tight italic fade-up text-center">
            "{page.message_from_creator}"
          </blockquote>
        )}

        {/* Claim — only when claimable, amount NOT shown */}
        {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
          <div className="mt-8">
            <p className="text-center text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 flex items-center justify-center gap-1.5">
              <Gift className="size-3.5" /> A gift is waiting
            </p>
            <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
          </div>
        )}
        {claimable && page.payout_status === "paid" && (
          <p className="mt-6 text-center text-sm text-ink/70">
            ✓ Gift delivered to {page.recipient_account_name}
          </p>
        )}

        {!claimable && Number(page.total_raised_kobo) > 0 && (
          <p className="mt-8 text-center text-sm text-ink/60 flex items-center justify-center gap-1.5">
            <MessageCircleHeart className="size-4 text-[var(--accent)]" />
            More is waiting for you on {formatDate(page.celebration_date)}.
          </p>
        )}

        <footer className="mt-16 text-center">
          <p className="text-[11px] text-ink/45">Made with Spendbox · for {page.recipient_name}</p>
        </footer>
      </div>
    </main>
  );
}
