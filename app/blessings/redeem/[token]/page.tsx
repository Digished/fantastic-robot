import { supabaseAdmin } from "@/lib/supabase/admin";
import { RedeemForm } from "./redeem-form";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-[#F4EDE1] grid place-items-center px-5 py-12">
      <div className="w-full max-w-md text-center">{children}</div>
    </main>
  );
}

export default async function RedeemPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = supabaseAdmin();
  const { data: plan } = await admin
    .from("blessing_plans")
    .select("recipient_name, sender_name, status, redeem_expires_at, redeem_token")
    .eq("redeem_token", token)
    .maybeSingle();

  if (!plan) {
    return (
      <Shell>
        <h1 className="serif text-2xl text-ink">This link isn&apos;t valid</h1>
        <p className="text-ink/60 mt-2">Double-check the link you were sent.</p>
      </Shell>
    );
  }

  const firstName = plan.recipient_name.split(" ")[0];
  const expired =
    plan.status === "expired" ||
    (!!plan.redeem_expires_at && new Date(plan.redeem_expires_at).getTime() < Date.now());

  if (plan.status === "active" || plan.status === "completed") {
    return (
      <Shell>
        <div className="text-4xl mb-3">🕊️</div>
        <h1 className="serif text-2xl text-ink">Already claimed</h1>
        <p className="text-ink/60 mt-2">Your year of blessings is on its way, one week at a time.</p>
      </Shell>
    );
  }

  if (expired || plan.status === "pending_payment") {
    return (
      <Shell>
        <h1 className="serif text-2xl text-ink">
          {expired ? "This link has expired" : "Not ready yet"}
        </h1>
        <p className="text-ink/60 mt-2">
          {expired
            ? "The 72-hour window to claim this gift has passed. Ask whoever sent it to set it up again."
            : "This gift is still being prepared. Try again shortly."}
        </p>
      </Shell>
    );
  }

  const sender = plan.sender_name?.trim();

  return (
    <Shell>
      <div className="text-4xl mb-3">🕊️</div>
      <h1 className="serif text-3xl text-ink leading-tight">
        A year of blessings for {firstName}
      </h1>
      <p className="text-ink/65 mt-3">
        {sender ? `${sender} set this up for you.` : "Someone who loves you set this up."}{" "}
        Every week for a year, a short prayer or blessing will arrive in your inbox.
      </p>
      <p className="text-ink/55 mt-2 text-sm">
        Add your email to begin. You can stop anytime from any email.
      </p>
      <div className="mt-6">
        <RedeemForm token={plan.redeem_token} firstName={firstName} />
      </div>
    </Shell>
  );
}
