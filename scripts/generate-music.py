#!/usr/bin/env python3
"""Generate the free background-music library into public/music/.

Each track is a unique, ~2-minute, dynamic instrumental tailored to its
genre — hand-written melodies, genre-specific drum patterns, distinct
timbres, multi-section arrangements with builds and dynamics.

Usage (from repo root):  python3 scripts/generate-music.py

Requires: numpy  (pip install numpy)
"""
import os
import wave
import numpy as np

SR = 22050  # plenty for ducked background music; keeps files small
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "music"))

# ── Notes ────────────────────────────────────────────────────────────────────
NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n2f(name):
    """Note name like 'A4', 'C#5', 'Eb3' -> frequency in Hz. None -> 0 (rest)."""
    if name is None or name == "" or name == "_":
        return 0.0
    p = name[0]
    i = 1
    semis = NOTE_BASE[p]
    if i < len(name) and name[i] in "#b":
        semis += 1 if name[i] == "#" else -1
        i += 1
    octv = int(name[i:])
    midi = 12 * (octv + 1) + semis
    return 440.0 * 2 ** ((midi - 69) / 12)


# ── Timbres (harmonic profiles) ──────────────────────────────────────────────
PIANO   = [1.0, 0.45, 0.22, 0.10, 0.05, 0.025]
BELL    = [1.0, 0.20, 0.55, 0.12, 0.28, 0.07]
PLUCK   = [1.0, 0.62, 0.36, 0.18, 0.09]
STRING  = [1.0, 0.55, 0.40, 0.24, 0.15, 0.09]
BASS    = [1.0, 0.50, 0.20, 0.07]
BRASS_H = [0.55, 1.0, 0.75, 0.45, 0.28, 0.16, 0.09]
ORGAN_H = [1.0, 0.85, 0.55, 0.30, 0.22, 0.12]
RHODES  = [1.0, 0.32, 0.18, 0.55, 0.12, 0.06]
MARIMBA = [1.0, 0.12, 0.45, 0.06, 0.22]
NYLON   = [1.0, 0.42, 0.30, 0.18, 0.10]
SAX_H   = [0.75, 1.0, 0.62, 0.45, 0.30, 0.18, 0.10]
CHOIR   = [1.0, 0.50, 0.35, 0.20, 0.12, 0.08]
FLUTE   = [1.0, 0.10, 0.04, 0.02]


# ── Envelope helpers ─────────────────────────────────────────────────────────
def _fadeout(env, secs=0.022):
    r = min(int(secs * SR), len(env))
    if r > 0:
        env[-r:] *= np.linspace(1, 0, r)
    return env


# ── Voices ───────────────────────────────────────────────────────────────────
def pluck(f, dur, harm, decay, attack=0.004, vib=0.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for k, amp in enumerate(harm, 1):
        ph = 2 * np.pi * f * k * t
        if vib:
            ph += vib * np.sin(2 * np.pi * 5.5 * t)
        sig += amp * np.sin(ph)
    env = np.exp(-t * decay)
    a = int(attack * SR)
    if 0 < a < n:
        env[:a] *= np.linspace(0, 1, a)
    return sig * _fadeout(env)


def pad(f, dur, harm, attack=0.35, release=0.45, trem=0.12, tremrate=0.5, vib=0.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for k, amp in enumerate(harm, 1):
        det = 1 + 0.0026 * ((k % 2) * 2 - 1)
        pmod = vib * np.sin(2 * np.pi * 4.5 * t) if vib else 0
        sig += amp * np.sin(2 * np.pi * f * k * det * t + pmod)
    env = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    if a > 0:
        env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0:
        env[-r:] *= np.linspace(1, 0, min(r, n))
    env *= (1 - trem) + trem * 0.5 * (1 + np.sin(2 * np.pi * tremrate * t))
    return sig * env


def brass(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    vib = 0.011 * np.sin(2 * np.pi * 5.8 * t)
    sig = np.zeros(n)
    for k, amp in enumerate(BRASS_H, 1):
        sig += amp * np.sin(2 * np.pi * f * k * t * (1 + vib))
    a = int(0.05 * SR); r = int(0.10 * SR)
    env = np.ones(n)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    # subtle mid-note swell
    env *= 0.82 + 0.18 * np.sin(np.pi * np.clip(t / max(t[-1], 1e-3), 0, 1))
    return sig * env * vol


def organ_voice(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    leslie = 0.006 * np.sin(2 * np.pi * 6.4 * t)
    sig = np.zeros(n)
    for k, amp in enumerate(ORGAN_H, 1):
        sig += amp * np.sin(2 * np.pi * f * k * t * (1 + leslie))
    env = np.ones(n)
    a = int(0.015 * SR); r = int(0.04 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


def square_wave(f, dur, duty=0.5, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    ph = (f * t) % 1
    sig = np.where(ph < duty, 1.0, -1.0)
    env = np.ones(n)
    a = int(0.003 * SR); r = int(0.012 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


def triangle_wave(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    sig = 4 * np.abs(((f * t + 0.25) % 1) - 0.5) - 1
    env = np.ones(n)
    a = int(0.003 * SR); r = int(0.020 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


def saw_lead(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    vib = 0.005 * np.sin(2 * np.pi * 5.5 * t)
    sig = 2 * (((f * (1 + vib)) * t) % 1) - 1
    env = np.ones(n)
    a = int(0.012 * SR); r = int(0.04 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


def sax_voice(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    vib = 0.008 * np.sin(2 * np.pi * 5.2 * t)
    sig = np.zeros(n)
    for k, amp in enumerate(SAX_H, 1):
        sig += amp * np.sin(2 * np.pi * f * k * t * (1 + vib))
    # gentle attack/breath
    env = np.ones(n)
    a = int(0.06 * SR); r = int(0.08 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


def flute_voice(f, dur, vol=1.0):
    n = int(dur * SR)
    if n <= 0 or f <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    vib = 0.006 * np.sin(2 * np.pi * 4.5 * t)
    breath = 0.04 * np.random.uniform(-1, 1, n)
    sig = np.zeros(n)
    for k, amp in enumerate(FLUTE, 1):
        sig += amp * np.sin(2 * np.pi * f * k * t * (1 + vib))
    sig += breath
    env = np.ones(n)
    a = int(0.05 * SR); r = int(0.07 * SR)
    if a > 0: env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0: env[-r:] *= np.linspace(1, 0, min(r, n))
    return sig * env * vol


# ── Percussion ───────────────────────────────────────────────────────────────
def kick(dur=0.24, punch=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 108 * np.exp(-t * 32) + 46
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * punch


def snare(dur=0.18, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 18) * 0.55
    nz = np.random.uniform(-1, 1, n) * np.exp(-t * 13)
    return (tone + nz) * 0.82 * vol


def hat(dur=0.06, decay=55):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    nz = np.diff(nz, prepend=0.0)
    return nz * np.exp(-t * decay)


def hat_open(dur=0.22):
    return hat(dur=dur, decay=12)


def clap(dur=0.16, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    env = np.zeros(n)
    for off, amp in [(0, 0.6), (0.015, 0.85), (0.030, 1.0), (0.055, 0.5)]:
        s = int(off * SR)
        if s < n:
            env[s:] += amp * np.exp(-np.arange(n - s) / SR * 32)
    # slight band-pass via subtraction
    return nz * env * 0.75 * vol


def rim_click(dur=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 820 * t) * np.exp(-t * 70) * 0.65


def shaker(dur=0.09, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    return nz * (np.exp(-t * 32) - np.exp(-t * 110)) * 1.2 * vol


def tom(f=120, dur=0.30, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    pitch = f * np.exp(-t * 4) * 0.55 + f * 0.75
    ph = 2 * np.pi * np.cumsum(pitch) / SR
    return np.sin(ph) * np.exp(-t * 5.5) * 0.85 * vol


def cymbal_crash(dur=1.2, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    nz = np.diff(nz, prepend=0.0)
    # bright-then-fading
    env = np.exp(-t * 2.8)
    return nz * env * 0.6 * vol


def tambourine(dur=0.10, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    nz = np.diff(nz, prepend=0.0)
    jingle = np.sin(2 * np.pi * 6400 * t) * np.exp(-t * 30) * 0.3
    return (nz * np.exp(-t * 26) + jingle) * 0.55 * vol


def vinyl_crackle(n_samples, intensity=0.012):
    nz = np.random.uniform(-1, 1, n_samples)
    pops = np.zeros(n_samples)
    # sparse pops
    for _ in range(int(n_samples / SR * 2.2)):
        s = np.random.randint(0, n_samples)
        amp = np.random.uniform(0.3, 1.0)
        L = min(int(0.004 * SR), n_samples - s)
        if L > 0:
            pops[s:s+L] += amp * np.exp(-np.arange(L) / SR * 280)
    return (nz * 0.35 + pops) * intensity


# ── Placement / chord helpers ────────────────────────────────────────────────
def place(buf, sig, start):
    if len(sig) == 0:
        return
    s = int(start * SR)
    if s >= len(buf) or s < 0:
        return
    e = min(len(buf), s + len(sig))
    buf[s:e] += sig[: e - s]


CHORDS = {
    "maj":   [0, 4, 7],
    "min":   [0, 3, 7],
    "dim":   [0, 3, 6],
    "sus4":  [0, 5, 7],
    "sus2":  [0, 2, 7],
    "maj7":  [0, 4, 7, 11],
    "min7":  [0, 3, 7, 10],
    "dom7":  [0, 4, 7, 10],
    "maj9":  [0, 4, 7, 11, 14],
    "min9":  [0, 3, 7, 10, 14],
    "add9":  [0, 4, 7, 14],
}


def chord_freqs(root_note, quality="maj"):
    base = n2f(root_note)
    return [base * 2 ** (s / 12) for s in CHORDS[quality]]


def transpose(note, semis):
    """Transpose a note name by ±semitones, returning a new note name."""
    if note is None or note == "_":
        return note
    f = n2f(note)
    f *= 2 ** (semis / 12)
    midi = round(12 * np.log2(f / 440.0) + 69)
    octv = midi // 12 - 1
    pc = midi % 12
    sharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return f"{sharps[pc]}{octv}"


# ── DSP ──────────────────────────────────────────────────────────────────────
def space(x, amount=0.15):
    """Multi-tap echo for a sense of space."""
    out = x.copy()
    for dly, g in [(41, 0.6), (67, 0.46), (89, 0.34), (113, 0.25)]:
        d = int(dly / 1000 * SR)
        ech = np.zeros(len(x))
        ech[d:] = x[: len(x) - d]
        out += amount * g * ech
    return out


def chorus(x, depth_ms=8.0, rate_hz=0.6, mix=0.35):
    """Subtle modulated delay — adds width / lushness."""
    n = len(x)
    if n == 0:
        return x
    t = np.arange(n) / SR
    base = int(0.018 * SR)
    mod = (depth_ms / 1000) * SR * np.sin(2 * np.pi * rate_hz * t)
    idx = np.arange(n) - base - mod
    idx = np.clip(idx, 0, n - 1).astype(int)
    wet = x[idx]
    return (1 - mix) * x + mix * wet


def sidechain_duck(buf, pulse_times, depth=0.45, hold=0.04, release=0.22):
    """Pull the buffer down at each pulse time (creates pump on kicks)."""
    env = np.ones(len(buf))
    h, r = int(hold * SR), int(release * SR)
    for pt in pulse_times:
        s = int(pt * SR)
        if s >= len(buf) or s < 0:
            continue
        e1 = min(len(buf), s + h)
        env[s:e1] = np.minimum(env[s:e1], 1 - depth)
        e2 = min(len(buf), e1 + r)
        if e2 > e1:
            env[e1:e2] = np.minimum(env[e1:e2], (1 - depth) + depth * np.linspace(0, 1, e2 - e1))
    return buf * env


def fade_in_out(buf, fade_in=2.0, fade_out=4.0):
    n = len(buf)
    fi = min(int(fade_in * SR), n // 2)
    fo = min(int(fade_out * SR), n // 2)
    if fi > 0:
        buf[:fi] *= np.linspace(0, 1, fi)
    if fo > 0:
        buf[-fo:] *= np.linspace(1, 0, fo)
    return buf


def finalize(x, fade_out=3.0):
    """Smooth fade-out, then master."""
    x = np.asarray(x, dtype=np.float64)
    if fade_out > 0:
        fo = min(int(fade_out * SR), len(x) // 3)
        if fo > 0:
            x[-fo:] *= np.linspace(1, 0, fo)
    peak = np.max(np.abs(x)) + 1e-9
    x = x / peak * 0.92
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    return x * 0.96


def write_wav(name, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(f"  {name:18s} {len(x)/SR:5.1f}s  {len(data)//1024:5d} KB")


# ── Sequencer helpers ────────────────────────────────────────────────────────
def play_melody(buf, melody, t0, spb, instr_fn, vol=1.0, gate=0.95,
                octave_shift=0, swing=0.0, **kw):
    """melody: list of (note, beats) or (note, beats, velocity).
       swing: 0..0.25, delays off-beats (eighth-note swing)."""
    t = t0
    eighth = spb / 2
    for item in melody:
        if len(item) == 2:
            note, beats = item; vel = 1.0
        else:
            note, beats, vel = item
        dur = beats * spb
        if note is not None and note != "_":
            n_oct = transpose(note, 12 * octave_shift) if octave_shift else note
            # swing: shift if landing on an off-eighth
            t_play = t
            if swing > 0:
                k = round((t - t0) / eighth)
                if k % 2 == 1 and abs(t - t0 - k * eighth) < eighth * 0.25:
                    t_play = t0 + k * eighth + swing * eighth
            sig = instr_fn(n2f(n_oct), dur * gate + 0.18, **kw) * vol * vel
            place(buf, sig, t_play)
        t += dur


def play_chord(buf, root_note, quality, t0, dur, instr_fn, vol=1.0, voicing=None, **kw):
    if voicing is None:
        notes = chord_freqs(root_note, quality)
    else:
        # voicing is a list of semitone offsets from root
        base = n2f(root_note)
        notes = [base * 2 ** (s / 12) for s in voicing]
    for f in notes:
        place(buf, instr_fn(f, dur, **kw) * vol, t0)


def bar_kick_snare_hat(buf, t0, spb, pattern_kick, pattern_snare, pattern_hat,
                       k_vol=0.55, s_vol=0.5, h_vol=0.22, swing=0.0):
    """Pattern strings: 16 chars, X = hit, . = rest, o = open-hat (in pattern_hat)."""
    step = spb / 4  # 16th-note grid
    for i, ch in enumerate(pattern_kick):
        if ch == "X":
            place(buf, kick() * k_vol, t0 + i * step)
    for i, ch in enumerate(pattern_snare):
        if ch == "X":
            place(buf, snare(vol=1.0) * s_vol, t0 + i * step)
    for i, ch in enumerate(pattern_hat):
        if ch == "X" or ch == "x":
            ts = t0 + i * step
            if swing > 0 and i % 2 == 1:
                ts += swing * step
            place(buf, hat() * h_vol, ts)
        elif ch == "o":
            ts = t0 + i * step
            place(buf, hat_open() * h_vol * 1.3, ts)


# ════════════════════════════════════════════════════════════════════════════
# TRACKS
# ════════════════════════════════════════════════════════════════════════════

# ── 1. Happy Birthday ────────────────────────────────────────────────────────
def t_happy_birthday():
    """Classic Happy Birthday melody, played 5 times with progressively richer
    accompaniment — solo piano → +strings → +bell counter-melody + flourish."""
    spb = 60 / 88
    # (note, beats, root, quality)
    verse = [
        ("G4", .75, "C", "maj"), ("G4", .25, "C", "maj"), ("A4", 1, "C", "maj"),
        ("G4", 1, "C", "maj"), ("C5", 1, "C", "maj"), ("B4", 2, "G", "maj"),
        ("G4", .75, "G", "maj"), ("G4", .25, "G", "maj"), ("A4", 1, "G", "maj"),
        ("G4", 1, "G", "maj"), ("D5", 1, "G", "maj"), ("C5", 2, "C", "maj"),
        ("G4", .75, "C", "maj"), ("G4", .25, "C", "maj"), ("G5", 1, "C", "maj"),
        ("E5", 1, "C", "maj"), ("C5", 1, "F", "maj"), ("B4", 1, "G", "maj"),
        ("A4", 2, "C", "maj"),
        ("F5", .75, "F", "maj"), ("F5", .25, "F", "maj"), ("E5", 1, "C", "maj"),
        ("C5", 1, "C", "maj"), ("D5", 1, "G", "maj"), ("C5", 3, "C", "maj"),
    ]
    verse_beats = sum(b for _, b, _, _ in verse)
    n_verses = 5
    interlude_beats = 8
    intro_beats = 8
    outro_beats = 12
    total_beats = intro_beats + n_verses * verse_beats + (n_verses - 1) * interlude_beats + outro_beats
    total = total_beats * spb + 2.0
    buf = np.zeros(int(total * SR))

    # Intro: rolling arpeggio over C → G
    intro_notes = ["C4", "E4", "G4", "C5", "G4", "B4", "D5", "G5"]
    for i, n in enumerate(intro_notes):
        place(buf, pluck(n2f(n), spb * 0.9, PIANO, 4.0) * 0.32, i * spb)
    place(buf, pluck(n2f("C2"), spb * 4, BASS, 1.4) * 0.32, 0)
    place(buf, pluck(n2f("G2"), spb * 4, BASS, 1.4) * 0.30, 4 * spb)
    # soft pad under intro
    for f in chord_freqs("C3", "maj"):
        place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.4, release=0.4) * 0.10, 0)
    for f in chord_freqs("G3", "maj"):
        place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.4, release=0.4) * 0.10, 4 * spb)

    def play_verse(t_start, level):
        # backing chord segments
        segs, t = [], t_start
        for note, d, root, q in verse:
            dur = d * spb
            if segs and segs[-1][2] == root:
                segs[-1][1] += dur
            else:
                segs.append([t, dur, root, q])
            t += dur
        for st, dur, root, q in segs:
            # bass line
            place(buf, pluck(n2f(root + "2"), dur + 0.15, BASS, 2.4, attack=0.01) * 0.34, st)
            place(buf, pluck(n2f(root + "3"), dur + 0.15, BASS, 2.0, attack=0.01) * 0.18, st + dur / 2)
            if level >= 2:
                for f in chord_freqs(root + "3", q):
                    place(buf, pad(f, dur + 0.3, STRING, attack=0.18, release=0.35) * 0.14, st)
            if level >= 3:
                # add a delicate bell octave above tonic of chord
                place(buf, pluck(n2f(root + "5"), 0.7, BELL, 2.0) * 0.18, st + 0.0)
        # melody
        t = t_start
        for note, d, root, q in verse:
            dur = d * spb
            vol = 0.50 + 0.06 * level
            place(buf, pluck(n2f(note), dur * 0.96 + 0.18, PIANO, 3.4) * vol, t)
            if level >= 3:
                # counter-melody one octave up at half volume on long notes
                if d >= 1.5:
                    place(buf, pluck(n2f(transpose(note, 12)), dur * 0.9, BELL, 2.8) * 0.22, t + dur * 0.25)
            t += dur

    cursor = intro_beats * spb
    for v in range(n_verses):
        play_verse(cursor, v + 1)
        cursor += verse_beats * spb
        if v < n_verses - 1:
            # Interlude: ascending piano flourish, pad sustain
            chord_pairs = [("F", "maj"), ("G", "maj")]
            for k, (rt, q) in enumerate(chord_pairs):
                for f in chord_freqs(rt + "3", q):
                    place(buf, pad(f, interlude_beats / 2 * spb + 0.3, STRING,
                                   attack=0.2, release=0.35) * 0.14, cursor + k * interlude_beats / 2 * spb)
                place(buf, pluck(n2f(rt + "2"), interlude_beats / 2 * spb + 0.1, BASS, 2.0) * 0.30,
                      cursor + k * interlude_beats / 2 * spb)
                # arpeggio
                arp = chord_freqs(rt + "4", q)
                for i in range(8):
                    place(buf, pluck(arp[i % len(arp)] * (2 if i % 4 == 3 else 1),
                                     spb * 0.45, PIANO, 4.5) * 0.28,
                          cursor + k * interlude_beats / 2 * spb + i * spb / 2)
            cursor += interlude_beats * spb
    # Outro: gentle C major roll
    place(buf, pluck(n2f("C2"), outro_beats * spb, BASS, 1.0) * 0.30, cursor)
    for f in chord_freqs("C3", "maj"):
        place(buf, pad(f, outro_beats * spb + 0.6, STRING, attack=0.4, release=1.0) * 0.18, cursor)
    for i, n in enumerate(["C5", "E5", "G5", "C6"]):
        place(buf, pluck(n2f(n), 1.4, BELL, 1.6) * 0.22, cursor + i * spb * 0.5)

    out = space(buf, 0.17)
    return fade_in_out(out, fade_in=0.4, fade_out=2.5)


# ── 2. Birthday Bounce ───────────────────────────────────────────────────────
def t_birthday_bounce():
    """Upbeat bouncy pop in 4/4 with a singable hook melody, claps and tom fills."""
    bpm = 116; spb = 60 / bpm
    # intro(4) + A(16) + B(16) + A2(16) + outro(8) = 60 bars at 116 bpm → ~124s
    sections = [
        ("intro", 4), ("A", 16), ("B", 16), ("A2", 16), ("outro", 8)
    ]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))

    prog = [("C", "maj"), ("G", "maj"), ("A", "min"), ("F", "maj")]
    # Hook melody (8 bars over the 4-bar prog, played twice)
    hook = [
        ("E5", 1), ("G5", .5), ("E5", .5), ("D5", 1), ("C5", 1),
        ("D5", 1), ("E5", 1), ("G5", 2),
        ("F5", 1), ("E5", .5), ("D5", .5), ("C5", 2),
        ("E5", .5), ("D5", .5), ("C5", 1), ("G4", 2),
    ]
    # Variation for second half
    hook_b = [
        ("G5", 1), ("A5", .5), ("G5", .5), ("E5", 1), ("D5", 1),
        ("E5", 1), ("G5", 1), ("E5", 2),
        ("A5", 1), ("G5", .5), ("E5", .5), ("D5", 2),
        ("F5", .5), ("E5", .5), ("D5", 1), ("C5", 2),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # pad
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.2, release=0.3) * 0.10, t0)
            # bass pumping
            for sub in range(4):
                bnote = root + ("2" if sub == 0 else "2")
                place(buf, pluck(n2f(bnote), spb * 0.95, BASS, 4.0) * 0.34, t0 + sub * spb)
            if name == "intro":
                # building: just bass + pad + handclaps from bar 2
                if bar >= 2:
                    place(buf, clap() * 0.30, t0 + 1 * spb)
                    place(buf, clap() * 0.30, t0 + 3 * spb)
            else:
                # full drums
                place(buf, kick() * 0.58, t0 + 0 * spb)
                place(buf, kick() * 0.45, t0 + 2 * spb)
                place(buf, snare(vol=1.0) * 0.42, t0 + 1 * spb)
                place(buf, snare(vol=1.0) * 0.42, t0 + 3 * spb)
                # hi-hat 8ths
                for s in range(8):
                    place(buf, hat() * 0.18, t0 + s * spb / 2)
                # claps on 2,4 in chorus
                if name in ("A", "A2"):
                    place(buf, clap() * 0.28, t0 + 1 * spb)
                    place(buf, clap() * 0.28, t0 + 3 * spb)
            # tom fill on last bar of each section
            if bar == bars - 1 and name != "outro":
                for i, p in enumerate([180, 160, 140, 110]):
                    place(buf, tom(p, 0.18) * 0.55, t0 + (3 + i * 0.25) * spb)
        # melody
        if name == "A":
            play_melody(buf, hook, cursor, spb, pluck, vol=0.40, harm=PLUCK, decay=5.5)
            play_melody(buf, hook_b, cursor + 8 * 4 * spb, spb, pluck, vol=0.40, harm=PLUCK, decay=5.5)
        elif name == "B":
            # contrasting melody — higher, syncopated
            mel_b = [
                ("G5", .5), ("A5", .5), ("G5", .5), ("E5", .5), ("G5", 1), ("D5", 1),
                ("E5", .5), ("G5", .5), ("A5", 1), ("C6", 2),
                ("B5", .5), ("A5", .5), ("G5", 1), ("F5", 1), ("E5", 1),
                ("D5", .5), ("E5", .5), ("D5", 1), ("C5", 2),
            ]
            play_melody(buf, mel_b, cursor, spb, pluck, vol=0.38, harm=BELL, decay=5.0)
            play_melody(buf, mel_b, cursor + 8 * 4 * spb, spb, pluck, vol=0.38, harm=BELL, decay=5.0)
        elif name == "A2":
            # repeat hook with octave-up sparkle
            play_melody(buf, hook, cursor, spb, pluck, vol=0.42, harm=PLUCK, decay=5.5)
            play_melody(buf, hook_b, cursor + 8 * 4 * spb, spb, pluck, vol=0.42, harm=PLUCK, decay=5.5)
            play_melody(buf, hook, cursor, spb, pluck, vol=0.22, harm=BELL, decay=5.0, octave_shift=1)
        cursor += bars * 4 * spb

    out = space(buf, 0.14)
    return fade_in_out(out, 0.3, 3.0)


# ── 3. Celebration (fanfare) ─────────────────────────────────────────────────
def t_celebration():
    """Bright fanfare-style: brass-like trumpet melody with marching toms, big builds."""
    bpm = 116; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 16), ("A2", 16), ("coda", 12)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))

    prog = [("C", "maj"), ("G", "maj"), ("A", "min"), ("F", "maj")]
    fanfare = [
        ("G4", .5), ("G4", .5), ("G4", 1), ("C5", 1), ("E5", 1),
        ("G5", 1.5), ("E5", .5), ("C5", 2),
        ("F5", 1), ("E5", 1), ("D5", 1), ("C5", 1),
        ("D5", 1), ("E5", 1), ("D5", 2),
        ("C5", .5), ("D5", .5), ("E5", 1), ("F5", 1), ("G5", 1),
        ("A5", 2), ("G5", 2),
        ("F5", 1), ("E5", 1), ("D5", 1), ("C5", 1),
        ("G4", 1), ("C5", 1), ("E5", 2),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # bass octaves
            place(buf, pluck(n2f(root + "2"), spb * 0.9, BASS, 3.0) * 0.32, t0)
            place(buf, pluck(n2f(root + "2"), spb * 0.9, BASS, 3.0) * 0.30, t0 + 2 * spb)
            # string pad chord
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.3, release=0.4) * 0.12, t0)
            # brass stabs on beats 1 & 3 (in A sections)
            if name in ("A", "A2", "coda"):
                for f in chord_freqs(root + "4", q):
                    place(buf, brass(f, spb * 0.8) * 0.12, t0)
                    place(buf, brass(f, spb * 0.8) * 0.10, t0 + 2 * spb)
            # marching drums
            if name != "intro":
                place(buf, kick(punch=1.1) * 0.55, t0)
                place(buf, kick(punch=0.95) * 0.42, t0 + 2 * spb)
                place(buf, snare() * 0.45, t0 + 1 * spb)
                place(buf, snare() * 0.45, t0 + 3 * spb)
                # tambourine on 16ths
                for s in range(8):
                    place(buf, tambourine() * 0.18, t0 + s * spb / 2)
            else:
                # intro: just timpani-like toms + swelling pad
                place(buf, tom(80, 0.45) * 0.50, t0)
                place(buf, tom(80, 0.45) * 0.45, t0 + 2 * spb)
            # crash at section starts
            if bar == 0 and name in ("A", "B", "A2", "coda"):
                place(buf, cymbal_crash(1.2) * 0.25, t0)
            # tom fill at end of A/B
            if bar == bars - 1 and name in ("A", "B"):
                for i, p in enumerate([200, 170, 140, 110, 90]):
                    place(buf, tom(p, 0.16) * 0.55, t0 + (2.5 + i * 0.3) * spb)
        # brass melody
        if name in ("A", "A2", "coda"):
            mel_start = cursor
            play_melody(buf, fanfare, mel_start, spb, brass, vol=0.30)
            if name == "A2":
                # harmony a third above
                fan_up = [(transpose(n, 4) if n else n, b) for n, b, *_ in fanfare]
                play_melody(buf, fan_up, mel_start, spb, brass, vol=0.16)
        elif name == "B":
            # softer, lyrical bridge melody on strings
            bridge_mel = [
                ("A4", 2), ("C5", 2), ("E5", 2), ("D5", 2),
                ("F5", 2), ("E5", 2), ("C5", 4),
                ("D5", 2), ("E5", 2), ("F5", 2), ("E5", 2),
                ("D5", 2), ("C5", 2), ("B4", 4),
            ]
            play_melody(buf, bridge_mel, cursor, spb, pad, vol=0.18, harm=STRING,
                        attack=0.3, release=0.4)
        cursor += bars * 4 * spb

    out = space(buf, 0.18)
    return fade_in_out(out, 0.2, 3.0)


# ── 4. Warm Piano ────────────────────────────────────────────────────────────
def t_warm_piano():
    """Solo piano: lyrical right-hand melody, left-hand arpeggios, rubato feel."""
    bpm = 72; spb = 60 / bpm
    prog = [("C", "maj7"), ("A", "min7"), ("F", "maj7"), ("G", "dom7"),
            ("E", "min7"), ("A", "min7"), ("D", "min7"), ("G", "dom7")]
    cycles_total = 5  # play the 8-bar progression 5 times → ~133s
    bar_count = len(prog) * cycles_total
    total = bar_count * 4 * spb + 3.0
    buf = np.zeros(int(total * SR))

    # Two contrasting melodies over the 8-bar prog
    mel_a = [
        ("E5", 1), ("G5", .5), ("E5", .5), ("D5", 1.5), ("C5", .5),
        ("D5", 2), ("E5", 2),
        ("C5", 1), ("E5", 1), ("G5", 1.5), ("E5", .5),
        ("D5", 2), ("_", 2),
        ("F5", 1), ("E5", .5), ("D5", .5), ("C5", 1), ("D5", 1),
        ("E5", 2), ("D5", 2),
        ("C5", 1), ("B4", 1), ("D5", 1), ("F5", 1),
        ("E5", 4),
    ]
    mel_b = [
        ("G5", 1.5), ("E5", .5), ("D5", 1), ("E5", 1),
        ("C5", 2), ("D5", 2),
        ("G5", 1), ("A5", 1), ("G5", 1), ("E5", 1),
        ("D5", 4),
        ("A5", 1), ("G5", 1), ("E5", 1), ("D5", 1),
        ("C5", 2), ("E5", 2),
        ("D5", 1), ("C5", 1), ("B4", 1), ("A4", 1),
        ("G4", 4),
    ]

    cursor = 0.0
    bar = 0
    for cyc in range(cycles_total):
        for root, q in prog:
            t0 = cursor
            # left-hand arpeggio: root - fifth - third - fifth
            arp = [root + "3", root + "4", root + "3", root + "4"]
            # use chord tones
            cf = chord_freqs(root + "3", q)
            arp_freqs = [cf[0], cf[2 if len(cf) > 2 else 1], cf[1], cf[2 if len(cf) > 2 else 1]]
            for s in range(8):
                # 8th-note bass arpeggio
                f = arp_freqs[s % len(arp_freqs)]
                place(buf, pluck(f, spb * 0.55, PIANO, 4.0) * 0.30, t0 + s * spb / 2)
            # sustained pad backing for warmth
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.5, STRING, attack=0.6, release=0.7, trem=0.06) * 0.08, t0)
            # dynamic touch: bass octave on beat 1
            place(buf, pluck(n2f(root + "2"), spb * 1.5, BASS, 1.8) * 0.28, t0)
            cursor += 4 * spb
            bar += 1
        # melody over this cycle
        mel_start = cursor - len(prog) * 4 * spb
        which = mel_a if cyc % 2 == 0 else mel_b
        vols = [0.42, 0.44, 0.46, 0.44, 0.40]
        vol = vols[cyc % len(vols)]
        play_melody(buf, which, mel_start, spb, pluck, vol=vol, harm=PIANO, decay=2.6)
        if cyc >= 2:
            # add subtle harmony a sixth below
            harm = [(transpose(n, -9) if n and n != "_" else n, b) for n, b, *_ in which]
            play_melody(buf, harm, mel_start, spb, pluck, vol=0.18, harm=PIANO, decay=2.6)

    out = space(buf, 0.25)
    out = chorus(out, depth_ms=6, rate_hz=0.4, mix=0.18)
    return fade_in_out(out, 0.5, 4.0)


# ── 5. Acoustic Sunshine ─────────────────────────────────────────────────────
def t_acoustic_sunshine():
    """Folk-pop: nylon strumming pattern, harmonica-like melody, light cajón."""
    bpm = 104; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 12), ("A2", 16), ("outro", 6)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("G", "maj"), ("D", "maj"), ("E", "min"), ("C", "maj")]

    # Strum pattern (D-DU-UDU): 16th positions [1,_,_,_, 5,_,7,_, _,_,11,_, 13,_,15,_]
    strum_hits = [0, 4, 6, 10, 12, 14]
    # melody (singable folk)
    mel_a = [
        ("G4", 1), ("A4", .5), ("B4", .5), ("G4", 1), ("E4", 1),
        ("G4", 1), ("A4", 1), ("D5", 2),
        ("D5", 1), ("E5", .5), ("D5", .5), ("B4", 1), ("A4", 1),
        ("G4", 4),
        ("B4", 1), ("D5", 1), ("E5", 1), ("D5", 1),
        ("B4", 2), ("A4", 2),
        ("A4", 1), ("G4", 1), ("E4", 1), ("G4", 1),
        ("D4", 4),
    ]
    mel_b = [
        ("E5", 1), ("D5", 1), ("B4", 1), ("A4", 1),
        ("G4", 2), ("B4", 2),
        ("D5", 1), ("E5", 1), ("D5", 1), ("B4", 1),
        ("A4", 4),
        ("G4", .5), ("A4", .5), ("B4", 1), ("D5", 1), ("E5", 1),
        ("D5", 2), ("B4", 2),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # bass — root then fifth
            place(buf, pluck(n2f(root + "2"), spb * 1.6, BASS, 1.8) * 0.32, t0)
            place(buf, pluck(n2f(root + "3"), spb * 1.4, BASS, 2.2) * 0.22, t0 + 2 * spb)
            # strumming nylon
            cf = chord_freqs(root + "3", q)
            for s in strum_hits:
                ts = t0 + s * spb / 4
                gain = 0.16 if s in (0, 12) else 0.11
                for k, f in enumerate(cf):
                    # downstrokes hit low-to-high, upstrokes high-to-low
                    delay = k * 0.006 if s in (0, 4, 12) else (len(cf) - 1 - k) * 0.006
                    place(buf, pluck(f, spb * 0.6, NYLON, 5.5) * gain, ts + delay)
            if name != "intro":
                # cajón-ish percussion
                place(buf, kick(dur=0.18, punch=0.9) * 0.32, t0)
                place(buf, kick(dur=0.18, punch=0.9) * 0.32, t0 + 2 * spb)
                place(buf, snare(vol=0.7) * 0.28, t0 + 1 * spb)
                place(buf, snare(vol=0.7) * 0.28, t0 + 3 * spb)
                for s in range(8):
                    if s % 2 == 1:
                        place(buf, shaker() * 0.16, t0 + s * spb / 2)
        # melody
        if name == "A":
            play_melody(buf, mel_a, cursor, spb, pluck, vol=0.36, harm=PLUCK, decay=3.5, vib=0.02)
            play_melody(buf, mel_b, cursor + 8 * 4 * spb, spb, pluck, vol=0.34, harm=PLUCK, decay=3.5, vib=0.02)
        elif name == "B":
            # lyrical bridge melody (one octave up half-time)
            br = [(transpose(n, 5) if n and n != "_" else n, b) for n, b, *_ in mel_b]
            play_melody(buf, br, cursor, spb, pluck, vol=0.36, harm=PLUCK, decay=3.0, vib=0.025)
        elif name == "A2":
            play_melody(buf, mel_a, cursor, spb, pluck, vol=0.38, harm=PLUCK, decay=3.5, vib=0.02)
            play_melody(buf, mel_b, cursor + 8 * 4 * spb, spb, pluck, vol=0.38, harm=PLUCK, decay=3.5, vib=0.02)
            # add harmony 3rd above
            har = [(transpose(n, 4) if n and n != "_" else n, b) for n, b, *_ in mel_a]
            play_melody(buf, har, cursor, spb, pluck, vol=0.18, harm=PLUCK, decay=3.0)
        cursor += bars * 4 * spb

    out = space(buf, 0.13)
    return fade_in_out(out, 0.5, 2.5)


# ── 6. Dreamy ────────────────────────────────────────────────────────────────
def t_dreamy():
    """Slow evolving pad with sparse bell motifs and washy reverb."""
    bpm = 60; spb = 60 / bpm
    prog = [("C", "maj7"), ("E", "min7"), ("A", "min7"), ("F", "maj7"),
            ("D", "min7"), ("G", "dom7"), ("C", "maj7"), ("F", "maj7")]
    cycles = 4  # 8 × 4 = 32 bars at 60 bpm → 128s
    total = len(prog) * cycles * 4 * spb + 6.0
    buf = np.zeros(int(total * SR))

    motif = [("E5", 4), ("G5", 4), ("D6", 6), ("C6", 6),
             ("A5", 4), ("G5", 4), ("E5", 8)]

    cursor = 0.0
    for cyc in range(cycles):
        for root, q in prog:
            t0 = cursor
            # multi-octave slow pad
            for octv in ("2", "3", "4"):
                vol = {"2": 0.16, "3": 0.16, "4": 0.10}[octv]
                for f in chord_freqs(root + octv, q):
                    place(buf, pad(f, 4 * spb + 1.4, STRING, attack=1.4, release=1.6,
                                   trem=0.15, tremrate=0.28, vib=0.004) * vol, t0)
            # sparse bell twinkle (random scattered notes from chord)
            cf = chord_freqs(root + "5", q)
            if cyc >= 1:
                for k in range(2):
                    ts = t0 + (0.5 + k * 1.4 + 0.3 * cyc) * spb
                    f = cf[(cyc + k) % len(cf)]
                    place(buf, pluck(f, 2.5, BELL, 1.4) * 0.18, ts)
            cursor += 4 * spb
        # add a long bell motif over each cycle
        mel_start = cursor - len(prog) * 4 * spb
        if cyc >= 1:
            play_melody(buf, motif, mel_start + 2 * spb, spb, pluck, vol=0.18,
                        harm=BELL, decay=1.6)

    out = space(buf, 0.32)
    out = chorus(out, depth_ms=12, rate_hz=0.25, mix=0.4)
    return fade_in_out(out, 3.0, 5.0)


# ── 7. Party Pop ─────────────────────────────────────────────────────────────
def t_party_pop():
    """EDM-pop: 4-on-floor kick, sidechain pump, big synth lead, build-and-drop."""
    bpm = 124; spb = 60 / bpm
    sections = [("intro", 4), ("build1", 4), ("drop1", 16), ("break", 8),
                ("build2", 4), ("drop2", 20), ("outro", 8)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("A", "min"), ("F", "maj"), ("C", "maj"), ("G", "maj")]

    hook = [
        ("E5", 1), ("A5", 1), ("G5", .5), ("E5", .5), ("G5", 1),
        ("F5", 1), ("E5", 1), ("D5", 1), ("E5", 1),
        ("E5", 1), ("A5", 1), ("G5", .5), ("E5", .5), ("C5", 1),
        ("D5", 2), ("E5", 2),
    ]
    kicks_for_duck = []
    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # pad
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.15, release=0.25) * 0.13, t0)
            # sub bass on root
            place(buf, pluck(n2f(root + "1"), spb * 1.0, BASS, 3.0) * 0.30, t0)
            # arp pluck on chord tones (always on in drop)
            if name in ("drop1", "drop2"):
                cf = chord_freqs(root + "4", q)
                pat = [0, 2, 1, 2, 0, 2, 1, 2]
                for s in range(8):
                    f = cf[pat[s] % len(cf)]
                    place(buf, pluck(f, spb * 0.42, PLUCK, 6.0) * 0.22, t0 + s * spb / 2)
            # 4-on-the-floor kick in drops
            if name in ("drop1", "drop2"):
                for sub in range(4):
                    ts = t0 + sub * spb
                    place(buf, kick(punch=1.05) * 0.60, ts)
                    kicks_for_duck.append(ts)
                # clap on 2,4
                place(buf, clap() * 0.34, t0 + 1 * spb)
                place(buf, clap() * 0.34, t0 + 3 * spb)
                # offbeat open hat
                for sub in range(4):
                    place(buf, hat_open(0.18) * 0.22, t0 + sub * spb + spb / 2)
                # closed hat 16ths quiet
                for s in range(16):
                    place(buf, hat() * 0.10, t0 + s * spb / 4)
            elif name == "break":
                # only filtered chords + reversed-like swell at end
                place(buf, snare(vol=0.6) * 0.30, t0 + 2 * spb)
            elif name in ("build1", "build2"):
                # snare roll accelerando
                hits = 4 + bar * 4
                for k in range(hits):
                    place(buf, snare(dur=0.10, vol=0.6) * 0.28, t0 + k * 4 * spb / max(hits, 1))
                # rising white noise
                ns = int(4 * spb * SR)
                if ns > 0:
                    rise = np.random.uniform(-1, 1, ns) * np.linspace(0, 0.25, ns)
                    place(buf, rise, t0)
            elif name == "intro":
                place(buf, hat_open(0.3) * 0.18, t0 + 2 * spb)
            else:  # outro
                if bar == 0:
                    place(buf, cymbal_crash(2.0) * 0.30, t0)
        # lead
        if name == "drop1":
            play_melody(buf, hook, cursor, spb, saw_lead, vol=0.18)
            play_melody(buf, hook, cursor + 8 * 4 * spb, spb, saw_lead, vol=0.20)
        elif name == "drop2":
            play_melody(buf, hook, cursor, spb, saw_lead, vol=0.20)
            # higher octave lead second time
            hi = [(transpose(n, 12) if n and n != "_" else n, b) for n, b, *_ in hook]
            play_melody(buf, hi, cursor + 8 * 4 * spb, spb, saw_lead, vol=0.16)
            play_melody(buf, hook, cursor + 8 * 4 * spb, spb, saw_lead, vol=0.20)
        cursor += bars * 4 * spb

    # sidechain pump on every kick
    buf = sidechain_duck(buf, kicks_for_duck, depth=0.42, hold=0.03, release=0.20)
    out = space(buf, 0.12)
    return fade_in_out(out, 0.3, 2.5)


# ── 8. Soft Strings ──────────────────────────────────────────────────────────
def t_soft_strings():
    """Tender cinematic strings: cello lead, lush violin sections, crescendos."""
    bpm = 62; spb = 60 / bpm
    prog = [("C", "maj"), ("G", "maj"), ("A", "min"), ("E", "min"),
            ("F", "maj"), ("C", "maj"), ("D", "min7"), ("G", "dom7")]
    cycles = 4
    total = len(prog) * cycles * 4 * spb + 5.0
    buf = np.zeros(int(total * SR))

    # Lyrical cello melody (in mid range)
    cello = [
        ("C4", 2), ("E4", 2),
        ("D4", 2), ("G4", 2),
        ("A4", 2), ("G4", 2),
        ("E4", 4),
        ("F4", 2), ("E4", 2),
        ("D4", 2), ("E4", 2),
        ("F4", 2), ("A4", 2),
        ("G4", 4),
    ]
    # Violin counter-melody (higher)
    violin = [
        ("E5", 4),
        ("D5", 4),
        ("C5", 2), ("D5", 2),
        ("G5", 4),
        ("A5", 2), ("G5", 2),
        ("F5", 4),
        ("E5", 2), ("D5", 2),
        ("C5", 4),
    ]

    cursor = 0.0
    for cyc in range(cycles):
        for bi, (root, q) in enumerate(prog):
            t0 = cursor
            # cello bass long
            place(buf, pad(n2f(root + "2"), 4 * spb + 0.8, BASS, attack=0.8,
                           release=0.7, trem=0.05) * 0.20, t0)
            # mid string section
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.9, STRING, attack=1.0, release=0.8,
                               trem=0.12, tremrate=0.35) * 0.14, t0)
            # high violins (only in cyc >=1)
            if cyc >= 1:
                for f in chord_freqs(root + "4", q):
                    place(buf, pad(f, 4 * spb + 0.7, STRING, attack=1.2, release=0.9,
                                   trem=0.10, tremrate=0.4) * 0.08, t0)
            cursor += 4 * spb
        # melodies
        mstart = cursor - len(prog) * 4 * spb
        if cyc >= 1:
            play_melody(buf, cello, mstart, spb, pad, vol=0.14, harm=STRING,
                        attack=0.5, release=0.4)
        if cyc >= 2:
            play_melody(buf, violin, mstart, spb, pad, vol=0.10, harm=STRING,
                        attack=0.7, release=0.5)

    # crescendo dynamic: rise then gently fall
    n = len(buf)
    env = 0.55 + 0.45 * np.sin(np.linspace(0, np.pi, n)) ** 0.7
    buf = buf * env
    out = space(buf, 0.28)
    out = chorus(out, depth_ms=10, rate_hz=0.3, mix=0.30)
    return fade_in_out(out, 4.0, 4.5)


# ── 9. Lo-Fi Chill ───────────────────────────────────────────────────────────
def t_lofi_chill():
    """Boom-bap drums with swing, jazzy Rhodes chords, sub bass, vinyl crackle."""
    bpm = 75; spb = 60 / bpm
    prog = [("F", "maj7"), ("E", "min7"), ("A", "min7"), ("D", "min7")]
    cycles = 10  # 4×4 × 10 = 40 bars at 75bpm → 128s
    total = len(prog) * cycles * 4 * spb + 3.0
    buf = np.zeros(int(total * SR))

    # melody — wandering, dotted, jazz-tinged
    mel = [
        ("A4", 1), ("C5", .5), ("E5", .5), ("D5", 2),
        ("G4", 1.5), ("B4", .5), ("D5", 2),
        ("E5", .75), ("D5", .25), ("C5", 1), ("A4", 2),
        ("G4", 1), ("A4", .5), ("G4", .5), ("F4", 2),
    ]

    cursor = 0.0
    for cyc in range(cycles):
        for root, q in prog:
            t0 = cursor
            # Rhodes chord (root position, plus 7th & 9th tension)
            cf = chord_freqs(root + "3", q)
            for f in cf:
                place(buf, pluck(f, spb * 3.5, RHODES, 1.4, attack=0.012) * 0.16, t0)
            # extra 9th colour
            place(buf, pluck(n2f(root + "4") * 2 ** (2/12), spb * 3.0, RHODES, 1.5) * 0.10,
                  t0 + 1.5 * spb)
            # sub bass with bounce on beat 3
            place(buf, pluck(n2f(root + "1"), spb * 2.0, BASS, 1.2) * 0.36, t0)
            place(buf, pluck(n2f(root + "2"), spb * 1.5, BASS, 1.8) * 0.20, t0 + 2 * spb)
            # boom-bap drums (kick on 1, 3.5; snare on 2, 4) with swing on offbeats
            place(buf, kick(punch=1.0) * 0.50, t0)
            place(buf, kick(punch=0.85) * 0.40, t0 + 2.5 * spb)
            place(buf, snare(vol=0.85) * 0.36, t0 + 1 * spb)
            place(buf, snare(vol=0.85) * 0.36, t0 + 3 * spb)
            # hi-hat 8ths with swing
            sw = 0.18 * spb
            for s in range(8):
                ts = t0 + s * spb / 2
                if s % 2 == 1:
                    ts += sw
                place(buf, hat() * 0.15, ts)
            # occasional open hat
            if cyc % 2 == 0:
                place(buf, hat_open(0.18) * 0.18, t0 + 3.5 * spb)
            cursor += 4 * spb
        # melody — alternating verses, sparser at start
        if cyc >= 1 and cyc % 2 == 1:
            play_melody(buf, mel, cursor - len(prog) * 4 * spb, spb, pluck,
                        vol=0.32, harm=RHODES, decay=2.0, swing=0.18)

    # vinyl crackle layer
    crackle = vinyl_crackle(len(buf), intensity=0.030)
    buf = buf + crackle
    out = space(buf, 0.20)
    return fade_in_out(out, 0.6, 3.5)


# ── 10. Afrobeats ────────────────────────────────────────────────────────────
def t_afrobeats():
    """Polyrhythmic 12/8 feel with marimba lead, deep bass, clave + shaker."""
    bpm = 100; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 12), ("A2", 16), ("outro", 4)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.5
    buf = np.zeros(int(total * SR))
    prog = [("C", "maj"), ("F", "maj"), ("A", "min"), ("G", "maj")]

    # afro-style melody — triplet feel
    mel = [
        ("E5", .67), ("G5", .67), ("E5", .67), ("D5", .67), ("C5", .67), ("E5", .67),
        ("G5", 1), ("E5", 1),
        ("A5", .67), ("G5", .67), ("E5", .67), ("D5", 2),
        ("G5", .67), ("E5", .67), ("D5", .67), ("C5", .67), ("D5", .67), ("E5", .67),
        ("C5", 2), ("_", 1),
        ("E5", .67), ("D5", .67), ("C5", .67), ("A4", 1),
        ("G4", 2),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # deep bass — syncopated pattern
            place(buf, pluck(n2f(root + "1"), spb * 0.9, BASS, 2.4) * 0.40, t0)
            place(buf, pluck(n2f(root + "2"), spb * 0.6, BASS, 3.0) * 0.30, t0 + 1.5 * spb)
            place(buf, pluck(n2f(root + "1"), spb * 0.8, BASS, 2.6) * 0.36, t0 + 2.5 * spb)
            # pad subtle
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.4, release=0.4) * 0.07, t0)
            if name != "intro":
                # afro kit: kick on 1, syncopated 2.5; clap on 2 & 4
                place(buf, kick(punch=1.05) * 0.55, t0)
                place(buf, kick(punch=0.85) * 0.42, t0 + 2.5 * spb)
                place(buf, clap() * 0.32, t0 + 1 * spb)
                place(buf, clap() * 0.32, t0 + 3 * spb)
                # shaker on every 8th
                for s in range(8):
                    place(buf, shaker(vol=0.7) * 0.18, t0 + s * spb / 2)
                # clave 3-2 pattern on every other bar
                if bar % 2 == 0:
                    for ts in [0, 0.75, 1.5, 2.5, 3]:
                        place(buf, rim_click() * 0.30, t0 + ts * spb)
                # bell pattern (high cowbell-like)
                if name in ("A", "A2") and bar % 4 in (1, 3):
                    for s in [0, 1.5, 3, 3.5]:
                        place(buf, pluck(n2f("G5"), spb * 0.3, BELL, 5.0) * 0.14, t0 + s * spb)
        # marimba melody
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.30, harm=MARIMBA, decay=4.5)
        elif name == "B":
            br = [(transpose(n, 5) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, br, cursor, spb, pluck, vol=0.32, harm=MARIMBA, decay=4.0)
            play_melody(buf, mel, cursor + 6 * spb, spb, pluck, vol=0.28, harm=MARIMBA, decay=4.0)
        cursor += bars * 4 * spb

    out = space(buf, 0.14)
    return fade_in_out(out, 0.3, 3.0)


# ── 11. Disco Fever ──────────────────────────────────────────────────────────
def t_disco_fever():
    """70s disco: 4-on-floor + off-beat open hats, walking funk bass, string stabs."""
    bpm = 118; spb = 60 / bpm
    sections = [("intro", 4), ("A", 20), ("B", 12), ("A2", 20), ("outro", 6)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("A", "min"), ("D", "min"), ("G", "maj"), ("C", "maj")]

    # Funk lead — short syncopated phrases
    mel = [
        ("A4", .5), ("C5", .5), ("E5", .5), ("A5", .5), ("G5", 1), ("E5", 1),
        ("D5", .5), ("F5", .5), ("E5", 1), ("D5", 1), ("C5", 1),
        ("G5", .5), ("E5", .5), ("D5", .5), ("C5", .5), ("A4", 1), ("E5", 1),
        ("D5", 1), ("C5", 1), ("B4", 1), ("A4", 1),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # walking bass — root, fifth, octave, fifth (8th notes)
            walk_notes = [root + "2", root + "2", root + "3", root + "2",
                          root + "2", root + "3", root + "2", root + "2"]
            for s, bn in enumerate(walk_notes):
                place(buf, pluck(n2f(bn), spb * 0.45, BASS, 4.5) * 0.35, t0 + s * spb / 2)
            # string stabs on 1 and 3
            for f in chord_freqs(root + "4", q):
                place(buf, pluck(f, spb * 0.8, STRING, 4.0, attack=0.02) * 0.13, t0)
                place(buf, pluck(f, spb * 0.6, STRING, 5.0, attack=0.02) * 0.10, t0 + 2 * spb)
            # guitar chips on offbeats (16ths between 2 and 4)
            if name != "intro":
                for s in [1.5, 2.5, 3.5]:
                    for f in chord_freqs(root + "5", q)[:2]:
                        place(buf, pluck(f, spb * 0.18, PLUCK, 12.0) * 0.10, t0 + s * spb)
            # disco drums: 4-on-floor kick, open hat on offbeats, snare on 2 & 4
            if name != "intro":
                for sub in range(4):
                    place(buf, kick(punch=1.0) * 0.55, t0 + sub * spb)
                place(buf, snare(vol=0.9) * 0.40, t0 + 1 * spb)
                place(buf, snare(vol=0.9) * 0.40, t0 + 3 * spb)
                for sub in range(4):
                    place(buf, hat_open(0.18) * 0.22, t0 + sub * spb + spb / 2)
                # tambourine
                for s in range(8):
                    place(buf, tambourine() * 0.14, t0 + s * spb / 2)
            else:
                place(buf, hat_open(0.3) * 0.18, t0 + 2 * spb)
            # tom fills end of A
            if bar == bars - 1 and name in ("A", "B"):
                for i, p in enumerate([200, 160, 130, 100]):
                    place(buf, tom(p, 0.14) * 0.55, t0 + (3 + i * 0.25) * spb)
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.30, harm=PLUCK, decay=6.0)
        elif name == "B":
            # bridge — call/response between high and low
            hi = [(transpose(n, 7) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, hi, cursor, spb, pluck, vol=0.26, harm=BELL, decay=5.0)
            play_melody(buf, mel, cursor + 8 * 4 * spb / 2, spb, pluck, vol=0.30, harm=PLUCK, decay=6.0)
        cursor += bars * 4 * spb

    out = space(buf, 0.13)
    return fade_in_out(out, 0.3, 2.5)


# ── 12. Summer Vibes ─────────────────────────────────────────────────────────
def t_summer_vibes():
    """Tropical-house feel: bright marimba lead, plucky bass, light percussion."""
    bpm = 100; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 12), ("A2", 16), ("outro", 4)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("D", "maj"), ("A", "maj"), ("B", "min"), ("G", "maj")]

    mel = [
        ("F#5", .5), ("A5", .5), ("F#5", 1), ("D5", 1), ("E5", 1),
        ("F#5", 1), ("D5", 1), ("E5", 2),
        ("A5", .5), ("F#5", .5), ("E5", 1), ("D5", 1), ("B4", 1),
        ("D5", 1), ("E5", 1), ("F#5", 2),
        ("E5", .5), ("F#5", .5), ("G5", 1), ("F#5", 1), ("E5", 1),
        ("D5", 2), ("F#5", 2),
        ("E5", 1), ("D5", 1), ("B4", 1), ("A4", 1),
        ("D5", 4),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # pluck bass — root + octave skip
            place(buf, pluck(n2f(root + "2"), spb * 0.7, BASS, 4.0) * 0.30, t0)
            place(buf, pluck(n2f(root + "3"), spb * 0.5, BASS, 5.0) * 0.18, t0 + 1.5 * spb)
            place(buf, pluck(n2f(root + "2"), spb * 0.7, BASS, 4.0) * 0.28, t0 + 2 * spb)
            # chord pad
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, 4 * spb + 0.3, STRING, attack=0.25, release=0.3) * 0.10, t0)
            # marimba arpeggio
            cf = chord_freqs(root + "5", q)
            if name != "intro":
                arp = [0, 1, 2, 1, 0, 2, 1, 2]
                for s in range(8):
                    f = cf[arp[s] % len(cf)]
                    place(buf, pluck(f, spb * 0.40, MARIMBA, 7.0) * 0.20, t0 + s * spb / 2)
            # drums
            if name != "intro":
                for sub in range(4):
                    place(buf, kick() * 0.42, t0 + sub * spb)
                place(buf, clap() * 0.28, t0 + 1 * spb)
                place(buf, clap() * 0.28, t0 + 3 * spb)
                for s in range(16):
                    place(buf, shaker(vol=0.6) * 0.14, t0 + s * spb / 4)
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.32, harm=PLUCK, decay=4.0, vib=0.015)
        elif name == "B":
            hi = [(transpose(n, 5) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, hi, cursor, spb, pluck, vol=0.30, harm=PLUCK, decay=3.5)
            play_melody(buf, mel, cursor + 6 * spb, spb, pluck, vol=0.20, harm=BELL, decay=3.0)
        cursor += bars * 4 * spb

    out = space(buf, 0.14)
    return fade_in_out(out, 0.3, 2.5)


# ── 13. Jazz Club ────────────────────────────────────────────────────────────
def t_jazz_club():
    """Smooth swing: walking bass, brushed hat, sax-like lead, Rhodes comping."""
    bpm = 92; spb = 60 / bpm
    prog = [("F", "maj7"), ("D", "min7"), ("G", "min7"), ("C", "dom7"),
            ("A", "min7"), ("D", "min7"), ("G", "dom7"), ("C", "maj7")]
    cycles = 6
    total = len(prog) * cycles * 4 * spb + 3.0
    buf = np.zeros(int(total * SR))

    # Walking bass note pools by chord (root, approach, scale tones)
    walk_pools = {
        ("F", "maj7"): ["F2", "A2", "C3", "E3"],
        ("D", "min7"): ["D2", "F2", "A2", "C3"],
        ("G", "min7"): ["G2", "Bb2", "D3", "F3"],
        ("C", "dom7"): ["C2", "E2", "G2", "Bb2"],
        ("A", "min7"): ["A2", "C3", "E3", "G3"],
        ("G", "dom7"): ["G2", "B2", "D3", "F3"],
        ("C", "maj7"): ["C2", "E2", "G2", "B2"],
    }

    # Sax melody — swung, with rests & syncopation
    sax_mel = [
        ("F5", 1), ("A5", .5), ("G5", .5), ("F5", 1), ("E5", 1),
        ("D5", 2), ("C5", 2),
        ("E5", .5), ("F5", .5), ("G5", 1), ("F5", 1), ("E5", 1),
        ("D5", 2), ("_", 2),
        ("G5", 1), ("Bb5", .5), ("A5", .5), ("G5", 1), ("F5", 1),
        ("E5", 2), ("D5", 2),
        ("C5", .5), ("D5", .5), ("E5", 1), ("F5", 1), ("G5", 1),
        ("A5", 2), ("_", 2),
    ]

    cursor = 0.0
    for cyc in range(cycles):
        for bi, (root, q) in enumerate(prog):
            t0 = cursor
            pool = walk_pools.get((root, q), [root + "2", root + "3"])
            # walking bass — quarter notes
            for s in range(4):
                bn = pool[s % len(pool)]
                place(buf, pluck(n2f(bn), spb * 0.95, BASS, 2.6) * 0.34, t0 + s * spb)
            # Rhodes chord comping — short stabs on beats 2 & 4 (swung)
            cf = chord_freqs(root + "4", q)
            for f in cf:
                place(buf, pluck(f, spb * 0.50, RHODES, 3.0) * 0.18, t0 + 1.18 * spb)
                place(buf, pluck(f, spb * 0.50, RHODES, 3.0) * 0.18, t0 + 3.18 * spb)
            # brushed swing hi-hat (12/8 feel — long/short)
            for s in range(4):
                # quarter + swung eighth
                place(buf, hat(decay=42) * 0.20, t0 + s * spb)
                place(buf, hat(decay=42) * 0.13, t0 + s * spb + spb * 0.66)
            # ride-like rim on 2 & 4
            place(buf, rim_click() * 0.22, t0 + 1 * spb)
            place(buf, rim_click() * 0.22, t0 + 3 * spb)
            cursor += 4 * spb
        # sax melody every other cycle, increasing presence
        if cyc >= 1:
            mstart = cursor - len(prog) * 4 * spb
            vol = 0.22 + 0.04 * cyc
            play_melody(buf, sax_mel, mstart, spb, sax_voice, vol=vol, swing=0.20)

    out = space(buf, 0.20)
    out = chorus(out, depth_ms=7, rate_hz=0.4, mix=0.20)
    return fade_in_out(out, 0.5, 3.5)


# ── 14. Epic Moment ──────────────────────────────────────────────────────────
def t_epic_moment():
    """Cinematic: timpani-like kicks, choir + string swells, brass climax."""
    bpm = 70; spb = 60 / bpm
    sections = [("intro", 4), ("build", 8), ("climax", 16), ("resolve", 8)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 4.0
    buf = np.zeros(int(total * SR))
    prog = [("C", "maj"), ("A", "min"), ("F", "maj"), ("G", "maj")]

    horn_theme = [
        ("C4", 2), ("E4", 2), ("G4", 4),
        ("A4", 2), ("G4", 2), ("E4", 4),
        ("F4", 2), ("A4", 2), ("C5", 4),
        ("D5", 2), ("C5", 2), ("G4", 4),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # bass octaves
            place(buf, pad(n2f(root + "2"), 4 * spb + 0.8, BASS, attack=0.4, release=0.6) * 0.22, t0)
            place(buf, pad(n2f(root + "1"), 4 * spb + 0.8, BASS, attack=0.5, release=0.7) * 0.16, t0)
            # multi-octave string pads
            for octv in ("3", "4"):
                vol = 0.14 if octv == "3" else 0.10
                for f in chord_freqs(root + octv, q):
                    place(buf, pad(f, 4 * spb + 0.8, STRING, attack=0.6, release=0.7,
                                   trem=0.05) * vol, t0)
            # choir on chord (climax & resolve only)
            if name in ("climax", "resolve"):
                for f in chord_freqs(root + "4", q):
                    place(buf, pad(f, 4 * spb + 0.6, CHOIR, attack=0.8, release=0.7, vib=0.005) * 0.10, t0)
            # timpani on beat 1 (and 3 in climax)
            if name in ("build", "climax", "resolve"):
                place(buf, tom(70, 0.55, vol=1.1) * 0.55, t0)
                if name == "climax":
                    place(buf, tom(75, 0.50, vol=1.0) * 0.50, t0 + 2 * spb)
            # snare roll build during 'build'
            if name == "build":
                density = bar + 1  # accelerating
                hits = 2 * density
                for k in range(hits):
                    place(buf, snare(dur=0.08, vol=0.5) * 0.22, t0 + k * 4 * spb / max(hits, 1))
            # crash at climax start & resolve start
            if bar == 0 and name in ("climax", "resolve"):
                place(buf, cymbal_crash(2.5) * 0.40, t0)
        # brass theme
        if name == "climax":
            play_melody(buf, horn_theme, cursor, spb, brass, vol=0.28)
            # harmony 4th below
            hl = [(transpose(n, -5) if n else n, b) for n, b, *_ in horn_theme]
            play_melody(buf, hl, cursor, spb, brass, vol=0.16)
            play_melody(buf, horn_theme, cursor + 8 * 4 * spb, spb, brass, vol=0.28)
        elif name == "resolve":
            play_melody(buf, horn_theme, cursor, spb, brass, vol=0.22)
        cursor += bars * 4 * spb

    # overall dynamic arc (quiet intro/build → loud climax → soft resolve)
    n = len(buf)
    arc = np.ones(n)
    # set per-section gain
    cursor = 0.0
    arcs = {"intro": 0.55, "build": 0.75, "climax": 1.0, "resolve": 0.70}
    for name, bars in sections:
        seg_n = int(bars * 4 * spb * SR)
        s = int(cursor * SR); e = min(n, s + seg_n)
        arc[s:e] *= arcs[name]
        # smooth crossfades
        cross = int(0.5 * SR)
        if s > 0 and cross > 0:
            arc[s:s+cross] = np.linspace(arc[s-1], arc[s], min(cross, e - s))
        cursor += bars * 4 * spb
    buf = buf * arc
    out = space(buf, 0.30)
    out = chorus(out, depth_ms=8, rate_hz=0.3, mix=0.25)
    return fade_in_out(out, 2.0, 4.0)


# ── 15. Retro Arcade ─────────────────────────────────────────────────────────
def t_retro_arcade():
    """Chiptune: square-wave lead, triangle bass, noise drums, fast arpeggios."""
    bpm = 138; spb = 60 / bpm
    sections = [("intro", 4), ("A", 24), ("B", 16), ("A2", 24), ("outro", 8)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 1.5
    buf = np.zeros(int(total * SR))
    prog = [("C", "maj"), ("G", "maj"), ("A", "min"), ("F", "maj")]

    # Catchy 8-bit melody — fast and bouncy
    mel = [
        ("C5", .5), ("E5", .5), ("G5", .5), ("E5", .5), ("C5", .5), ("E5", .5), ("G5", 1),
        ("D5", .5), ("F5", .5), ("A5", .5), ("F5", .5), ("D5", .5), ("F5", .5), ("A5", 1),
        ("E5", .5), ("G5", .5), ("C6", .5), ("G5", .5), ("E5", .5), ("G5", .5), ("C6", 1),
        ("D5", .5), ("G5", .5), ("F5", .5), ("E5", .5), ("D5", .5), ("C5", .5), ("G4", 1),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # triangle bass — root, fifth, root, fifth (8th notes)
            for s in range(8):
                f = n2f(root + "2") if s % 2 == 0 else n2f(root + "2") * 1.498  # P5 up
                place(buf, triangle_wave(f, spb * 0.42, vol=0.32), t0 + s * spb / 2)
            # square arpeggio (16ths) — chord tones
            cf = chord_freqs(root + "4", q)
            if name != "intro":
                pat = [0, 1, 2, 1, 0, 2, 1, 2]
                for s in range(8):
                    f = cf[pat[s] % len(cf)]
                    place(buf, square_wave(f, spb * 0.22, duty=0.5, vol=0.16), t0 + s * spb / 2)
            # noise drums
            if name != "intro":
                place(buf, kick(dur=0.16, punch=1.0) * 0.45, t0)
                place(buf, kick(dur=0.16, punch=0.85) * 0.40, t0 + 2 * spb)
                # short noise snare on 2 & 4
                place(buf, snare(dur=0.10, vol=0.6) * 0.32, t0 + 1 * spb)
                place(buf, snare(dur=0.10, vol=0.6) * 0.32, t0 + 3 * spb)
        if name in ("A", "A2"):
            # square lead
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, square_wave, vol=0.20, duty=0.25)
        elif name == "B":
            # higher octave melody, faster
            hi = [(transpose(n, 12) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, hi, cursor, spb, square_wave, vol=0.18, duty=0.5)
            play_melody(buf, mel, cursor + 6 * spb, spb, square_wave, vol=0.16, duty=0.125)
        cursor += bars * 4 * spb

    out = space(buf, 0.08)
    return fade_in_out(out, 0.2, 2.0)


# ── 16. Reggae Chill ─────────────────────────────────────────────────────────
def t_reggae_chill():
    """One-drop drum pattern, off-beat skank chords, deep bass, bright melody."""
    bpm = 84; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 12), ("A2", 16), ("outro", 4)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.5
    buf = np.zeros(int(total * SR))
    prog = [("C", "maj"), ("F", "maj"), ("G", "maj"), ("F", "maj")]

    mel = [
        ("E5", 1), ("G5", 1), ("E5", 1), ("D5", 1),
        ("C5", 2), ("D5", 2),
        ("G4", 1), ("C5", 1), ("E5", 1), ("D5", 1),
        ("C5", 4),
        ("F5", 1), ("E5", 1), ("D5", 1), ("E5", 1),
        ("F5", 2), ("E5", 2),
        ("D5", 1), ("C5", 1), ("G4", 1), ("A4", 1),
        ("G4", 4),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # deep walking bass — dotted patterns
            place(buf, pluck(n2f(root + "1"), spb * 1.7, BASS, 1.5) * 0.40, t0)
            place(buf, pluck(n2f(root + "2"), spb * 1.5, BASS, 1.8) * 0.32, t0 + 2.5 * spb)
            # off-beat skank chords (organ + guitar on the "ands")
            for off in [0.5, 1.5, 2.5, 3.5]:
                ts = t0 + off * spb
                # guitar/organ short chord
                for f in chord_freqs(root + "4", q):
                    place(buf, pluck(f, spb * 0.30, PLUCK, 9.0, attack=0.005) * 0.13, ts)
                # organ stab
                for f in chord_freqs(root + "3", q):
                    place(buf, organ_voice(f, spb * 0.18) * 0.07, ts)
            # one-drop: kick + snare on beat 3 only
            if name != "intro":
                place(buf, kick(punch=1.1) * 0.55, t0 + 2 * spb)
                place(buf, snare(vol=0.95) * 0.42, t0 + 2 * spb)
                # hi-hat on every 8th, accent on 2 & 4
                for s in range(8):
                    vol = 0.20 if s in (2, 6) else 0.13
                    place(buf, hat() * vol, t0 + s * spb / 2)
                # rim click on 4 in second half
                if bar % 2 == 1:
                    place(buf, rim_click() * 0.24, t0 + 3 * spb)
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.32, harm=PLUCK, decay=3.5, vib=0.025)
        elif name == "B":
            br = [(transpose(n, 4) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, br, cursor, spb, pluck, vol=0.30, harm=PLUCK, decay=3.0)
        cursor += bars * 4 * spb

    out = space(buf, 0.20)
    return fade_in_out(out, 0.4, 3.0)


# ── 17. Funky Groove ─────────────────────────────────────────────────────────
def t_funky_groove():
    """Funk: slap-style octave bass, tight syncopated drums, guitar chips, brass."""
    bpm = 108; spb = 60 / bpm
    sections = [("intro", 4), ("A", 20), ("B", 12), ("A2", 20), ("outro", 6)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("A", "min7"), ("D", "min7"), ("G", "dom7"), ("C", "maj7")]

    # Funky lead — syncopated, with rests
    mel = [
        ("A4", .5), ("_", .5), ("C5", .5), ("E5", .5), ("D5", .5), ("_", .5), ("E5", 1),
        ("D5", .5), ("F5", .5), ("E5", .5), ("D5", .5), ("C5", .5), ("A4", 1.5),
        ("G4", .5), ("A4", .5), ("C5", .5), ("D5", .5), ("E5", .5), ("G5", .5), ("E5", 1),
        ("D5", .5), ("C5", .5), ("B4", .5), ("A4", .5), ("A4", 2),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # slap-style bass: low → octave-up pop, syncopated 16ths
            slap_pattern = [(0, root + "1", 0.45, "low"),
                            (0.5, root + "2", 0.30, "pop"),
                            (1, root + "1", 0.42, "low"),
                            (1.75, root + "2", 0.28, "pop"),
                            (2.25, root + "1", 0.40, "low"),
                            (2.75, root + "2", 0.32, "pop"),
                            (3.5, root + "1", 0.38, "low")]
            for off, bn, vol, kind in slap_pattern:
                decay = 6.0 if kind == "pop" else 3.0
                place(buf, pluck(n2f(bn), spb * 0.45, BASS, decay) * vol, t0 + off * spb)
            # guitar chip chords on the "and" of 2, 4 etc.
            for off in [0.75, 1.5, 2.75, 3.5]:
                ts = t0 + off * spb
                for f in chord_freqs(root + "4", q)[:3]:
                    place(buf, pluck(f, spb * 0.20, PLUCK, 14.0, attack=0.003) * 0.13, ts)
            # brass stabs on beat 1 of every other bar
            if bar % 2 == 0 and name in ("A", "A2"):
                for f in chord_freqs(root + "4", q):
                    place(buf, brass(f, spb * 0.4) * 0.10, t0)
            # tight funk drums
            if name != "intro":
                place(buf, kick(punch=1.05) * 0.52, t0)
                place(buf, kick(punch=0.85) * 0.42, t0 + 1.75 * spb)
                place(buf, kick(punch=0.85) * 0.38, t0 + 2.5 * spb)
                place(buf, snare(vol=0.95) * 0.40, t0 + 1 * spb)
                place(buf, snare(vol=0.95) * 0.40, t0 + 3 * spb)
                # ghost notes
                place(buf, snare(dur=0.08, vol=0.3) * 0.18, t0 + 1.75 * spb)
                # 16th hats
                for s in range(16):
                    vol = 0.18 if s % 4 == 0 else 0.11
                    place(buf, hat() * vol, t0 + s * spb / 4)
                # open hat
                place(buf, hat_open(0.16) * 0.20, t0 + 3.5 * spb)
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.28, harm=PLUCK, decay=5.0)
        elif name == "B":
            # brass takes the lead
            br_mel = [(transpose(n, 0) if n and n != "_" else n, b) for n, b, *_ in mel]
            play_melody(buf, br_mel, cursor, spb, brass, vol=0.18)
        cursor += bars * 4 * spb

    out = space(buf, 0.12)
    return fade_in_out(out, 0.3, 2.5)


# ── 18. Midnight R&B ─────────────────────────────────────────────────────────
def t_midnight_rnb():
    """Slow R&B: Rhodes electric piano, sub bass, swung drums, smooth melody."""
    bpm = 70; spb = 60 / bpm
    prog = [("C", "maj7"), ("E", "min7"), ("A", "min9"), ("F", "maj7"),
            ("D", "min7"), ("G", "dom7"), ("C", "maj7"), ("A", "min7")]
    cycles = 5
    total = len(prog) * cycles * 4 * spb + 3.0
    buf = np.zeros(int(total * SR))

    mel = [
        ("E5", 1), ("G5", .5), ("F5", .5), ("E5", 2),
        ("D5", 1.5), ("E5", .5), ("D5", 2),
        ("A5", 1), ("G5", 1), ("E5", 2),
        ("F5", 1), ("E5", 1), ("D5", 2),
        ("G5", 1), ("A5", .5), ("G5", .5), ("E5", 2),
        ("F5", 1.5), ("D5", .5), ("D5", 2),
        ("E5", 1), ("D5", 1), ("C5", 2),
        ("E5", 1), ("D5", 1), ("C5", 2),
    ]

    cursor = 0.0
    for cyc in range(cycles):
        for bi, (root, q) in enumerate(prog):
            t0 = cursor
            # Rhodes chord
            cf = chord_freqs(root + "3", q)
            for f in cf:
                place(buf, pluck(f, spb * 3.6, RHODES, 1.2, attack=0.015) * 0.16, t0)
            # extra colour: add 9th
            place(buf, pluck(n2f(root + "4") * 2 ** (2/12), spb * 3.0, RHODES, 1.5) * 0.10,
                  t0 + 1.5 * spb)
            # sub bass
            place(buf, pluck(n2f(root + "1"), spb * 2.5, BASS, 1.0) * 0.38, t0)
            place(buf, pluck(n2f(root + "2"), spb * 1.5, BASS, 1.5) * 0.20, t0 + 2 * spb)
            # swung drum pattern
            place(buf, kick(punch=0.95) * 0.45, t0)
            place(buf, kick(punch=0.80) * 0.35, t0 + 2.5 * spb)
            place(buf, snare(vol=0.8) * 0.32, t0 + 1 * spb)
            place(buf, snare(vol=0.8) * 0.32, t0 + 3 * spb)
            # hat triplet feel
            for s in range(8):
                ts = t0 + s * spb / 2
                if s % 2 == 1:
                    ts += 0.16 * spb
                place(buf, hat() * 0.14, ts)
            # ghost claps in last cycle
            if cyc == 2:
                place(buf, clap() * 0.18, t0 + 3.5 * spb)
            cursor += 4 * spb
        if cyc >= 1:
            mstart = cursor - len(prog) * 4 * spb
            play_melody(buf, mel, mstart, spb, pluck, vol=0.32, harm=RHODES, decay=2.0, swing=0.18)
            if cyc >= 2:
                # add airy melody up an octave at half volume
                hi = [(transpose(n, 12) if n and n != "_" else n, b) for n, b, *_ in mel]
                play_melody(buf, hi, mstart, spb, pluck, vol=0.16, harm=BELL, decay=1.8)

    out = space(buf, 0.20)
    out = chorus(out, depth_ms=6, rate_hz=0.5, mix=0.20)
    return fade_in_out(out, 0.5, 4.0)


# ── 19. Bossa Nova ───────────────────────────────────────────────────────────
def t_bossa_nova():
    """Brazilian: nylon guitar pattern, rim clicks, soft sax-flute lead, walking bass."""
    bpm = 124; spb = 60 / bpm  # ~62 bpm half-time feel
    prog = [("F", "maj7"), ("G", "min7"), ("C", "dom7"), ("F", "maj7"),
            ("A", "min7"), ("D", "min7"), ("G", "min7"), ("C", "dom7")]
    cycles = 8
    total = len(prog) * cycles * 4 * spb + 3.0
    buf = np.zeros(int(total * SR))

    # gentle flute-like melody
    mel = [
        ("F5", 1), ("E5", .5), ("D5", .5), ("C5", 1), ("D5", 1),
        ("F5", 2), ("A5", 2),
        ("G5", 1), ("F5", .5), ("E5", .5), ("D5", 1), ("E5", 1),
        ("D5", 2), ("_", 2),
        ("A5", .5), ("G5", .5), ("F5", 1), ("E5", 1), ("D5", 1),
        ("C5", 2), ("E5", 2),
        ("F5", 1), ("E5", 1), ("D5", 1), ("C5", 1),
        ("F5", 4),
    ]

    cursor = 0.0
    for cyc in range(cycles):
        for bi, (root, q) in enumerate(prog):
            t0 = cursor
            # Walking nylon bass — root, fifth, root, fifth (dotted feel)
            place(buf, pluck(n2f(root + "2"), spb * 1.6, BASS, 2.2) * 0.34, t0)
            place(buf, pluck(n2f(root + "3"), spb * 1.4, BASS, 2.4) * 0.26, t0 + 2 * spb)
            # Nylon guitar bossa pattern — 16th-note syncopated chord stabs
            cf = chord_freqs(root + "3", q)
            bossa_offsets = [0, 0.75, 1.5, 1.75, 2.5, 3, 3.75]
            for off in bossa_offsets:
                ts = t0 + off * spb
                for k, f in enumerate(cf):
                    place(buf, pluck(f, spb * 0.30, NYLON, 6.5) * 0.10, ts + k * 0.004)
            # bossa rim pattern (the classic 3-2 clave-like figure)
            rim_offsets = [0, 1.5, 2.5]
            for off in rim_offsets:
                place(buf, rim_click() * 0.32, t0 + off * spb)
            # soft brushy hat
            for s in range(8):
                place(buf, hat(decay=46) * 0.10, t0 + s * spb / 2)
            cursor += 4 * spb
        if cyc >= 1:
            mstart = cursor - len(prog) * 4 * spb
            play_melody(buf, mel, mstart, spb, flute_voice, vol=0.22)
            if cyc >= 2:
                # sax overlay (sparser)
                sparser = [(n if i % 2 == 0 else "_", b) for i, (n, b, *_) in enumerate(mel)]
                play_melody(buf, sparser, mstart + 2 * spb, spb, sax_voice, vol=0.14)

    out = space(buf, 0.18)
    out = chorus(out, depth_ms=5, rate_hz=0.4, mix=0.15)
    return fade_in_out(out, 0.5, 3.5)


# ── 20. Gospel Joy ───────────────────────────────────────────────────────────
def t_gospel_joy():
    """Uplifting gospel: Hammond organ, gospel piano, choir pad, claps, drums building."""
    bpm = 100; spb = 60 / bpm
    sections = [("intro", 4), ("A", 16), ("B", 12), ("A2", 16), ("outro", 6)]
    total_bars = sum(b for _, b in sections)
    total = total_bars * 4 * spb + 2.0
    buf = np.zeros(int(total * SR))
    prog = [("C", "maj"), ("F", "maj"), ("G", "maj"), ("C", "maj")]

    mel = [
        ("G4", 1), ("C5", 1), ("E5", 1), ("G5", 1),
        ("E5", 2), ("G5", 2),
        ("A5", 1), ("G5", 1), ("E5", 1), ("C5", 1),
        ("D5", 4),
        ("E5", 1), ("F5", 1), ("G5", 1), ("E5", 1),
        ("D5", 2), ("C5", 2),
        ("B4", 1), ("D5", 1), ("G4", 1), ("A4", 1),
        ("C5", 4),
    ]

    cursor = 0.0
    for name, bars in sections:
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            root, q = chord
            t0 = cursor + bar * 4 * spb
            # bass
            place(buf, pluck(n2f(root + "2"), spb * 1.0, BASS, 2.5) * 0.36, t0)
            place(buf, pluck(n2f(root + "2"), spb * 0.8, BASS, 3.0) * 0.30, t0 + 2 * spb)
            # Hammond organ sustained chord
            for f in chord_freqs(root + "3", q):
                place(buf, organ_voice(f, 4 * spb + 0.4) * 0.10, t0)
            # gospel piano comping — chord on every quarter, dotted accents
            cf = chord_freqs(root + "4", q)
            for s in range(8):
                if s % 2 == 0:
                    for f in cf:
                        place(buf, pluck(f, spb * 0.35, PIANO, 3.5) * 0.13, t0 + s * spb / 2)
            # choir pad
            if name in ("A", "B", "A2", "outro"):
                for f in chord_freqs(root + "4", q):
                    place(buf, pad(f, 4 * spb + 0.4, CHOIR, attack=0.5, release=0.5, vib=0.005) * 0.08, t0)
            # claps & tambourine — building
            density = {"intro": 0, "A": 1, "B": 1, "A2": 2, "outro": 2}[name]
            if density >= 1:
                place(buf, clap() * 0.30, t0 + 1 * spb)
                place(buf, clap() * 0.30, t0 + 3 * spb)
                for s in range(8):
                    place(buf, tambourine() * 0.16, t0 + s * spb / 2)
            # drums
            if name != "intro":
                place(buf, kick() * 0.52, t0)
                place(buf, kick(punch=0.85) * 0.40, t0 + 2 * spb)
                place(buf, snare(vol=0.85) * 0.38, t0 + 1 * spb)
                place(buf, snare(vol=0.85) * 0.38, t0 + 3 * spb)
            # fills
            if bar == bars - 1 and name in ("A", "B"):
                for i, p in enumerate([180, 150, 120, 95]):
                    place(buf, tom(p, 0.16) * 0.55, t0 + (3 + i * 0.25) * spb)
        if name in ("A", "A2"):
            for rep in range(2):
                play_melody(buf, mel, cursor + rep * 8 * spb, spb, pluck,
                            vol=0.32, harm=BELL, decay=4.5)
            if name == "A2":
                # gospel run harmony 3rd above
                har = [(transpose(n, 4) if n and n != "_" else n, b) for n, b, *_ in mel]
                play_melody(buf, har, cursor, spb, pluck, vol=0.18, harm=PIANO, decay=4.0)
        elif name == "B":
            # softer call/response — high choir-like sustains
            br = [(n, b * 2) if n and n != "_" else (n, b * 2) for n, b, *_ in mel[:8]]
            play_melody(buf, br, cursor, spb, pad, vol=0.16, harm=CHOIR,
                        attack=0.3, release=0.4)
        cursor += bars * 4 * spb

    out = space(buf, 0.16)
    return fade_in_out(out, 0.4, 3.0)


# ════════════════════════════════════════════════════════════════════════════
TRACKS = {
    "happy-birthday":    t_happy_birthday,
    "birthday-bounce":   t_birthday_bounce,
    "celebration":       t_celebration,
    "warm-piano":        t_warm_piano,
    "acoustic-sunshine": t_acoustic_sunshine,
    "dreamy":            t_dreamy,
    "party-pop":         t_party_pop,
    "soft-strings":      t_soft_strings,
    "lo-fi-chill":       t_lofi_chill,
    "afrobeats":         t_afrobeats,
    "disco-fever":       t_disco_fever,
    "summer-vibes":      t_summer_vibes,
    "jazz-club":         t_jazz_club,
    "epic-moment":       t_epic_moment,
    "retro-arcade":      t_retro_arcade,
    "reggae-chill":      t_reggae_chill,
    "funky-groove":      t_funky_groove,
    "midnight-rnb":      t_midnight_rnb,
    "bossa-nova":        t_bossa_nova,
    "gospel-joy":        t_gospel_joy,
}


def main():
    np.random.seed(7)
    os.makedirs(OUT, exist_ok=True)
    print(f"Generating {len(TRACKS)} tracks into {OUT}")
    for name, fn in TRACKS.items():
        x = finalize(fn(), fade_out=0.0)  # tracks already fade themselves
        write_wav(name, x)
    print("Done.")


if __name__ == "__main__":
    main()
