# Background music library

These tracks power the **Background music** picker on the celebration editor.
Each track in `lib/music.ts` expects a matching MP3 file in this folder, named
`<id>.mp3`. They are served statically at `/music/<id>.mp3`.

Required files (one per track id in `lib/music.ts`):

- `happy-birthday.mp3`
- `birthday-bounce.mp3`
- `celebration.mp3`
- `warm-piano.mp3`
- `acoustic-sunshine.mp3`
- `dreamy.mp3`
- `party-pop.mp3`
- `soft-strings.mp3`

Use only royalty-free / public-domain audio so the library stays free for
creators. Keep files small (ideally < 2 MB, ~128 kbps mono is plenty for
background ambience). If a file is missing the slideshow simply plays silently.

To add or remove a track, update the `MUSIC_TRACKS` array in `lib/music.ts`
and drop the corresponding MP3 here.
