"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { editMessageSchema, messageSchema } from "@/lib/validation/schemas";
import { contentWindowOpen } from "@/lib/celebration-windows";

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
    contributorSessionId: (formData.get("contributorSessionId") as string) || undefined,
    isAnonymous: formData.get("isAnonymous") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.mediaKind === "audio" && (parsed.data.mediaDurationMs ?? 0) > 20_000) {
    return { error: "Audio must be 20 seconds or less." };
  }
  if (parsed.data.mediaKind === "video" && (parsed.data.mediaDurationMs ?? 0) > 15_000) {
    return { error: "Video must be 15 seconds or less." };
  }

  const admin = supabaseAdmin();
  const { data: page } = await admin
    .from("celebrations")
    .select("id, status, celebration_date, current_cycle, is_sealed, is_self, claimable_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) return { error: "Page not found." };
  if (page.status !== "active" || !contentWindowOpen(page.celebration_date)) {
    return { error: "Messages are closed for this celebration." };
  }

  const { error } = await admin.from("messages").insert({
    celebration_id: page.id,
    cycle: page.current_cycle,
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
    contributor_session_id: parsed.data.contributorSessionId ?? null,
  });
  if (error) return { error: error.message };

  // On a sealed page the wall is hidden, so send them back to the post page
  // where they can still see and edit what they just sent. Otherwise land on
  // the wall so they see their card among the rest.
  const sealed =
    (page.is_sealed || page.is_self) && new Date(page.claimable_at).getTime() > Date.now();
  redirect(sealed ? `/c/${slug}/post?sent=1` : `/c/${slug}?posted=1`);
}

export type EditState = { error?: string; ok?: boolean };

export async function editOwnMessage(
  slug: string,
  messageId: string,
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const parsed = editMessageSchema.safeParse({
    body: (formData.get("body") as string) || undefined,
    contributorSessionId: formData.get("contributorSessionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = supabaseAdmin();

  // Verify the message belongs to this session id.
  const { data: msg } = await admin
    .from("messages")
    .select("id, celebration_id, contributor_session_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.deleted_at) return { error: "Message not found." };
  if (!msg.contributor_session_id || msg.contributor_session_id !== parsed.data.contributorSessionId) {
    return { error: "You can only edit your own card." };
  }

  const { error } = await admin
    .from("messages")
    .update({ body: parsed.data.body ?? null })
    .eq("id", messageId);
  if (error) return { error: error.message };

  return { ok: true };
}

export async function deleteOwnMessage(
  messageId: string,
  contributorSessionId: string,
): Promise<{ error?: string; ok?: boolean }> {
  if (!contributorSessionId) return { error: "Missing session." };

  const admin = supabaseAdmin();
  const { data: msg } = await admin
    .from("messages")
    .select("id, contributor_session_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.deleted_at) return { error: "Message not found." };
  if (msg.contributor_session_id !== contributorSessionId) {
    return { error: "Not your card." };
  }

  const { error } = await admin
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) return { error: error.message };
  return { ok: true };
}
