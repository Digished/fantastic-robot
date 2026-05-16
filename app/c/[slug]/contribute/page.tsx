import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ContributeForm } from "./form";

export default async function ContributePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, recipient_account_name, status, deadline_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();

  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now();

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-16">
      <div className="relative z-10 px-5 pt-6 max-w-md mx-auto">
        <Link href={`/c/${slug}`} className="text-plum/60 text-sm">← Back to wall</Link>
        <h1 className="font-serif text-5xl text-plum mt-6 leading-[0.95]">
          Send a gift<br/>
          <em className="not-italic text-terracotta">to {page.recipient_name}</em>
        </h1>
        <p className="text-plum/60 mt-3 text-sm">
          Going to <span className="font-medium text-plum">{page.recipient_account_name}</span>
        </p>
        {closed ? (
          <p className="text-plum/70 mt-8">Contributions are closed.</p>
        ) : (
          <ContributeForm slug={slug} />
        )}
      </div>
    </main>
  );
}
