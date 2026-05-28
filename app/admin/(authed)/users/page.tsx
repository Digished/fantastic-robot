import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatNaira, formatDateTime } from "@/lib/admin/format";
import { Users, TrendingUp, Sparkles, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadUsers() {
  const admin = supabaseAdmin();

  const [usersResult, celebrationsResult, contribsResult, blessingsResult] =
    await Promise.all([
      admin
        .from("users")
        .select("id, email, display_name, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("celebrations")
        .select(
          "id, creator_id, slug, recipient_name, event_type, status, total_raised_kobo, contributor_count, payout_status, is_paid_for_creation, is_self, created_at",
        ),
      admin
        .from("contributions")
        .select("celebration_id, platform_fee_kobo, amount_gross_kobo")
        .eq("status", "paid"),
      admin
        .from("blessing_plans")
        .select("creator_id, amount_kobo")
        .in("status", ["active", "completed", "awaiting_redemption"]),
    ]);

  const users = usersResult.data ?? [];
  const celebrations = celebrationsResult.data ?? [];
  const contribs = contribsResult.data ?? [];
  const blessings = blessingsResult.data ?? [];

  // Map celebration_id → creator_id for contribution lookups
  const celebrationCreator = new Map(
    celebrations.map((c) => [c.id, c.creator_id]),
  );

  // Aggregate contributions per user (via celebration creator)
  const contribsByUser = new Map<string, { fees: number; gross: number; count: number }>();
  for (const c of contribs) {
    const uid = celebrationCreator.get(c.celebration_id);
    if (!uid) continue;
    const prev = contribsByUser.get(uid) ?? { fees: 0, gross: 0, count: 0 };
    contribsByUser.set(uid, {
      fees: prev.fees + Number(c.platform_fee_kobo ?? 0),
      gross: prev.gross + Number(c.amount_gross_kobo ?? 0),
      count: prev.count + 1,
    });
  }

  // Aggregate blessings revenue per user
  const blessingsByUser = new Map<string, number>();
  for (const b of blessings) {
    if (!b.creator_id) continue;
    blessingsByUser.set(
      b.creator_id,
      (blessingsByUser.get(b.creator_id) ?? 0) + Number(b.amount_kobo ?? 0),
    );
  }

  // Group celebrations per user
  const celebrationsByUser = new Map<string, typeof celebrations>();
  for (const c of celebrations) {
    const arr = celebrationsByUser.get(c.creator_id) ?? [];
    arr.push(c);
    celebrationsByUser.set(c.creator_id, arr);
  }

  // Build enriched user rows
  const enriched = users.map((u) => {
    const userCelebrations = celebrationsByUser.get(u.id) ?? [];
    const contrib = contribsByUser.get(u.id) ?? { fees: 0, gross: 0, count: 0 };
    const blessingRevenue = blessingsByUser.get(u.id) ?? 0;
    const totalRevenue = contrib.fees + blessingRevenue;

    return {
      ...u,
      celebrationCount: userCelebrations.length,
      celebrations: userCelebrations,
      contributionCount: contrib.count,
      platformFees: contrib.fees,
      grossProcessed: contrib.gross,
      blessingRevenue,
      totalRevenue,
    };
  });

  const totalUsers = enriched.length;
  const totalRevenue = enriched.reduce((a, u) => a + u.totalRevenue, 0);
  const totalCelebrations = enriched.reduce((a, u) => a + u.celebrationCount, 0);

  return { enriched, totalUsers, totalRevenue, totalCelebrations };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { enriched, totalUsers, totalRevenue, totalCelebrations } = await loadUsers();

  const filtered = q
    ? enriched.filter(
        (u) =>
          u.email.toLowerCase().includes(q.toLowerCase()) ||
          (u.display_name ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : enriched;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="serif text-3xl sm:text-4xl text-ink">Users</h1>
        <p className="text-ink/55 text-sm mt-1.5">
          Everyone who has signed in, with their revenue and activity.
        </p>
      </header>

      {/* Summary stats */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-ink/10 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-ink/50 text-xs uppercase tracking-wide mb-2">
            <Users className="size-3.5" />
            <span className="hidden sm:inline">Total Users</span>
            <span className="sm:hidden">Users</span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-ink">
            {totalUsers.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-ink/10 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-ink/50 text-xs uppercase tracking-wide mb-2">
            <TrendingUp className="size-3.5" />
            <span className="hidden sm:inline">Total Revenue</span>
            <span className="sm:hidden">Revenue</span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-ink">
            {formatNaira(totalRevenue)}
          </div>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-ink/10 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-ink/50 text-xs uppercase tracking-wide mb-2">
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Celebrations</span>
            <span className="sm:hidden">Pages</span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-ink">
            {totalCelebrations.toLocaleString()}
          </div>
        </div>
      </section>

      {/* Search */}
      <form action="" method="GET">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email or name…"
          className="field w-full sm:max-w-md"
        />
      </form>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-ink/45 text-sm py-8">No users found.</p>
        )}
        {filtered.map((u) => (
          <details key={u.id} className="group bg-white rounded-2xl border border-ink/10">
            <summary className="p-4 cursor-pointer list-none">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">
                    {u.display_name || u.email}
                  </p>
                  {u.display_name && (
                    <p className="text-ink/50 text-xs truncate">{u.email}</p>
                  )}
                  <p className="text-ink/40 text-xs mt-0.5 flex items-center gap-1">
                    <Calendar className="size-3" />
                    Joined {formatDateTime(u.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-ink text-sm">{formatNaira(u.totalRevenue)}</p>
                  <p className="text-ink/50 text-xs">{u.celebrationCount} page{u.celebrationCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/60">
                <span className="bg-ink/5 rounded-full px-2 py-0.5">
                  {u.contributionCount} contribution{u.contributionCount !== 1 ? "s" : ""}
                </span>
                <span className="bg-ink/5 rounded-full px-2 py-0.5">
                  {formatNaira(u.platformFees)} fees
                </span>
                {u.blessingRevenue > 0 && (
                  <span className="bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">
                    {formatNaira(u.blessingRevenue)} blessings
                  </span>
                )}
              </div>
            </summary>
            {u.celebrations.length > 0 && (
              <div className="border-t border-ink/8 px-4 pb-4 pt-3 space-y-2">
                <p className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-2">
                  Celebrations
                </p>
                {u.celebrations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <p className="text-ink truncate">{c.recipient_name}</p>
                      <p className="text-ink/45 text-xs">{c.event_type?.replace("_", " ")} · {c.payout_status}</p>
                    </div>
                    <span className="font-medium text-ink shrink-0">
                      {formatNaira(c.total_raised_kobo)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </details>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-3xl border border-ink/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/4 text-ink/55 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-right px-4 py-3 font-medium">Pages</th>
                <th className="text-right px-4 py-3 font-medium">Contributions</th>
                <th className="text-right px-4 py-3 font-medium">Gross processed</th>
                <th className="text-right px-4 py-3 font-medium">Platform fees</th>
                <th className="text-right px-4 py-3 font-medium">Blessings</th>
                <th className="text-right px-4 py-3 font-medium">Total revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink/45">
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <DesktopUserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DesktopUserRow({
  user: u,
}: {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    created_at: string;
    celebrationCount: number;
    celebrations: {
      id: string;
      slug: string;
      recipient_name: string;
      event_type: string;
      total_raised_kobo: number;
      payout_status: string;
    }[];
    contributionCount: number;
    platformFees: number;
    grossProcessed: number;
    blessingRevenue: number;
    totalRevenue: number;
  };
}) {
  return (
    <>
      <tr className="hover:bg-ink/4">
        <td className="px-4 py-3">
          <div>
            <p className="text-ink font-medium">{u.display_name || u.email}</p>
            {u.display_name && (
              <p className="text-ink/45 text-xs">{u.email}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-ink/55">{formatDateTime(u.created_at)}</td>
        <td className="px-4 py-3 text-right text-ink">{u.celebrationCount}</td>
        <td className="px-4 py-3 text-right text-ink">{u.contributionCount}</td>
        <td className="px-4 py-3 text-right text-ink">{formatNaira(u.grossProcessed)}</td>
        <td className="px-4 py-3 text-right text-ink">{formatNaira(u.platformFees)}</td>
        <td className="px-4 py-3 text-right text-ink">
          {u.blessingRevenue > 0 ? formatNaira(u.blessingRevenue) : <span className="text-ink/30">—</span>}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-ink">
          {formatNaira(u.totalRevenue)}
        </td>
      </tr>
      {u.celebrations.length > 0 && (
        <tr className="bg-ink/2">
          <td colSpan={8} className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-2 mt-1">
              {u.celebrations.map((c) => (
                <div
                  key={c.id}
                  className="inline-flex items-center gap-2 text-xs bg-white border border-ink/8 rounded-xl px-3 py-1.5"
                >
                  <span className="text-ink/60">{c.event_type?.replace("_", " ")}</span>
                  <span className="text-ink font-medium">{c.recipient_name}</span>
                  <span className="text-ink/45">{formatNaira(c.total_raised_kobo)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full ${
                      c.payout_status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.payout_status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.payout_status}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
