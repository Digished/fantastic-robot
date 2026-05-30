import { notFound } from "next/navigation";
import { Lock, MessageCircle, Mic, Video, Image as ImageIcon } from "lucide-react";
import { loadCelebrationView } from "@/lib/celebration-view";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/time";
import { YearTabs } from "../year-tabs";

export const dynamic = "force-dynamic";

const MEDIA_ICON: Record<string, typeof Mic> = { audio: Mic, video: Video, image: ImageIcon };

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
  let sealedCount = 0;
  if (sealed) {
    const { count } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("celebration_id", page.id)
      .eq("cycle", viewCycle)
      .is("deleted_at", null);
    sealedCount = count ?? 0;
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
          <div className="space-y-3">
            <div className="rounded-2xl bg-[var(--accent-soft)] text-center py-5 px-4">
              <Lock className="size-6 text-[var(--accent)] mx-auto" />
              <p className="serif text-2xl text-ink mt-2">{sealedCount} message{sealedCount === 1 ? "" : "s"} waiting</p>
              <p className="text-ink/55 text-sm mt-1">
                Hidden — even from you — until {formatDate(page.celebration_date)}.
              </p>
            </div>
            {/* Blurred teaser of what's waiting */}
            {Array.from({ length: Math.min(Math.max(sealedCount, 1), 4) }).map((_, i) => (
              <div key={i} className="card select-none pointer-events-none" aria-hidden>
                <div className="blur-sm space-y-2">
                  <div className="h-3 rounded bg-ink/15 w-3/4" />
                  <div className="h-3 rounded bg-ink/10 w-1/2" />
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink/30">
                    <MessageCircle className="size-3.5" /> <span>Someone special</span>
                  </div>
                </div>
              </div>
            ))}
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
