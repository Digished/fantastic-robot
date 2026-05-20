import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatNaira, formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  reversed: "bg-red-100 text-red-800",
};

export default async function AdminPayoutsPage() {
  const admin = supabaseAdmin();

  const { data: payouts } = await admin
    .from("payouts")
    .select(
      "id, amount_kobo, paystack_transfer_code, paystack_reference, status, initiated_at, completed_at, celebration_id",
    )
    .order("initiated_at", { ascending: false })
    .limit(200);

  const celebrationIds = Array.from(
    new Set((payouts ?? []).map((p) => p.celebration_id).filter(Boolean)),
  );

  const { data: pages } = celebrationIds.length
    ? await admin
        .from("celebrations")
        .select("id, slug, recipient_name")
        .in("id", celebrationIds)
    : { data: [] as { id: string; slug: string; recipient_name: string }[] };

  const byId = new Map((pages ?? []).map((p) => [p.id, p]));

  const pendingTotal = (payouts ?? [])
    .filter((p) => !["success", "paid", "failed", "reversed"].includes(p.status))
    .reduce((acc, p) => acc + Number(p.amount_kobo ?? 0), 0);

  const paidTotal = (payouts ?? [])
    .filter((p) => p.status === "success" || p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount_kobo ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="serif text-4xl text-ink">Payouts</h1>
          <p className="text-ink/55 text-sm mt-1.5">
            Every Paystack transfer kicked off from spendbox.
          </p>
        </div>
        <div className="text-right text-sm text-ink/55">
          <div>
            Pending: <span className="text-ink font-medium">{formatNaira(pendingTotal)}</span>
          </div>
          <div>
            Paid: <span className="text-ink font-medium">{formatNaira(paidTotal)}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-ink/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/4 text-ink/55 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Celebration</th>
              <th className="text-left px-4 py-3 font-medium">Reference</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Initiated</th>
              <th className="text-left px-4 py-3 font-medium">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {(payouts ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink/45">
                  No payouts yet.
                </td>
              </tr>
            )}
            {(payouts ?? []).map((p) => {
              const page = p.celebration_id ? byId.get(p.celebration_id) : null;
              return (
                <tr key={p.id} className="hover:bg-ink/4">
                  <td className="px-4 py-2.5">
                    {page ? (
                      <Link
                        href={`/c/${page.slug}`}
                        target="_blank"
                        className="text-ink hover:underline"
                      >
                        {page.recipient_name}
                      </Link>
                    ) : (
                      <span className="text-ink/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink/70">
                    {p.paystack_reference}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[p.status] ?? "bg-ink/8 text-ink/70"}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-ink">
                    {formatNaira(p.amount_kobo)}
                  </td>
                  <td className="px-4 py-2.5 text-ink/65">
                    {formatDateTime(p.initiated_at)}
                  </td>
                  <td className="px-4 py-2.5 text-ink/65">
                    {formatDateTime(p.completed_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
