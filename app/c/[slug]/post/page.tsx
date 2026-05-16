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
    <main className="min-h-[100dvh] px-5 pt-6 pb-16 max-w-md mx-auto">
      <Link href={`/c/${slug}`} className="text-plum/60 text-sm">← Back to wall</Link>
      <h1 className="font-serif text-3xl text-plum mt-6">
        Leave a message for {page.recipient_name}
      </h1>
      {closed ? (
        <p className="text-plum/70 mt-6">Messages are closed for this celebration.</p>
      ) : (
        <PostForm slug={slug} />
      )}
    </main>
  );
}
