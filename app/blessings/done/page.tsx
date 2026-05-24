import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack } from "@/lib/paystack/client";
import { env } from "@/lib/env";
import { ShareLink } from "./share-link";

export const dynamic = "force-dynamic";

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
          .select("id, recipient_name, status, redeem_token, paystack_reference")
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
        const expires = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
        await admin
          .from("blessing_plans")
          .update({ status: "awaiting_redemption", redeem_expires_at: expires })
          .eq("id", plan.id)
          .eq("status", "pending_payment");
        plan = { ...plan, status: "awaiting_redemption" };
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
  const shareUrl = `${env.appUrl()}/blessings/redeem/${plan.redeem_token}`;
  const ready = plan.status === "awaiting_redemption";

  return (
    <main className="min-h-[100dvh] bg-[#F4EDE1] grid place-items-center px-5 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="text-4xl mb-3">🕊️</div>
        <h1 className="serif text-3xl text-ink leading-tight">
          {ready ? "Their year of blessings is ready" : "Confirming your payment…"}
        </h1>
        {ready ? (
          <>
            <p className="text-ink/65 mt-3">
              Send this link to {firstName}. They have <strong>72 hours</strong> to add their email
              and start receiving a blessing every week for a year.
            </p>
            <div className="mt-6 text-left">
              <ShareLink url={shareUrl} />
            </div>
            <Link href="/dashboard" className="btn-outline mt-6 inline-block">Back to dashboard</Link>
          </>
        ) : (
          <p className="text-ink/65 mt-3">
            This can take a moment. Refresh shortly and your share link will appear here.
          </p>
        )}
      </div>
    </main>
  );
}
