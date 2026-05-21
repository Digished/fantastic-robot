import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
const nid = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 16);

const schema = z.object({ ext: z.enum(["mp3", "m4a", "aac", "ogg", "wav"]) });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Unsupported audio type" }, { status: 400 });

  const path = `music/custom/${user.id}/${nid()}.${parsed.data.ext}`;
  const { data, error } = await supabaseAdmin().storage
    .from("celebrations")
    .createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
