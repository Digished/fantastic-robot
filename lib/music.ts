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
  { id: "lo-fi-chill",      label: "Lo-Fi Chill",        mood: "Mellow, laid-back lo-fi beats" },
  { id: "afrobeats",        label: "Afrobeats",          mood: "Uplifting West African groove" },
  { id: "disco-fever",      label: "Disco Fever",        mood: "Groovy 70s dancefloor energy" },
  { id: "summer-vibes",     label: "Summer Vibes",       mood: "Bright and breezy feel-good" },
  { id: "jazz-club",        label: "Jazz Club",          mood: "Smooth late-night jazz" },
  { id: "epic-moment",      label: "Epic Moment",        mood: "Soaring cinematic build" },
  { id: "retro-arcade",     label: "Retro Arcade",       mood: "Punchy 8-bit chiptune fun" },
  { id: "reggae-chill",     label: "Reggae Chill",       mood: "Easy-going island rhythm" },
  { id: "funky-groove",     label: "Funky Groove",       mood: "Deep bass, heavy pocket" },
  { id: "midnight-rnb",     label: "Midnight R&B",       mood: "Smooth and soulful late-night" },
  { id: "bossa-nova",       label: "Bossa Nova",         mood: "Breezy Brazilian jazz swing" },
  { id: "gospel-joy",       label: "Gospel Joy",         mood: "Uplifting, full-of-life gospel" },
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
