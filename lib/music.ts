// Background-music library for celebration pages.
//
// Two sources are merged into one list at runtime:
//  1. Built-in tracks — defined here as code; the WAV files live in
//     `public/music/<id>.wav`, synthesised by `scripts/generate-music.py`.
//     Any built-in can be hidden site-wide by inserting its id into the
//     `music_disabled` table from the admin dashboard.
//  2. Custom tracks — uploaded via the admin dashboard, stored in the
//     `celebrations` Supabase Storage bucket under `music/<id>.<ext>`, with
//     metadata in the `music_library` table.

import { env } from "@/lib/env";

export type MusicSource = "builtin" | "custom";

export type TrackClip = { startSec: number; endSec: number };

export type MusicTrack = {
  id: string;
  label: string;
  mood: string;
  src: string;            // playable URL (public)
  source: MusicSource;
  bpm?: number;           // approx tempo — paces the slideshow to the song
};

export const BUILTIN_TRACKS: ReadonlyArray<Omit<MusicTrack, "src" | "source">> = [
  { id: "happy-birthday",   label: "Happy Birthday",     mood: "The classic birthday tune",        bpm: 96 },
  { id: "birthday-bounce",  label: "Birthday Bounce",    mood: "Upbeat pop birthday party",        bpm: 124 },
  { id: "celebration",      label: "Celebration",        mood: "Bright, festive party energy",     bpm: 116 },
  { id: "warm-piano",       label: "Warm Piano",         mood: "Gentle and heartfelt",             bpm: 72 },
  { id: "acoustic-sunshine",label: "House Party",        mood: "Feel-good piano-house groove",     bpm: 120 },
  { id: "dreamy",           label: "Dreamy",             mood: "Soft, reflective ambience",        bpm: 70 },
  { id: "party-pop",        label: "Party Pop",          mood: "Energetic feel-good dance-pop",    bpm: 128 },
  { id: "soft-strings",     label: "EDM Anthem",         mood: "Big-room festival energy",         bpm: 128 },
  { id: "lo-fi-chill",      label: "Lo-Fi Chill",        mood: "Mellow, laid-back lo-fi beats",    bpm: 82 },
  { id: "afrobeats",        label: "Afrobeats",          mood: "Uplifting West African groove",    bpm: 108 },
  { id: "disco-fever",      label: "Disco Fever",        mood: "Groovy 70s dancefloor energy",     bpm: 120 },
  { id: "summer-vibes",     label: "Summer Vibes",       mood: "Bright tropical-house feel-good",  bpm: 112 },
  { id: "jazz-club",        label: "Latin Heat",         mood: "Spicy reggaeton party groove",     bpm: 96 },
  { id: "epic-moment",      label: "Pop Anthem",         mood: "Soaring stadium-pop singalong",    bpm: 120 },
  { id: "retro-arcade",     label: "Retro Dance",        mood: "Neon 80s synth-pop dancefloor",    bpm: 118 },
  { id: "reggae-chill",     label: "Dancehall",          mood: "Sunny dancehall party bounce",     bpm: 100 },
  { id: "funky-groove",     label: "Funky Groove",       mood: "Deep bass, heavy party pocket",    bpm: 112 },
  { id: "midnight-rnb",     label: "R&B Groove",         mood: "Smooth feel-good R&B bop",         bpm: 90 },
  { id: "bossa-nova",       label: "Carnival",           mood: "Percussion-packed samba party",    bpm: 104 },
  { id: "gospel-joy",       label: "Gospel Joy",         mood: "Hand-clapping gospel celebration", bpm: 100 },
];

export const BUILTIN_TRACK_IDS = new Set(BUILTIN_TRACKS.map((t) => t.id));

export function builtinSrc(id: string): string {
  return `/music/${id}.wav`;
}

export function customSrc(storagePath: string): string {
  return `${env.supabaseUrl()}/storage/v1/object/public/celebrations/${storagePath}`;
}

// ── Per-page uploaded songs ───────────────────────────────────────────────
// A creator can upload their own track for a single celebration. Rather than
// adding it to the shared library, we store it inline in `background_music`
// as `upload:<storage_path>`. This keeps the song scoped to that one page and
// avoids a schema change.
export const UPLOAD_PREFIX = "upload:";
// Storage path is constrained to the music/custom/ prefix so a tampered value
// can't point the player at an arbitrary object.
const SAFE_UPLOAD_PATH = /^music\/custom\/[A-Za-z0-9][A-Za-z0-9/_-]*\.[A-Za-z0-9]+$/;

export function isUploadedTrackId(id: string | null | undefined): id is string {
  return !!id && id.startsWith(UPLOAD_PREFIX);
}

export function uploadedTrackPath(id: string): string {
  return id.slice(UPLOAD_PREFIX.length);
}

export function uploadedTrackId(storagePath: string): string {
  return `${UPLOAD_PREFIX}${storagePath}`;
}

export function isValidUploadedTrackId(id: string): boolean {
  return isUploadedTrackId(id) && SAFE_UPLOAD_PATH.test(uploadedTrackPath(id));
}

export function makeUploadedTrack(id: string, label?: string): MusicTrack {
  return {
    id,
    label: label && label.trim() ? label.trim() : "Your uploaded song",
    mood: "Your upload",
    src: customSrc(uploadedTrackPath(id)),
    source: "custom",
  };
}

// ── Play-from / play-until clip window ─────────────────────────────────────
// The stored `background_music` value can carry an optional clip window so the
// slideshow only plays a chosen section: `<trackId>#clip=<start>-<end>` with
// times in seconds. This rides on the existing column — no schema change.
export function parseMusicValue(
  value: string | null | undefined,
): { id: string | null; clip: TrackClip | null } {
  if (!value) return { id: null, clip: null };
  const marker = value.indexOf("#clip=");
  if (marker === -1) return { id: value, clip: null };
  const id = value.slice(0, marker);
  const [s, e] = value.slice(marker + 6).split("-").map(Number);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s || s < 0) {
    return { id, clip: null };
  }
  return { id, clip: { startSec: s, endSec: e } };
}

export function buildMusicValue(id: string, clip: TrackClip | null): string {
  if (!clip) return id;
  const r = (n: number) => Math.round(n * 10) / 10;
  return `${id}#clip=${r(clip.startSec)}-${r(clip.endSec)}`;
}

export function findTrack(
  value: string | null | undefined,
  tracks: ReadonlyArray<MusicTrack>,
): MusicTrack | null {
  const { id } = parseMusicValue(value);
  if (!id) return null;
  const found = tracks.find((t) => t.id === id);
  if (found) return found;
  // An uploaded track may not be in the passed list (e.g. fresh page load
  // before it's merged in) — synthesise it from the id.
  if (isValidUploadedTrackId(id)) return makeUploadedTrack(id);
  return null;
}
