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

// `id` values are stable (they are also the WAV filenames and are stored on
// saved celebrations); labels/moods reflect each track's current style.
export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "happy-birthday",   label: "Happy Birthday",     mood: "The classic birthday tune" },
  { id: "birthday-bounce",  label: "Birthday Bounce",    mood: "Upbeat pop birthday party" },
  { id: "celebration",      label: "Celebration",        mood: "Bright, festive party energy" },
  { id: "warm-piano",       label: "Warm Piano",         mood: "Gentle and heartfelt" },
  { id: "acoustic-sunshine",label: "House Party",        mood: "Feel-good piano-house groove" },
  { id: "dreamy",           label: "Dreamy",             mood: "Soft, reflective ambience" },
  { id: "party-pop",        label: "Party Pop",          mood: "Energetic feel-good dance-pop" },
  { id: "soft-strings",     label: "EDM Anthem",         mood: "Big-room festival energy" },
  { id: "lo-fi-chill",      label: "Lo-Fi Chill",        mood: "Mellow, laid-back lo-fi beats" },
  { id: "afrobeats",        label: "Afrobeats",          mood: "Uplifting West African groove" },
  { id: "disco-fever",      label: "Disco Fever",        mood: "Groovy 70s dancefloor energy" },
  { id: "summer-vibes",     label: "Summer Vibes",       mood: "Bright tropical-house feel-good" },
  { id: "jazz-club",        label: "Latin Heat",         mood: "Spicy reggaeton party groove" },
  { id: "epic-moment",      label: "Pop Anthem",         mood: "Soaring stadium-pop singalong" },
  { id: "retro-arcade",     label: "Retro Dance",        mood: "Neon 80s synth-pop dancefloor" },
  { id: "reggae-chill",     label: "Dancehall",          mood: "Sunny dancehall party bounce" },
  { id: "funky-groove",     label: "Funky Groove",       mood: "Deep bass, heavy party pocket" },
  { id: "midnight-rnb",     label: "R&B Groove",         mood: "Smooth feel-good R&B bop" },
  { id: "bossa-nova",       label: "Carnival",           mood: "Percussion-packed samba party" },
  { id: "gospel-joy",       label: "Gospel Joy",         mood: "Hand-clapping gospel celebration" },
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
