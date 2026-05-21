// Server-only helpers that merge built-in tracks with the admin-managed
// `music_library` table and filter out anything in `music_disabled`. These
// must only be imported from server components, server actions and route
// handlers — they use the service-role Supabase client.

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  BUILTIN_TRACKS,
  builtinSrc,
  buildMusicValue,
  customSrc,
  isUploadedTrackId,
  isValidUploadedTrackId,
  makeUploadedTrack,
  parseMusicValue,
  type MusicTrack,
  type TrackClip,
} from "@/lib/music";

export async function getEffectiveTracks(): Promise<MusicTrack[]> {
  const admin = supabaseAdmin();
  const [disabledRes, customRes] = await Promise.all([
    admin.from("music_disabled").select("id"),
    admin
      .from("music_library")
      .select("id, label, mood, storage_path")
      .order("created_at", { ascending: true }),
  ]);

  const disabled = new Set(
    (disabledRes.data ?? []).map((r: { id: string }) => r.id),
  );

  const builtin: MusicTrack[] = BUILTIN_TRACKS
    .filter((t) => !disabled.has(t.id))
    .map((t) => ({ ...t, src: builtinSrc(t.id), source: "builtin" as const }));

  const custom: MusicTrack[] = (customRes.data ?? []).map(
    (r: { id: string; label: string; mood: string; storage_path: string }) => ({
      id: r.id,
      label: r.label,
      mood: r.mood,
      src: customSrc(r.storage_path),
      source: "custom" as const,
    }),
  );

  return [...builtin, ...custom];
}

/**
 * Returns the saved id when it still resolves to an enabled track (built-in
 * or custom). Otherwise returns null so the player falls back to silent.
 */
export async function resolveSavedTrackId(
  value: string | null | undefined,
): Promise<string | null> {
  const { id, clip } = parseMusicValue(value);
  if (!id) return null;
  // Per-page uploaded songs aren't in the library; validate the path shape.
  let valid: boolean;
  if (isUploadedTrackId(id)) valid = isValidUploadedTrackId(id);
  else {
    const tracks = await getEffectiveTracks();
    valid = tracks.some((t) => t.id === id);
  }
  if (!valid) return null;
  return buildMusicValue(id, clip);
}

/**
 * Like `resolveSavedTrackId` but returns the full track (with playable URL)
 * — useful for the celebrate/play page so the player gets the resolved URL
 * without resolving it again on the client.
 */
export async function resolveSavedTrack(
  value: string | null | undefined,
): Promise<(MusicTrack & { clip: TrackClip | null }) | null> {
  const { id, clip } = parseMusicValue(value);
  if (!id) return null;
  if (isUploadedTrackId(id)) {
    return isValidUploadedTrackId(id)
      ? { ...makeUploadedTrack(id), clip }
      : null;
  }
  const tracks = await getEffectiveTracks();
  const track = tracks.find((t) => t.id === id);
  return track ? { ...track, clip } : null;
}

/** Pretty list of all admin-managed entries, plus the disabled set. */
export async function getAdminMusicState(): Promise<{
  custom: Array<{
    id: string;
    label: string;
    mood: string;
    storage_path: string;
    created_at: string;
    src: string;
  }>;
  disabledBuiltins: Set<string>;
}> {
  const admin = supabaseAdmin();
  const [disabledRes, customRes] = await Promise.all([
    admin.from("music_disabled").select("id"),
    admin
      .from("music_library")
      .select("id, label, mood, storage_path, created_at")
      .order("created_at", { ascending: false }),
  ]);
  const disabled = new Set(
    (disabledRes.data ?? []).map((r: { id: string }) => r.id),
  );
  const custom = (customRes.data ?? []).map(
    (r: {
      id: string;
      label: string;
      mood: string;
      storage_path: string;
      created_at: string;
    }) => ({ ...r, src: customSrc(r.storage_path) }),
  );
  return { custom, disabledBuiltins: disabled };
}
