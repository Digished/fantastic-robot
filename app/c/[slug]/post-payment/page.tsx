import { redirect } from "next/navigation";
import Link from "next/link";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PostPaymentPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref;

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, slug, is_paid_for_creation, creation_payment_reference")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) {
    return <FailureView slug={slug} reason="That page no longer exists." />;
  }

  // Webhook may have flipped the flag before the user's browser got here.
  // Treat that as success even if the callback dropped the reference.
  if (page.is_paid_for_creation) {
    redirect(`/c/${slug}?created=1`);
  }

  if (!reference) {
    return <FailureView slug={slug} reason="No payment reference found in the callback URL." />;
  }

  if (page.creation_payment_reference && page.creation_payment_reference !== reference) {
    return <FailureView slug={slug} reason="Payment reference doesn't match this page." />;
  }

  try {
    const { data } = await paystack.verifyTransaction(reference);
    if (data.status !== "success") {
      return <FailureView slug={slug} reason="Payment was not completed." />;
    }
    const { error } = await admin
      .from("celebrations")
      .update({ is_paid_for_creation: true, published_at: new Date().toISOString() })
      .eq("id", page.id)
      .eq("is_paid_for_creation", false);
    if (error) {
      return <FailureView slug={slug} reason="We received payment but couldn't activate the page. Refresh in a moment." />;
    }
  } catch (err) {
    const msg = err instanceof PaystackError ? err.message : "Could not verify payment";
    return <FailureView slug={slug} reason={msg} />;
  }

  redirect(`/c/${slug}?created=1`);
}

function FailureView({ slug, reason }: { slug: string; reason: string }) {
  return (
    <main className="min-h-[100dvh] bg-white grid place-items-center px-6">
      <div className="card text-center max-w-sm">
        <h1 className="serif text-3xl text-ink">Payment incomplete</h1>
        <p className="text-ink/60 mt-2 text-sm">{reason}</p>
        <p className="text-xs text-ink/45 mt-4">
          Don&apos;t worry — your page is saved. You&apos;ll find it on your dashboard and can
          finish payment whenever you&apos;re ready.
        </p>
        <Link href="/dashboard" className="btn-accent w-full mt-6 inline-flex justify-center">
          Back to dashboard
        </Link>
        <Link href={`/c/${slug}`} className="text-sm text-ink/55 hover:opacity-70 mt-4 inline-block">
          Go to the page instead
        </Link>
      </div>
    </main>
  );
}
