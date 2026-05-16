import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function WallPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("title, recipient_name, event_type, celebration_date, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  return (
    <main className="min-h-[100dvh] px-5 pt-10 max-w-md mx-auto">
      <p className="text-sm text-plum/60 uppercase tracking-wide">{page.event_type}</p>
      <h1 className="font-serif text-4xl mt-2 text-plum">{page.title}</h1>
      <p className="text-plum/70 mt-2">For {page.recipient_name}</p>
      <p className="text-muted text-xs mt-6">Wall coming in Phase 2.</p>
    </main>
  );
}
