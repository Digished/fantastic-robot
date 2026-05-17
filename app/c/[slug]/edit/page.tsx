import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { EditForm } from "./form";
import { MessagesManager } from "./messages-manager";
import { isTheme, type Theme } from "@/lib/themes";

export default async function EditPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/c/${slug}/edit`);

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, title, recipient_name, message_from_creator, tagline, celebrant_description, cover_photo_path, celebration_date, creator_id, theme, gallery_images")
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

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";

  return (
    <main className="min-h-[100dvh] bg-white pb-32">
      <div className="page-shell pt-6">
        <Link href={`/c/${slug}`} className="text-ink/55 text-sm">← Back to page</Link>
        <h1 className="serif text-5xl text-ink mt-6">Edit page</h1>
        <p className="text-ink/60 mt-3 text-sm">
          For {page.recipient_name}. Recipient bank details are locked.
        </p>

        <EditForm
          slug={slug}
          initial={{
            title: page.title,
            messageFromCreator: page.message_from_creator ?? "",
            tagline: page.tagline ?? "",
            celebrantDescription: page.celebrant_description ?? "",
            coverPhotoPath: page.cover_photo_path ?? null,
            theme,
            recipientName: page.recipient_name,
            galleryImages: (page.gallery_images as { path: string; caption: string; kind?: "image" | "video" }[]) ?? [],
          }}
        />

        <section className="mt-12">
          <h2 className="serif text-3xl text-ink">Wall posts</h2>
          <p className="text-ink/55 text-sm mt-1">{messages?.length ?? 0} cards.</p>
          <MessagesManager slug={slug} messages={messages ?? []} />
        </section>
      </div>
    </main>
  );
}
