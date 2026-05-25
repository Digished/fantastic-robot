import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = supabaseAdmin();
  // Idempotent: stop future sends for an active plan. Already-cancelled or
  // unknown tokens just fall through to the same calm confirmation.
  await admin
    .from("blessing_plans")
    .update({ status: "cancelled" })
    .eq("redeem_token", token)
    .eq("status", "active");

  return (
    <main className="min-h-[100dvh] bg-[#F4EDE1] grid place-items-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-3">🤍</div>
        <h1 className="serif text-2xl text-ink">You&apos;re unsubscribed</h1>
        <p className="text-ink/60 mt-2">
          No more weekly blessings will be sent. We hope they brought a little light while they lasted.
        </p>
      </div>
    </main>
  );
}
