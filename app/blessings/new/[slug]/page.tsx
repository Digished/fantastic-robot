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
    .select("slug, recipient_name, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cel || cel.creator_id !== user.id) notFound();

  const firstName = cel.recipient_name.split(" ")[0];

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
