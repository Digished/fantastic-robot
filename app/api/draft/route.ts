import { supabaseServer } from "@/lib/supabase/server";

const MAX_PAYLOAD = 250_000;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Bad payload" }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_PAYLOAD) {
    return Response.json({ error: "Draft too large" }, { status: 413 });
  }

  const { error } = await supabase
    .from("page_drafts")
    .upsert({ creator_id: user.id, data: body, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  await supabase.from("page_drafts").delete().eq("creator_id", user.id);
  return Response.json({ ok: true });
}
