import { notFound } from "next/navigation";
import { loadCelebrationView } from "@/lib/celebration-view";
import { YearTabs } from "../year-tabs";
import { WishlistEditor, WishlistReadonly } from "./wishlist-editor";

export const dynamic = "force-dynamic";

export default async function WishlistPage({
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

  const { page, isCreator, viewCycle, isCurrent, years } = view;
  const wishlist = page.wishlist ?? [];
  const firstName = page.recipient_name.split(" ")[0];

  return (
    <main className="min-h-[100dvh] bg-white pb-24" data-theme={page.theme ?? "ivory"}>
      <div className="mx-auto max-w-2xl px-5 md:px-10 pt-6 space-y-6">
        <YearTabs slug={slug} active="wishlist" viewCycle={viewCycle} years={years} />

        <div>
          <h1 className="serif text-3xl text-ink">{isCreator ? "Your wishlist" : `${firstName}'s wishlist`}</h1>
          <p className="text-ink/55 text-sm mt-1">A few things {isCreator ? "you'd" : "they'd"} love — so the group gift hits the mark.</p>
        </div>

        {isCreator && isCurrent ? (
          <WishlistEditor slug={slug} initial={wishlist} />
        ) : (
          <WishlistReadonly items={wishlist} />
        )}

        {!isCurrent && (
          <p className="text-xs text-ink/40">Wishlists aren&apos;t archived per year — this shows the current list.</p>
        )}
      </div>
    </main>
  );
}
