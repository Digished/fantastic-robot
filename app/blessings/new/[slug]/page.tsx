import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ShareLink } from "@/app/blessings/done/share-link";
import { NewBlessingForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewBlessingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect(`/login?next=/blessings/new/${slug}`);

  const admin = supabaseAdmin();
  const { data: cel } = await admin
    .from("celebrations")
    .select("id, slug, recipient_name, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cel || cel.creator_id !== user.id) notFound();

  const firstName = cel.recipient_name.split(" ")[0];

  // Already bought? It's a one-time keepsake — show its status, not the pay form.
  const { data: paid } = await admin
    .from("blessing_plans")
    .select("status, redeem_token")
    .eq("celebration_id", cel.id)
    .in("status", ["awaiting_redemption", "active", "completed"])
    .maybeSingle();

  if (paid) {
    const awaiting = paid.status === "awaiting_redemption";
    const shareUrl = `${env.appUrl()}/blessings/redeem/${paid.redeem_token}`;
    return (
      <main className="min-h-[100dvh] bg-[#F4EDE1] px-5 py-12">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="text-4xl mb-3">🕊️</div>
          <h1 className="serif text-3xl text-ink leading-tight">Already gifted</h1>
          <p className="text-ink/65 mt-3">
            This page already has 52 Weeks of Blessings — it&apos;s been paid for and saved as a
            gift for {firstName}. You only ever buy it once.
          </p>
          {awaiting ? (
            <>
              <p className="text-ink/55 mt-4 text-sm">
                {firstName} hasn&apos;t claimed it yet. Share this link so they can add their email
                and begin:
              </p>
              <div className="mt-4 text-left">
                <ShareLink url={shareUrl} />
              </div>
            </>
          ) : (
            <p className="text-ink/55 mt-4 text-sm">
              {firstName} has claimed it — a blessing is on its way every week.
            </p>
          )}
          <Link href={`/c/${cel.slug}`} className="btn-outline mt-6 inline-block">
            Back to the page
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F4EDE1] px-5 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">🕊️</div>
          <h1 className="serif text-3xl text-ink leading-tight">52 Weeks of Blessings</h1>
          <p className="text-ink/65 mt-3">
            A year-long gift for {firstName}. Once a week, every week, a short prayer or blessing
            lands in their inbox — some written for them, some pulled from the notes left on their page.
          </p>
          <p className="text-ink/55 mt-2 text-sm">
            You&apos;ll get a private link to share. {firstName} adds their email within 72 hours to begin.
          </p>
        </div>
        <div className="mt-7">
          <NewBlessingForm slug={cel.slug} firstName={firstName} />
        </div>
      </div>
    </main>
  );
}
