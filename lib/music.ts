// Free background-music library for celebration pages.
//
// Audio files live in `public/music/<id>.wav` and are served statically.
// They are synthesised, royalty-free instrumentals — regenerate any time
// with `python3 scripts/generate-music.py`. See `public/music/README.md`.

export type MusicTrack = {
  id: string;
  label: string;
  mood: string;
};

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "happy-birthday",   label: "Happy Birthday",     mood: "The classic birthday tune" },
  { id: "birthday-bounce",  label: "Birthday Bounce",    mood: "Playful and upbeat" },
  { id: "celebration",      label: "Celebration",        mood: "Bright, festive party energy" },
  { id: "warm-piano",       label: "Warm Piano",         mood: "Gentle and heartfelt" },
  { id: "acoustic-sunshine",label: "Acoustic Sunshine",  mood: "Easy-going acoustic guitar" },
  { id: "dreamy",           label: "Dreamy",             mood: "Soft, reflective ambience" },
  { id: "party-pop",        label: "Party Pop",          mood: "Energetic feel-good pop" },
  { id: "soft-strings",     label: "Soft Strings",       mood: "Tender, cinematic strings" },
];

export const MUSIC_IDS = MUSIC_TRACKS.map((t) => t.id) as [string, ...string[]];

export function isMusicTrack(v: unknown): v is string {
  return typeof v === "string" && MUSIC_TRACKS.some((t) => t.id === v);
}

export function musicTrack(id: string | null | undefined): MusicTrack | null {
  if (!id) return null;
  return MUSIC_TRACKS.find((t) => t.id === id) ?? null;
}

export function musicSrc(id: string): string {
  return `/music/${id}.wav`;
}
