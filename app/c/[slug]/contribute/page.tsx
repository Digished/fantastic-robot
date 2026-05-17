import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { ContributeForm } from "./form";

export default async function ContributePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, recipient_account_name, status, deadline_at, celebration_date")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();

  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now();

  return (
    <main className="min-h-[100dvh] bg-white pb-16">
      <div className="page-shell pt-6">
        <Link href={`/c/${slug}`} className="text-ink/55 text-sm">← Back to wall</Link>
        <h1 className="serif text-5xl text-ink mt-6">
          Send a gift<br/>
          <em className="not-italic text-[var(--accent)]">to {page.recipient_name}</em>
        </h1>
        <p className="text-ink/60 mt-3 text-sm">
          Going to <span className="font-medium text-ink">{page.recipient_account_name}</span>
        </p>
        <p className="text-ink/45 mt-1 text-xs">
          Paid directly to {page.recipient_name}&apos;s bank on {formatDate(page.celebration_date)}.
        </p>
        {closed ? (
          <p className="text-ink/65 mt-8">Contributions are closed.</p>
        ) : (
          <ContributeForm slug={slug} />
        )}
      </div>
    </main>
  );
}
