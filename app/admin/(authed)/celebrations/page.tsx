import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatNaira, formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminCelebrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const admin = supabaseAdmin();

  let query = admin
    .from("celebrations")
    .select(
      "id, slug, title, recipient_name, event_type, status, celebration_date, total_raised_kobo, contributor_count, payout_status, is_paid_for_creation, is_self, background_music, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (q) {
    query = query.or(
      `recipient_name.ilike.%${q}%,title.ilike.%${q}%,slug.ilike.%${q}%`,
    );
  }

  const { data: pages, error } = await query;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="serif text-3xl sm:text-4xl text-ink">Celebrations</h1>
        <p className="text-ink/55 text-sm mt-1.5">
          Every celebration page (showing up to {PAGE_SIZE}).
        </p>
      </header>

      <form action="" method="GET">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, title or slug…"
          className="field w-full sm:max-w-md"
        />
      </form>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      )}

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {(pages ?? []).length === 0 && (
          <p className="text-center text-ink/45 text-sm py-8">No celebrations found.</p>
        )}
        {(pages ?? []).map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-ink/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{p.recipient_name}</p>
                <p className="text-ink/55 text-sm truncate">{p.title}</p>
              </div>
              <Link
                href={`/c/${p.slug}`}
                target="_blank"
                className="flex-shrink-0 flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
              >
                <ExternalLink className="size-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-ink/6 text-ink/70">
                {p.event_type?.replace("_", " ")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-ink/6 text-ink/70">
                {p.payout_status}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.is_paid_for_creation
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {p.is_paid_for_creation ? p.status : "unpaid"}
              </span>
              {p.is_self && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  free
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/45 text-xs">{formatDateTime(p.celebration_date)}</span>
              <span className="font-semibold text-ink">{formatNaira(p.total_raised_kobo)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-3xl border border-ink/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/4 text-ink/55 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Recipient</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Event</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Raised</th>
                <th className="text-left px-4 py-3 font-medium">Payout</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {(pages ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink/45">
                    No celebrations found.
                  </td>
                </tr>
              )}
              {(pages ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-ink/4">
                  <td className="px-4 py-2.5 text-ink">{p.recipient_name}</td>
                  <td className="px-4 py-2.5 text-ink/75 truncate max-w-[18rem]">
                    {p.title}
                  </td>
                  <td className="px-4 py-2.5 text-ink/55">{p.event_type}</td>
                  <td className="px-4 py-2.5 text-ink/55">
                    {formatDateTime(p.celebration_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-ink">
                    {formatNaira(p.total_raised_kobo)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/6 text-ink/70">
                      {p.payout_status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.is_paid_for_creation
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.is_paid_for_creation ? p.status : "unpaid"}
                      </span>
                      {p.is_self && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                          free
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/c/${p.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm text-ink/55 hover:text-ink"
                    >
                      View <ExternalLink className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
