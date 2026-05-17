import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/themes";
import { isCelebrantUnlocked } from "@/lib/celebrant-unlock";
import { Player } from "./player";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, recipient_name, theme, creator_id, security_answer_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isCreator = !!user && user.id === page.creator_id;

  if (page.security_answer_hash && !isCreator && !(await isCelebrantUnlocked(slug))) {
    redirect(`/c/${slug}/celebrate`);
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contributor_name, is_anonymous, body, media_kind, media_path, media_duration_ms, interactive_kind, interactive_payload, contributor_session_id, created_at")
    .eq("celebration_id", page.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const theme: Theme = isTheme(page.theme) ? page.theme : "ivory";

  return (
    <Player
      slug={slug}
      theme={theme}
      recipientName={page.recipient_name}
      messages={messages ?? []}
    />
  );
}
