import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PostForm } from "./form";

export default async function PostPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, status, deadline_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();

  const closed = page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now();

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-16">
      <div className="relative z-10 px-5 pt-6 max-w-md mx-auto">
        <Link href={`/c/${slug}`} className="text-plum/60 text-sm">← Back to wall</Link>
        <h1 className="font-serif text-5xl text-plum mt-6 leading-[0.95]">
          A note for<br/><em className="not-italic text-terracotta">{page.recipient_name}</em>
        </h1>
        {closed ? (
          <p className="text-plum/70 mt-8">Messages are closed for this celebration.</p>
        ) : (
          <PostForm slug={slug} />
        )}
      </div>
    </main>
  );
}
