"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { BUILTIN_TRACK_IDS } from "@/lib/music";

const MUSIC_BUCKET = "celebrations";
const MUSIC_PREFIX = "music";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTS = ["mp3", "wav", "m4a", "ogg", "oga", "webm"] as const;
const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
]);

const suffix = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 6);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    || "track";
}

function extFromName(name: string): string | null {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return (ALLOWED_EXTS as readonly string[]).includes(ext) ? ext : null;
}

export type SoundsActionState = { error?: string; ok?: string };

export async function uploadCustomMusic(
  _prev: SoundsActionState,
  formData: FormData,
): Promise<SoundsActionState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const mood = String(formData.get("mood") ?? "").trim();
  const file = formData.get("file");

  if (!label) return { error: "Label is required." };
  if (label.length > 60) return { error: "Label is too long (60 chars max)." };
  if (!mood) return { error: "Mood is required." };
  if (mood.length > 80) return { error: "Mood is too long (80 chars max)." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Audio file is required." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Audio file is too large (10 MB max)." };
  }
  const ext = extFromName(file.name);
  if (!ext) {
    return {
      error: `Unsupported file type. Use ${ALLOWED_EXTS.join(", ")}.`,
    };
  }
  if (file.type && !ALLOWED_MIME.has(file.type) && !file.type.startsWith("audio/")) {
    return { error: `Unsupported MIME type: ${file.type}` };
  }

  const baseId = slugify(label);
  const id = BUILTIN_TRACK_IDS.has(baseId) ? `${baseId}-${suffix()}` : baseId;
  const storagePath = `${MUSIC_PREFIX}/${id}.${ext}`;
  const admin = supabaseAdmin();

  // Make sure no row already uses this id (extremely unlikely, but safe).
  const { data: existing } = await admin
    .from("music_library")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  const finalId = existing ? `${id}-${suffix()}` : id;
  const finalPath = `${MUSIC_PREFIX}/${finalId}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const upload = await admin.storage
    .from(MUSIC_BUCKET)
    .upload(finalPath, bytes, {
      contentType: file.type || `audio/${ext}`,
      upsert: false,
    });
  if (upload.error) return { error: `Upload failed: ${upload.error.message}` };

  const { error } = await admin.from("music_library").insert({
    id: finalId,
    label,
    mood,
    storage_path: finalPath,
  });
  if (error) {
    await admin.storage.from(MUSIC_BUCKET).remove([finalPath]);
    return { error: error.message };
  }

  revalidatePath("/admin/sounds");
  return { ok: `Added “${label}”.` };
}

export async function deleteCustomMusic(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = supabaseAdmin();
  const { data: track } = await admin
    .from("music_library")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!track) return;

  // Drop the saved track from any celebration that still references it.
  await admin
    .from("celebrations")
    .update({ background_music: null })
    .eq("background_music", id);

  await admin.from("music_library").delete().eq("id", id);
  await admin.storage.from(MUSIC_BUCKET).remove([track.storage_path]);

  revalidatePath("/admin/sounds");
}

export async function toggleBuiltinMusic(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!BUILTIN_TRACK_IDS.has(id)) return;

  const admin = supabaseAdmin();
  if (action === "disable") {
    await admin.from("music_disabled").upsert({ id });
  } else if (action === "enable") {
    await admin.from("music_disabled").delete().eq("id", id);
  }

  revalidatePath("/admin/sounds");
}
