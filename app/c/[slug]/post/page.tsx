import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { contentWindowOpen } from "@/lib/celebration-windows";
import { PostForm } from "./form";

export default async function PostPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, status, celebration_date")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();

  const closed = page.status !== "active" || !contentWindowOpen(page.celebration_date);

  return (
    <main className="min-h-[100dvh] bg-white pb-16">
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <Link href={`/c/${slug}`} className="text-ink/55 text-sm">← Back to wall</Link>
        <h1 className="serif text-5xl text-ink mt-6">
          A note for<br/><em className="not-italic text-[var(--accent)]">{page.recipient_name}</em>
        </h1>
        {closed ? (
          <p className="text-ink/65 mt-8">Messages are closed for this celebration.</p>
        ) : (
          <PostForm slug={slug} recipientName={page.recipient_name} />
        )}
      </div>
    </main>
  );
}
