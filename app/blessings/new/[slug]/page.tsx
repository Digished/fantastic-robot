import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
    .select("status")
    .eq("celebration_id", cel.id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  if (paid) {
    return (
      <main className="min-h-[100dvh] bg-[#F4EDE1] px-5 py-12">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="text-4xl mb-3">🕊️</div>
          <h1 className="serif text-3xl text-ink leading-tight">Already gifted</h1>
          <p className="text-ink/65 mt-3">
            This page already has 52 Weeks of Blessings — it&apos;s been paid for and saved as a
            gift for {firstName}. You only ever buy it once.
          </p>
          <p className="text-ink/55 mt-4 text-sm">
            A blessing reaches {firstName} every week — straight to their inbox.
          </p>
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
        <Link href={`/c/${cel.slug}`} className="text-sm text-ink/55 hover:text-ink">
          ← Back to {firstName}&apos;s page
        </Link>
        <div className="mt-5">
          <NewBlessingForm slug={cel.slug} firstName={firstName} />
        </div>
      </div>
    </main>
  );
}
