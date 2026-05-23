import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { contentWindowOpen } from "@/lib/celebration-windows";
import { CONTRIBUTOR_COOKIE } from "@/lib/contributor-id";
import { PostForm } from "./form";
import { YourMessages, type OwnMessage } from "./your-messages";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { slug } = await params;
  const { sent } = await searchParams;
  const supabase = await supabaseServer();
  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, status, celebration_date, current_cycle")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();

  const closed = page.status !== "active" || !contentWindowOpen(page.celebration_date);

  // Show the contributor their own messages so they can come back to view or
  // edit them — even when the page is sealed and the wall is hidden. Keyed by
  // the device cookie; fetched with the service role to bypass the seal.
  const cid = (await cookies()).get(CONTRIBUTOR_COOKIE)?.value;
  let ownMessages: OwnMessage[] = [];
  if (cid) {
    const { data } = await supabaseAdmin()
      .from("messages")
      .select("id, body, media_kind, interactive_kind, created_at")
      .eq("celebration_id", page.id)
      .eq("contributor_session_id", cid)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    ownMessages = (data as OwnMessage[]) ?? [];
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-16">
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <Link href={`/c/${slug}`} className="text-ink/55 text-sm">← Back to wall</Link>
        <h1 className="serif text-5xl text-ink mt-6">
          A note for<br/><em className="not-italic text-[var(--accent)]">{page.recipient_name}</em>
        </h1>
        {sent && (
          <p className="mt-6 text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-3">
            Your message is in — it stays sealed until the day. You can edit or remove it below anytime.
          </p>
        )}
        {closed ? (
          <p className="text-ink/65 mt-8">Messages are closed for this celebration.</p>
        ) : (
          <PostForm slug={slug} recipientName={page.recipient_name} />
        )}

        <YourMessages slug={slug} initial={ownMessages} />
      </div>
    </main>
  );
}
