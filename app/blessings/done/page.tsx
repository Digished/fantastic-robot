import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack } from "@/lib/paystack/client";
import { activatePaidBlessing } from "@/lib/blessings/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function BlessingsDonePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const admin = supabaseAdmin();

  let plan = ref
    ? (
        await admin
          .from("blessing_plans")
          .select("id, recipient_name, status, paystack_reference")
          .eq("paystack_reference", ref)
          .maybeSingle()
      ).data
    : null;

  // The webhook usually lands first, but verify directly so the creator never
  // waits on a confirmation screen.
  if (plan && plan.status === "pending_payment" && ref) {
    try {
      const { data: tx } = await paystack.verifyTransaction(ref);
      if (tx.status === "success") {
        await activatePaidBlessing({ id: plan.id });
        const { data: fresh } = await admin
          .from("blessing_plans")
          .select("status")
          .eq("id", plan.id)
          .maybeSingle();
        if (fresh) plan = { ...plan, status: fresh.status };
      }
    } catch {
      /* fall through to the pending message */
    }
  }

  if (!plan) {
    return (
      <main className="min-h-[100dvh] bg-[#F4EDE1] grid place-items-center px-5">
        <div className="text-center max-w-md">
          <h1 className="serif text-2xl text-ink">We couldn&apos;t find that gift</h1>
          <Link href="/dashboard" className="btn-outline mt-4 inline-block">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const firstName = plan.recipient_name.split(" ")[0];
  const ready = plan.status === "active" || plan.status === "completed";

  return (
    <main className="min-h-[100dvh] bg-[#F4EDE1] grid place-items-center px-5 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="text-4xl mb-3">🕊️</div>
        <h1 className="serif text-3xl text-ink leading-tight">
          {ready ? `${firstName}'s year of blessings has begun` : "Confirming your payment…"}
        </h1>
        {ready ? (
          <>
            <p className="text-ink/65 mt-3">
              The first blessing is on its way to {firstName} right now, and a new one will reach
              them every week for a year. Nothing more to do.
            </p>
            <Link href="/dashboard" className="btn-outline mt-6 inline-block">Back to dashboard</Link>
          </>
        ) : (
          <p className="text-ink/65 mt-3">
            This can take a moment. Refresh shortly to see it confirmed.
          </p>
        )}
      </div>
    </main>
  );
}
