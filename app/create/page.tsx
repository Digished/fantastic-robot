import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Cake, PartyPopper, Check } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getBanks } from "@/lib/paystack/banks";
import { getEffectiveTracks } from "@/lib/music/server";
import { rehydrateDraft, type SavedDraft } from "@/lib/draft/draft";
import { BIRTHDAY_ONLY } from "@/lib/features";
import { CreateForm } from "./form";

export default async function CreatePage({
  searchParams,
}: { searchParams: Promise<{ for?: string }> }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  // Birthdays-only mode: there's no "who's this for?" choice and no creating
  // for someone else — everyone lands on their own birthday page.
  if (BIRTHDAY_ONLY) redirect("/create/me");

  const { for: forWhom } = await searchParams;

  // Step 1 — who's this for? Shown until a choice is made.
  if (forWhom !== "other") return <WhoChooser />;

  // Step 2 — the full flow for celebrating someone else.
  const [banks, tracks, draftRow] = await Promise.all([
    getBanks(),
    getEffectiveTracks(),
    supabase
      .from("page_drafts")
      .select("data, updated_at")
      .eq("creator_id", user.id)
      .maybeSingle(),
  ]);

  let initialDraft: SavedDraft | null = null;
  if (draftRow.data?.data) {
    const stored = draftRow.data.data as Omit<SavedDraft, "updatedAt">;
    initialDraft = rehydrateDraft({
      ...stored,
      updatedAt: new Date(draftRow.data.updated_at).getTime(),
    });
  }

  return <CreateForm banks={banks} tracks={tracks} initialDraft={initialDraft} />;
}

function WhoChooser() {
  return (
    <main className="min-h-[100dvh] bg-white pb-20" data-theme="ivory">
      <div className="mx-auto max-w-3xl px-5 md:px-10 pt-8">
        <Link href="/dashboard" className="text-ink/55 text-sm hover:text-ink inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>

        <div className="mt-8 fade-up">
          <h1 className="serif text-4xl md:text-5xl text-ink leading-[0.95]">Who&apos;s this for?</h1>
          <p className="text-ink/55 mt-3 text-base">
            Plan a surprise for someone you love, or set up your own page and let everyone surprise you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-9">
          {/* Someone else */}
          <Link
            href="/create?for=other"
            className="card group flex flex-col gap-4 hover:shadow-card transition-shadow fade-up"
            style={{ animationDelay: "60ms" }}
          >
            <span className="size-12 rounded-2xl grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <PartyPopper className="size-5" />
            </span>
            <div>
              <p className="serif text-2xl text-ink">For someone else</p>
              <p className="text-ink/55 text-sm mt-2 leading-relaxed">
                A surprise page for a friend. Gather everyone&apos;s messages and a group gift that lands in their account on the day.
              </p>
            </div>
            <ul className="space-y-2 mt-1">
              {["You set the theme, music & story", "Friends add messages and chip in", "Verify where the gift should go"].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-ink/70">
                  <Check className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" /> {line}
                </li>
              ))}
            </ul>
            <span className="btn-accent shadow-soft mt-auto inline-flex items-center justify-center gap-2">
              Continue <ArrowRight className="size-4" />
            </span>
          </Link>

          {/* Myself */}
          <Link
            href="/create/me"
            className="card group flex flex-col gap-4 hover:shadow-card transition-shadow relative overflow-hidden fade-up"
            style={{ animationDelay: "120ms" }}
          >
            <span className="size-12 rounded-2xl grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Cake className="size-5" />
            </span>
            <div>
              <p className="serif text-2xl text-ink">For myself</p>
              <p className="text-ink/55 text-sm mt-2 leading-relaxed">
                Your own birthday or milestone. It stays sealed — a surprise even from you — while friends fill it with messages and gifts.
              </p>
            </div>
            <ul className="space-y-2 mt-1">
              {["Sealed until your day arrives", "Add a wishlist for the gift", "Renews every year for birthdays"].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-ink/70">
                  <Check className="size-4 mt-0.5 shrink-0 text-[var(--accent)]" /> {line}
                </li>
              ))}
            </ul>
            <span className="btn-accent shadow-soft mt-auto inline-flex items-center justify-center gap-2">
              Continue <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
