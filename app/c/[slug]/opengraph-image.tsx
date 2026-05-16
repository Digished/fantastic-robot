import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const alt = "Spendbox celebration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { slug: string } }) {
  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("title, recipient_name, event_type")
    .eq("slug", params.slug)
    .maybeSingle();

  const title = page?.title ?? "A Spendbox celebration";
  const sub = page ? `For ${page.recipient_name}` : "Celebrate the people you love";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          padding: 72, background: "#FBF6EE", color: "#3B1F2B",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.6 }}>Spendbox</div>
        <div>
          <div style={{ fontSize: 84, lineHeight: 1.05, fontFamily: "serif" }}>{title}</div>
          <div style={{ marginTop: 24, fontSize: 36, color: "#D9613C" }}>{sub}</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.6 }}>
          Leave a message · contribute · share on WhatsApp
        </div>
      </div>
    ),
    size,
  );
}
