import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const nid = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 16);

const schema = z.object({
  ext: z.enum(["jpg", "jpeg", "png", "webp", "mp4", "mov", "webm"]),
  slug: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, status, deadline_at")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "closed" }, { status: 403 });
  }

  const path = `gallery/contrib/${nid()}.${parsed.data.ext}`;
  const { data, error } = await admin.storage
    .from("celebrations")
    .createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
