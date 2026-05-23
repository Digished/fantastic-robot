import Link from "next/link";
import { AlertCircle, Wallet, TrendingUp, Hourglass, Sparkles } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystack, PaystackError } from "@/lib/paystack/client";
import { PAGE_CREATION_FEE_KOBO } from "@/lib/fees";
import { formatNaira, formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

type BalanceRow = { currency: string; balance: number };

async function loadBalances(): Promise<{
  balances: BalanceRow[];
  error: string | null;
}> {
  try {
    const { data } = await paystack.getBalance();
    return { balances: data ?? [], error: null };
  } catch (e) {
    const message =
      e instanceof PaystackError ? e.message : "Could not load Paystack balance";
    return { balances: [], error: message };
  }
}

async function loadMetrics() {
  const admin = supabaseAdmin();

  const [
    paidContribs,
    paidPagesCount,
    pendingPayouts,
    pendingClaims,
    celebrationsCount,
  ] = await Promise.all([
    admin
      .from("contributions")
      .select("platform_fee_kobo, amount_gross_kobo")
      .eq("status", "paid"),
    admin
      .from("celebrations")
      .select("*", { count: "exact", head: true })
      .eq("is_paid_for_creation", true)
      .not("creation_payment_reference", "is", null),
    admin
      .from("payouts")
      .select("id, amount_kobo, status, initiated_at, celebration_id")
      .not("status", "in", '("success","failed","paid","reversed")')
      .order("initiated_at", { ascending: false }),
    admin
      .from("celebrations")
      .select("id, slug, recipient_name, total_raised_kobo, payout_status, claimable_at")
      .gt("total_raised_kobo", 0)
      .in("payout_status", ["pending", "processing"])
      .order("claimable_at", { ascending: true })
      .limit(50),
    admin
      .from("celebrations")
      .select("*", { count: "exact", head: true }),
  ]);

  const platformFees = (paidContribs.data ?? []).reduce(
    (acc, r) => acc + Number(r.platform_fee_kobo ?? 0),
    0,
  );
  const grossProcessed = (paidContribs.data ?? []).reduce(
    (acc, r) => acc + Number(r.amount_gross_kobo ?? 0),
    0,
  );
  const paidPages = paidPagesCount.count ?? 0;
  const creationRevenue = paidPages * Number(PAGE_CREATION_FEE_KOBO);
  const totalRevenue = platformFees + creationRevenue;

  const pendingPayoutRows = pendingPayouts.data ?? [];
  const pendingPayoutTotal = pendingPayoutRows.reduce(
    (acc, r) => acc + Number(r.amount_kobo ?? 0),
    0,
  );

  return {
    totalRevenue,
    platformFees,
    creationRevenue,
    paidPages,
    grossProcessed,
    pendingPayoutRows,
    pendingPayoutTotal,
    pendingClaims: pendingClaims.data ?? [],
    celebrationsCount: celebrationsCount.count ?? 0,
    paidContribCount: paidContribs.data?.length ?? 0,
  };
}

export default async function AdminOverviewPage() {
  const [{ balances, error: balanceError }, m] = await Promise.all([
    loadBalances(),
    loadMetrics(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="serif text-4xl text-ink">Overview</h1>
        <p className="text-ink/55 text-sm mt-1.5">
          Revenue, payouts and Paystack wallet at a glance.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<TrendingUp className="size-4" />}
          label="Total revenue"
          value={formatNaira(m.totalRevenue)}
          sub={`Fees ${formatNaira(m.platformFees)} · Creation ${formatNaira(m.creationRevenue)}`}
        />
        <Stat
          icon={<Hourglass className="size-4" />}
          label="Pending payouts"
          value={formatNaira(m.pendingPayoutTotal)}
          sub={`${m.pendingPayoutRows.length} in flight`}
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Paystack wallet"
          value={
            balances[0]
              ? formatNaira(balances[0].balance)
              : balanceError
                ? "—"
                : "₦0"
          }
          sub={balanceError ?? (balances[0]?.currency ?? "")}
          error={!!balanceError}
        />
        <Stat
          icon={<Sparkles className="size-4" />}
          label="Celebrations"
          value={m.celebrationsCount.toLocaleString()}
          sub={`${m.paidPages} paid · ${m.paidContribCount} contributions`}
        />
      </section>

      {balanceError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2 items-start">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&rsquo;t reach Paystack balance API.</p>
            <p className="text-amber-800/90 mt-0.5">{balanceError}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-ink/10 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Recent pending payouts</h2>
          <Link href="/admin/payouts" className="text-sm text-ink/55 hover:text-ink">
            See all →
          </Link>
        </div>
        {m.pendingPayoutRows.length === 0 ? (
          <p className="text-ink/45 text-sm mt-3">No payouts in flight.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/8">
            {m.pendingPayoutRows.slice(0, 8).map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-ink/70 truncate">{p.id}</span>
                <span className="text-ink/55">{p.status}</span>
                <span className="text-ink font-medium">{formatNaira(p.amount_kobo)}</span>
                <span className="text-ink/45 hidden sm:inline">
                  {formatDateTime(p.initiated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-ink/10 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Celebrations awaiting claim</h2>
          <Link href="/admin/celebrations" className="text-sm text-ink/55 hover:text-ink">
            See all →
          </Link>
        </div>
        {m.pendingClaims.length === 0 ? (
          <p className="text-ink/45 text-sm mt-3">Nothing awaiting claim.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/8">
            {m.pendingClaims.slice(0, 8).map((c) => (
              <li
                key={c.id}
                className="py-2.5 flex items-center justify-between text-sm gap-3"
              >
                <Link
                  href={`/c/${c.slug}`}
                  target="_blank"
                  className="text-ink hover:underline truncate"
                >
                  {c.recipient_name}
                </Link>
                <span className="text-ink/55">{c.payout_status}</span>
                <span className="text-ink font-medium">
                  {formatNaira(c.total_raised_kobo)}
                </span>
                <span className="text-ink/45 hidden sm:inline">
                  {formatDateTime(c.claimable_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  error?: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border border-ink/10 p-5">
      <div className="flex items-center gap-2 text-ink/50 text-xs uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2.5 text-2xl font-semibold text-ink">{value}</div>
      {sub && (
        <div
          className={`mt-1 text-xs ${
            error ? "text-amber-700" : "text-ink/45"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
