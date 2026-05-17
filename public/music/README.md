# Background music library

These WAV files power the **Background music** picker in the celebration
editor. Each track in `lib/music.ts` has a matching `<id>.wav` here, served
statically at `/music/<id>.wav`.

The tracks are synthesised, royalty-free instrumental loops — no licensing
needed. They are produced by `scripts/generate-music.py`. To regenerate (or
after editing `MUSIC_TRACKS` in `lib/music.ts`):

```bash
pip install numpy
python3 scripts/generate-music.py
```

Each clip is a short, seamlessly-looping phrase (~15–30s) and is kept small
(22 kHz mono) since it plays quietly under the slideshow. If a file is missing
the slideshow simply plays silently.

To add or swap a track: add a `t_<name>()` builder + entry in `TRACKS` in the
script, add the matching entry to `MUSIC_TRACKS` in `lib/music.ts`, then rerun
the script.
