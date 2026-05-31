import { notFound } from "next/navigation";
import { Lock, MessageCircle, Mic, Video, Image as ImageIcon } from "lucide-react";
import { loadCelebrationView } from "@/lib/celebration-view";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/time";
import { YearTabs } from "../year-tabs";
import { SealedItemGrid, type SealedItem, type SealedKind } from "../sealed-item-grid";

export const dynamic = "force-dynamic";

const MEDIA_ICON: Record<string, typeof Mic> = { audio: Mic, video: Video, image: ImageIcon };

function sealedKind(m: { media_kind: string; interactive_kind: string | null }): SealedKind {
  if (m.interactive_kind && m.interactive_kind !== "none") return "surprise";
  if (m.media_kind === "audio") return "audio";
  if (m.media_kind === "video") return "video";
  if (m.media_kind === "image") return "photo";
  return "message";
}

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { slug } = await params;
  const { cycle } = await searchParams;
  const view = await loadCelebrationView(slug, cycle);
  if (!view) notFound();

  const { page, viewCycle, sealed, years } = view;

  const admin = supabaseAdmin();
  let messages: {
    id: string; contributor_name: string; is_anonymous: boolean;
    body: string | null; media_kind: string;
  }[] = [];
  let sealedItems: SealedItem[] = [];
  if (sealed) {
    // Only the type is read — no names or content — so nothing leaks early.
    const { data } = await admin
      .from("messages")
      .select("id, media_kind, interactive_kind")
      .eq("celebration_id", page.id)
      .eq("cycle", viewCycle)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    sealedItems = (data ?? []).map((m) => ({ id: m.id as string, kind: sealedKind(m as { media_kind: string; interactive_kind: string | null }) }));
  } else {
    const { data } = await admin
      .from("messages")
      .select("id, contributor_name, is_anonymous, body, media_kind")
      .eq("celebration_id", page.id)
      .eq("cycle", viewCycle)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    messages = data ?? [];
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-24" data-theme={page.theme ?? "ivory"}>
      <div className="mx-auto max-w-2xl px-5 md:px-10 pt-6 space-y-6">
        <YearTabs slug={slug} active="messages" viewCycle={viewCycle} years={years} />
        <h1 className="serif text-3xl text-ink">Messages</h1>

        {sealed ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--accent-soft)] text-center py-5 px-4">
              <Lock className="size-6 text-[var(--accent)] mx-auto" />
              <p className="serif text-2xl text-ink mt-2">{sealedItems.length} message{sealedItems.length === 1 ? "" : "s"} waiting</p>
              <p className="text-ink/55 text-sm mt-1">
                Tap any card to learn more — it all opens on {formatDate(page.celebration_date)}.
              </p>
            </div>
            {sealedItems.length > 0 && (
              <SealedItemGrid items={sealedItems} revealLabel={formatDate(page.celebration_date)} noun="messages and surprises" />
            )}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-ink/50 text-sm">No messages this year yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const Icon = MEDIA_ICON[m.media_kind];
              return (
                <li key={m.id} className="card">
                  {m.body && <p className="text-ink leading-relaxed">{m.body}</p>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink/45">
                    {Icon && <Icon className="size-3.5" />}
                    <MessageCircle className="size-3.5" />
                    <span>{m.is_anonymous ? "Someone special" : m.contributor_name}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
