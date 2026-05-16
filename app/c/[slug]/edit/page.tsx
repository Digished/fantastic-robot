import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { EditForm } from "./form";
import { MessagesManager } from "./messages-manager";

export default async function EditPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/c/${slug}/edit`);

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, message_from_creator, cover_photo_path, celebration_date, creator_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) notFound();
  if (page.creator_id !== user.id) redirect(`/c/${slug}`);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <main className="relative min-h-[100dvh] mesh-warm grain pb-32">
      <div className="relative z-10 px-5 pt-6 max-w-md mx-auto">
        <Link href={`/c/${slug}`} className="text-plum/60 text-sm">← Back to page</Link>
        <h1 className="font-serif text-5xl text-plum mt-6 leading-[0.95]">Edit page</h1>
        <p className="text-plum/65 mt-3 text-sm">
          For {page.recipient_name}. Recipient bank details are locked — they can't be changed.
        </p>

        <EditForm
          slug={slug}
          initial={{
            title: page.title,
            messageFromCreator: page.message_from_creator ?? "",
            coverPhotoPath: page.cover_photo_path ?? null,
          }}
        />

        <section className="mt-12">
          <h2 className="font-serif text-3xl text-plum">Wall posts</h2>
          <p className="text-plum/60 text-sm mt-1">{messages?.length ?? 0} cards. Tap remove to hide a card.</p>
          <MessagesManager slug={slug} messages={messages ?? []} />
        </section>
      </div>
    </main>
  );
}
