import Link from "next/link";
import { Cake, Gift, MessageCircle, ArrowRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { ClaimButton } from "./claim-button";

export type PastCycle = {
  cycle: number;
  celebration_date: string;
  total_raised_kobo: number | string | null;
  contributor_count: number | null;
  payout_status: string | null;
};

/** The age the celebrant turned on a given cycle, if we know their birth year. */
function ageForCycle(dateOfBirth: string | null, celebrationDate: string): number | null {
  if (!dateOfBirth) return null;
  const birthYear = Number(dateOfBirth.slice(0, 4));
  const cycleYear = new Date(celebrationDate).getUTCFullYear();
  if (!birthYear || !cycleYear) return null;
  const age = cycleYear - birthYear;
  return age > 0 && age < 130 ? age : null;
}

/**
 * A beautiful "throwback" of past birthdays. Each milestone card relives a year:
 * the age turned, the messages and gifts that landed, and a link back into that
 * year's wall. Creators can still claim any past payout that's outstanding.
 */
export function ThrowbackMilestones({
  slug,
  cycles,
  dateOfBirth,
  messageCounts,
  isCreator,
}: {
  slug: string;
  cycles: PastCycle[];
  dateOfBirth: string | null;
  messageCounts: Record<number, number>;
  isCreator: boolean;
}) {
  if (!cycles.length) return null;

  return (
    <section className="mt-4 fade-up">
      <div className="flex items-center gap-2 mb-1">
        <Cake className="size-5 text-[var(--accent)]" />
        <h2 className="serif text-3xl text-ink">Throwback</h2>
      </div>
      <p className="text-sm text-ink/50 mb-4">
        Every birthday you&apos;ve celebrated here — relive the messages and gifts.
      </p>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {cycles.map((c) => {
          const year = new Date(c.celebration_date).getUTCFullYear();
          const age = ageForCycle(dateOfBirth, c.celebration_date);
          const gifts = Number(c.contributor_count ?? 0);
          const messages = messageCounts[c.cycle] ?? 0;
          const raised = Number(c.total_raised_kobo ?? 0);
          const canClaim = isCreator && c.payout_status === "pending" && raised > 0;

          return (
            <div
              key={c.cycle}
              className="snap-start shrink-0 w-64 rounded-3xl2 bg-white shadow-ring overflow-hidden flex flex-col"
            >
              {/* Header band */}
              <div className="relative theme-mesh px-5 pt-5 pb-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-ink/55">{year}</p>
                {age !== null ? (
                  <p className="serif text-3xl text-ink mt-1 leading-none">Turned {age}</p>
                ) : (
                  <p className="serif text-3xl text-ink mt-1 leading-none">Birthday</p>
                )}
              </div>

              {/* Stats */}
              <div className="px-5 py-4 space-y-3 flex-1">
                <div className="flex items-center gap-4 text-sm text-ink/70">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-4 text-ink/40" /> {messages}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Gift className="size-4 text-ink/40" /> {gifts}
                  </span>
                </div>
                {isCreator && raised > 0 && (
                  <p className="serif text-xl text-[var(--accent)]">{formatNaira(raised)}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 space-y-2">
                <Link
                  href={`/c/${slug}?cycle=${c.cycle}`}
                  className="btn-outline w-full py-2 text-sm inline-flex items-center justify-center gap-1.5"
                >
                  Relive this year <ArrowRight className="size-3.5" />
                </Link>
                {canClaim && (
                  <ClaimButton slug={slug} cycle={c.cycle} amountKobo={raised} compact />
                )}
                {isCreator && c.payout_status === "paid" && (
                  <p className="text-center text-[11px] text-ink/40">✓ gift received</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
