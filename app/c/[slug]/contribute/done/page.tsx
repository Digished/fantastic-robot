import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart, MessageSquarePlus } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { isTheme } from "@/lib/themes";
import { AccountNudge } from "../../account-nudge";

export const dynamic = "force-dynamic";

export default async function ContributionDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { slug } = await params;
  const { name } = await searchParams;
  const supabase = await supabaseServer();

  const { data: page } = await supabase
    .from("celebrations")
    .select("id, slug, recipient_name, event_type, title, theme")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  const theme = isTheme(page.theme) ? page.theme : "ivory";
  const firstName = page.recipient_name.split(" ")[0];
  const displayName = name ? decodeURIComponent(name) : null;

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-5 py-16" data-theme={theme}>

      <div className="w-full max-w-sm text-center space-y-6">

        {/* Icon */}
        <div
          className="mx-auto size-20 rounded-full grid place-items-center shadow-glow"
          style={{ background: "var(--accent-soft)" }}
        >
          <Heart className="size-9 fill-[var(--accent)] text-[var(--accent)]" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="serif text-4xl text-ink leading-tight">
            {displayName ? `Thank you, ${displayName.split(" ")[0]}!` : "Thank you!"}
          </h1>
          <p className="text-ink/60 text-base mt-3 leading-relaxed">
            Your gift is on its way to {firstName}&apos;s surprise. It&apos;ll be delivered on the day — they won&apos;t see a thing until then.
          </p>
        </div>

        {/* Leave a message CTA */}
        <div className="card p-5 text-left space-y-3">
          <p className="serif text-lg text-ink">Leave {firstName} a message too</p>
          <p className="text-sm text-ink/55 leading-relaxed">
            A voice note, a video, a photo — or just a few words. They&apos;ll see it during their play-through.
          </p>
          <Link
            href={`/c/${slug}`}
            className="btn-accent w-full inline-flex items-center justify-center gap-2 mt-1"
          >
            <MessageSquarePlus className="size-4" />
            Add a message
          </Link>
        </div>

        <AccountNudge />

        <p className="text-xs text-ink/35">
          Made with Spendbox · for {page.recipient_name}
        </p>
      </div>
    </main>
  );
}
