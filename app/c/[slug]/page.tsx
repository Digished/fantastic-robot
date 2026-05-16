import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/utils";
import { formatDate, timeUntil } from "@/lib/time";
import { WallGrid } from "./wall-grid";
import { ShareBar } from "./share-bar";
import { ClaimButton } from "./claim-button";

export const dynamic = "force-dynamic";

export default async function WallPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, celebration_date, deadline_at, claimable_at, status, message_from_creator, total_raised_kobo, contributor_count, payout_status, recipient_account_name, recipient_bank_code, recipient_account_number, cover_photo_path",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const now = Date.now();
  const claimable = new Date(page.claimable_at).getTime() <= now;
  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() <= now;

  return (
    <main className="min-h-[100dvh] pb-32">
      <section className="px-5 pt-8 max-w-md mx-auto">
        <p className="text-xs uppercase tracking-widest text-plum/50">
          {page.event_type.replace("_", " ")}
        </p>
        <h1 className="font-serif text-5xl leading-[1.05] text-plum mt-2">
          {page.title}
        </h1>
        <p className="text-plum/70 mt-2">For {page.recipient_name}</p>

        {page.message_from_creator && (
          <p className="mt-5 text-plum/80 italic">"{page.message_from_creator}"</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-muted">Raised</p>
            <p className="font-serif text-2xl text-plum mt-1">
              {formatNaira(Number(page.total_raised_kobo))}
            </p>
            <p className="text-xs text-muted mt-1">{page.contributor_count} contributors</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-muted">
              {closed ? (claimable ? "Celebration day" : "Closing") : "Closes in"}
            </p>
            <p className="font-serif text-2xl text-plum mt-1">
              {closed && claimable ? "🎉" : timeUntil(page.deadline_at)}
            </p>
            <p className="text-xs text-muted mt-1">{formatDate(page.celebration_date)}</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted text-center">
          Gift will be sent to <span className="font-medium text-plum">{page.recipient_account_name}</span>
        </div>

        {claimable && page.payout_status !== "paid" && Number(page.total_raised_kobo) > 0 && (
          <div className="mt-6">
            <ClaimButton slug={page.slug} amountKobo={Number(page.total_raised_kobo)} />
          </div>
        )}
        {claimable && page.payout_status === "paid" && (
          <p className="mt-6 text-center text-sm text-plum/70">
            ✓ Gift delivered to {page.recipient_account_name}
          </p>
        )}

        {!closed && (
          <div className="mt-6 flex gap-3">
            <Link href={`/c/${page.slug}/post`} className="btn-outline flex-1">
              Leave a message
            </Link>
            <Link href={`/c/${page.slug}/contribute`} className="btn-primary flex-1">
              Contribute
            </Link>
          </div>
        )}
        {closed && !claimable && (
          <p className="mt-6 text-center text-sm text-plum/70">
            Contributions closed. The gift unlocks on {formatDate(page.celebration_date)}.
          </p>
        )}

        <ShareBar slug={page.slug} title={page.title} recipient={page.recipient_name} />
      </section>

      <section className="px-5 mt-10 max-w-md mx-auto">
        <h2 className="font-serif text-2xl text-plum">The wall</h2>
        <p className="text-plum/60 text-sm">{messages?.length ?? 0} cards</p>
        <WallGrid messages={messages ?? []} celebrationId={page.id} />
      </section>
    </main>
  );
}
