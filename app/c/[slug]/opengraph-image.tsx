import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Theme } from "@/lib/themes";

export const runtime = "nodejs";
export const alt = "Spendbox celebration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark-mode mesh gradient backgrounds keyed by theme
const THEME_BACKGROUNDS: Record<Theme, string> = {
  ivory:    "linear-gradient(135deg, #3B2A1A 0%, #5C3D22 50%, #7A4F30 100%)",
  bloom:    "linear-gradient(135deg, #4A1535 0%, #7B2D52 50%, #A03D6A 100%)",
  sage:     "linear-gradient(135deg, #1A3325 0%, #2D5C3A 50%, #3A7A4F 100%)",
  ocean:    "linear-gradient(135deg, #0F2740 0%, #1A4A7A 50%, #2060A8 100%)",
  dusk:     "linear-gradient(135deg, #3D1F2E 0%, #6B3A55 50%, #8F4A6A 100%)",
  coral:    "linear-gradient(135deg, #3D1512 0%, #7A2A20 50%, #A03830 100%)",
  lavender: "linear-gradient(135deg, #2A1A50 0%, #4A2D8A 50%, #6040A8 100%)",
  gold:     "linear-gradient(135deg, #3A2800 0%, #6B5000 50%, #8F7010 100%)",
  forest:   "linear-gradient(135deg, #0F2E20 0%, #1A5C38 50%, #257A4A 100%)",
  berry:    "linear-gradient(135deg, #40102E 0%, #72204E 50%, #98286A 100%)",
  sky:      "linear-gradient(135deg, #0A2840 0%, #154A78 50%, #1E65A0 100%)",
  sunset:   "linear-gradient(135deg, #3A1800 0%, #7A3A10 50%, #A05020 100%)",
  mint:     "linear-gradient(135deg, #0A2E28 0%, #155C50 50%, #1E7A6A 100%)",
  peach:    "linear-gradient(135deg, #3A1A0A 0%, #7A3820 50%, #A04E30 100%)",
  midnight: "linear-gradient(135deg, #0A050A 0%, #1A0E14 50%, #2A1421 100%)",
  noir:     "linear-gradient(135deg, #0A0908 0%, #1A1512 50%, #2A2018 100%)",
};

const THEME_ACCENTS: Record<Theme, string> = {
  ivory: "#D9613C", bloom: "#F472B6", sage: "#34D399", ocean: "#60A5FA",
  dusk: "#FFAE8F", coral: "#FCA5A5", lavender: "#C4B5FD", gold: "#FCD34D",
  forest: "#6EE7B7", berry: "#F472B6", sky: "#7DD3FC", sunset: "#FDBA74",
  mint: "#5EEAD4", peach: "#FFBE99", midnight: "#F472B6", noir: "#FCD34D",
};

function formatOGDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default async function OG({ params }: { params: { slug: string } }) {
  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, title, recipient_name, event_type, celebration_date, theme, current_cycle")
    .eq("slug", params.slug)
    .maybeSingle();

  // Count sealed messages for the badge
  let messageCount = 0;
  if (page) {
    const { count } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("celebration_id", page.id)
      .eq("cycle", page.current_cycle ?? 1)
      .is("deleted_at", null);
    messageCount = count ?? 0;
  }

  const title = page?.title ?? "A Spendbox celebration";
  const recipient = page?.recipient_name ?? "";
  const theme = (page?.theme ?? "ivory") as Theme;
  const bg = THEME_BACKGROUNDS[theme] ?? THEME_BACKGROUNDS.ivory;
  const accent = THEME_ACCENTS[theme] ?? "#D9613C";
  const days = page ? daysUntil(page.celebration_date) : 0;
  const eventLabel = page ? page.event_type.replace(/_/g, " ") : "celebration";
  const dateStr = page ? formatOGDate(page.celebration_date) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          padding: 72, background: bg, color: "#FFFFFF",
          justifyContent: "space-between", position: "relative",
        }}
      >
        {/* Lock badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28, opacity: 0.7 }}>Spendbox</div>
          <div style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.12)", borderRadius: 100,
            padding: "8px 18px", fontSize: 20, display: "flex", alignItems: "center", gap: 8,
          }}>
            🔒 {days > 0 ? `${days} day${days === 1 ? "" : "s"} to go` : "Today's the day!"}
          </div>
        </div>

        {/* Main content */}
        <div>
          <div style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.6, marginBottom: 16 }}>
            {eventLabel}{dateStr ? ` · ${dateStr}` : ""}
          </div>
          <div style={{ fontSize: 90, lineHeight: 1.0, fontFamily: "serif", fontStyle: "italic" }}>
            {title}
          </div>
          {recipient && (
            <div style={{ marginTop: 20, fontSize: 36, color: accent }}>
              For {recipient}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, opacity: 0.6 }}>
            Leave a message · contribute · share 💫
          </div>
          {messageCount > 0 && (
            <div style={{
              background: accent, color: "#000", borderRadius: 100,
              padding: "8px 20px", fontSize: 22, fontWeight: "bold",
            }}>
              {messageCount} surprise{messageCount === 1 ? "" : "s"} sealed ✨
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
