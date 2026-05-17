"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { messageSchema } from "@/lib/validation/schemas";

export type PostState = { error?: string };

export async function postMessage(
  slug: string,
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const payloadRaw = formData.get("interactivePayload") as string | null;
  let parsedPayload: Record<string, unknown> | undefined;
  if (payloadRaw) {
    try { parsedPayload = JSON.parse(payloadRaw); } catch { /* ignore */ }
  }

  const parsed = messageSchema.safeParse({
    body: (formData.get("body") as string) || undefined,
    mediaKind: (formData.get("mediaKind") as string) || "none",
    mediaPath: (formData.get("mediaPath") as string) || undefined,
    mediaDurationMs: formData.get("mediaDurationMs")
      ? Number(formData.get("mediaDurationMs"))
      : undefined,
    interactiveKind: (formData.get("interactiveKind") as string) || "none",
    interactivePayload: parsedPayload,
    contributorName: formData.get("contributorName"),
    contributorEmail: (formData.get("contributorEmail") as string) || undefined,
    contributorPhone: (formData.get("contributorPhone") as string) || undefined,
    isAnonymous: formData.get("isAnonymous") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Enforce duration caps server-side as a safety net.
  if (parsed.data.mediaKind === "audio" && (parsed.data.mediaDurationMs ?? 0) > 20_000) {
    return { error: "Audio must be 20 seconds or less." };
  }
  if (parsed.data.mediaKind === "video" && (parsed.data.mediaDurationMs ?? 0) > 15_000) {
    return { error: "Video must be 15 seconds or less." };
  }

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, status, deadline_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) return { error: "Page not found." };
  if (page.status !== "active" || new Date(page.deadline_at).getTime() < Date.now()) {
    return { error: "Messages are closed for this celebration." };
  }

  const { error } = await admin.from("messages").insert({
    celebration_id: page.id,
    contributor_name: parsed.data.isAnonymous ? "Someone special" : parsed.data.contributorName,
    contributor_email: parsed.data.contributorEmail ?? null,
    contributor_phone: parsed.data.contributorPhone ?? null,
    is_anonymous: parsed.data.isAnonymous,
    body: parsed.data.body ?? null,
    media_kind: parsed.data.mediaKind,
    media_path: parsed.data.mediaPath ?? null,
    media_duration_ms: parsed.data.mediaDurationMs ?? null,
    interactive_kind: parsed.data.interactiveKind,
    interactive_payload: parsed.data.interactivePayload ?? null,
  });
  if (error) return { error: error.message };

  redirect(`/c/${slug}?posted=1`);
}
