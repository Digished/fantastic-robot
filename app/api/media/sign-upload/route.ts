import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const nid = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 16);

const schema = z.object({
  slug: z.string().min(6),
  ext: z.enum(["webm", "mp4", "m4a", "ogg", "jpg", "jpeg", "png", "webp"]),
  kind: z.enum(["audio", "video", "image"]),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, status")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!page || page.status === "archived") {
    return NextResponse.json({ error: "page not found" }, { status: 404 });
  }

  const path = `${page.id}/${parsed.data.kind}/${nid()}.${parsed.data.ext}`;
  const { data, error } = await admin.storage
    .from("celebrations")
    .createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
