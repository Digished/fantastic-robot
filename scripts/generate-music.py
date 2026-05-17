#!/usr/bin/env python3
"""Generate the free background-music library into public/music/.

Synthesises short, seamlessly-looping royalty-free instrumental tracks — one
WAV per track id in lib/music.ts. No external assets or encoders required.

Usage (from repo root):  python3 scripts/generate-music.py

Requires: numpy  (pip install numpy)
"""
import os
import wave
import numpy as np

SR = 22050  # plenty for ducked background music; keeps files small
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "music"))

NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def n2f(name: str) -> float:
    """Note name like 'A4', 'C#5', 'Eb3' -> frequency in Hz."""
    p = name[0]
    i = 1
    semis = NOTE_BASE[p]
    if i < len(name) and name[i] in "#b":
        semis += 1 if name[i] == "#" else -1
        i += 1
    octv = int(name[i:])
    midi = 12 * (octv + 1) + semis
    return 440.0 * 2 ** ((midi - 69) / 12)


# ── Instruments ───────────────────────────────────────────────────────────────

PIANO = [1.0, 0.45, 0.22, 0.10, 0.05, 0.025]
BELL = [1.0, 0.20, 0.55, 0.12, 0.28, 0.07]
PLUCK = [1.0, 0.62, 0.36, 0.18, 0.09]
STRING = [1.0, 0.55, 0.40, 0.24, 0.15, 0.09]
BASS = [1.0, 0.50, 0.20, 0.07]


def _tail(env, secs=0.022):
    r = min(int(secs * SR), len(env))
    if r > 0:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def pluck(f, dur, harm, decay, attack=0.004, vib=0.0):
    n = int(dur * SR)
    if n <= 0:
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
    return sig * _tail(env)


def pad(f, dur, harm, attack=0.35, release=0.45, trem=0.12, tremrate=0.5):
    n = int(dur * SR)
    if n <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for k, amp in enumerate(harm, 1):
        det = 1 + 0.0026 * ((k % 2) * 2 - 1)
        sig += amp * np.sin(2 * np.pi * f * k * det * t)
    env = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    if a > 0:
        env[:a] *= np.linspace(0, 1, min(a, n))
    if r > 0:
        env[-r:] *= np.linspace(1, 0, min(r, n))
    env *= (1 - trem) + trem * 0.5 * (1 + np.sin(2 * np.pi * tremrate * t))
    return sig * env


def kick(dur=0.24):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 108 * np.exp(-t * 32) + 46
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5)


def hat(dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = np.random.uniform(-1, 1, n)
    nz = np.diff(nz, prepend=0.0)
    return nz * np.exp(-t * 55)


# ── Helpers ───────────────────────────────────────────────────────────────────

def place(buf, sig, start):
    s = int(start * SR)
    if s >= len(buf) or len(sig) == 0:
        return
    e = min(len(buf), s + len(sig))
    buf[s:e] += sig[: e - s]


CHORDS = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
}


def chord_freqs(root, quality="maj"):
    base = n2f(root)
    return [base * 2 ** (s / 12) for s in CHORDS[quality]]


def space(x, amount=0.15):
    out = x.copy()
    for dly, g in [(41, 0.6), (67, 0.46), (89, 0.34), (113, 0.25)]:
        d = int(dly / 1000 * SR)
        ech = np.zeros(len(x))
        ech[d:] = x[: len(x) - d]
        out += amount * g * ech
    return out


def finalize(x, loop_xf=0.12):
    """Crossfade the tail into the head for a seamless loop, then master."""
    xf = int(loop_xf * SR)
    x = x.copy()
    if 0 < xf and len(x) > 2 * xf:
        head, tail = x[:xf].copy(), x[-xf:].copy()
        f = np.linspace(0, 1, xf)
        x[:xf] = head * f + tail * (1 - f)
        x = x[:-xf]
    peak = np.max(np.abs(x)) + 1e-9
    x = x / peak * 0.92
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    return x * 0.95


def write_wav(name, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(f"  {name}.wav  {len(x)/SR:5.1f}s  {len(data)//1024:5d} KB")


# ── Tracks ────────────────────────────────────────────────────────────────────

def t_happy_birthday():
    spb = 60 / 100
    seq = [
        ("G4", .75, "C", "maj"), ("G4", .25, "C", "maj"), ("A4", 1, "C", "maj"),
        ("G4", 1, "C", "maj"), ("C5", 1, "C", "maj"), ("B4", 2, "G", "maj"),
        ("G4", .75, "G", "maj"), ("G4", .25, "G", "maj"), ("A4", 1, "G", "maj"),
        ("G4", 1, "G", "maj"), ("D5", 1, "G", "maj"), ("C5", 2, "C", "maj"),
        ("G4", .75, "C", "maj"), ("G4", .25, "C", "maj"), ("G5", 1, "C", "maj"),
        ("E5", 1, "C", "maj"), ("C5", 1, "F", "maj"), ("B4", 1, "G", "maj"),
        ("A4", 2, "C", "maj"),
        ("F5", .75, "F", "maj"), ("F5", .25, "F", "maj"), ("E5", 1, "C", "maj"),
        ("C5", 1, "C", "maj"), ("D5", 1, "G", "maj"), ("C5", 2, "C", "maj"),
    ]
    total = sum(d for _, d, _, _ in seq) * spb + 0.7
    buf = np.zeros(int(total * SR))
    # backing: pad + bass per merged chord
    segs, t = [], 0.0
    for note, d, root, q in seq:
        dur = d * spb
        if segs and segs[-1][2] == root:
            segs[-1][1] += dur
        else:
            segs.append([t, dur, root, q])
        t += dur
    for st, dur, root, q in segs:
        for f in chord_freqs(root + "3", q):
            place(buf, pad(f, dur + 0.25, STRING, attack=0.12, release=0.3) * 0.13, st)
        place(buf, pluck(n2f(root + "2"), dur + 0.1, BASS, 2.6, attack=0.01) * 0.34, st)
    # melody
    t = 0.0
    for note, d, root, q in seq:
        dur = d * spb
        place(buf, pluck(n2f(note), dur * 0.98 + 0.18, PIANO, 3.6) * 0.56, t)
        t += dur
    return space(buf, 0.17)


def comp(bpm, prog, cycles, *, melody_inst, mel_decay, mel_vol, mel_harm,
         pad_vol=0.12, bass_vol=0.3, drums=None, sparkle=False, arp_div=2):
    """Generic chord-progression loop. prog = [(root, quality, beats), ...]."""
    spb = 60 / bpm
    cycle_beats = sum(b for _, _, b in prog)
    total = cycle_beats * cycles * spb
    buf = np.zeros(int(total * SR) + SR // 2)
    t = 0.0
    for _ in range(cycles):
        for root, q, beats in prog:
            dur = beats * spb
            cf = chord_freqs(root + "4", q)
            # pad
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, dur + 0.3, STRING, attack=0.2, release=0.35) * pad_vol, t)
            # bass
            place(buf, pluck(n2f(root + "2"), dur + 0.1, BASS, 2.4, attack=0.01) * bass_vol, t)
            # arpeggio melody
            steps = int(beats * arp_div)
            pat = [0, 1, 2, 1, 2, 1, 0, 1]
            for s in range(steps):
                f = cf[pat[s % len(pat)] % len(cf)]
                if sparkle and s % 2 == 1:
                    f *= 2
                place(buf, melody_inst(f, spb / arp_div * 1.6, mel_harm, mel_decay) * mel_vol,
                      t + s * spb / arp_div)
            t += dur
    if drums:
        beat = 0
        nbeats = int(cycle_beats * cycles)
        while beat < nbeats:
            bt = beat * spb
            if "kick" in drums:
                place(buf, kick() * drums["kick"], bt)
            if "hat" in drums:
                place(buf, hat() * drums["hat"], bt + spb / 2)
            beat += 1
    return space(buf[: int(total * SR)], 0.13)


def t_birthday_bounce():
    return comp(132, [("C", "maj", 2), ("F", "maj", 2), ("A", "min", 2), ("G", "maj", 2)],
                cycles=4, melody_inst=pluck, mel_decay=7.0, mel_vol=0.34, mel_harm=BELL,
                pad_vol=0.10, bass_vol=0.32, drums={"kick": 0.5, "hat": 0.22}, arp_div=2)


def t_celebration():
    return comp(120, [("C", "maj", 2), ("G", "maj", 2), ("A", "min", 2), ("F", "maj", 2)],
                cycles=4, melody_inst=pluck, mel_decay=5.5, mel_vol=0.32, mel_harm=BELL,
                pad_vol=0.13, bass_vol=0.30, drums={"kick": 0.42, "hat": 0.18},
                sparkle=True, arp_div=2)


def t_warm_piano():
    return comp(66, [("C", "maj7", 4), ("A", "min7", 4), ("F", "maj7", 4), ("G", "maj", 4)],
                cycles=2, melody_inst=pluck, mel_decay=3.4, mel_vol=0.44, mel_harm=PIANO,
                pad_vol=0.11, bass_vol=0.26, arp_div=2)


def t_acoustic_sunshine():
    return comp(104, [("G", "maj", 4), ("D", "maj", 4), ("E", "min", 4), ("C", "maj", 4)],
                cycles=2, melody_inst=pluck, mel_decay=5.0, mel_vol=0.40, mel_harm=PLUCK,
                pad_vol=0.08, bass_vol=0.30, arp_div=2)


def t_party_pop():
    return comp(124, [("A", "min", 2), ("F", "maj", 2), ("C", "maj", 2), ("G", "maj", 2)],
                cycles=4, melody_inst=pluck, mel_decay=6.5, mel_vol=0.30, mel_harm=PLUCK,
                pad_vol=0.11, bass_vol=0.34, drums={"kick": 0.55, "hat": 0.26},
                sparkle=True, arp_div=2)


def t_dreamy():
    spb = 1.0
    prog = [("C", "maj7"), ("A", "min7"), ("F", "maj7"), ("G", "maj")]
    seg = 4.0
    total = len(prog) * seg
    buf = np.zeros(int(total * SR))
    t = 0.0
    for root, q in prog:
        for f in chord_freqs(root + "3", q):
            place(buf, pad(f, seg + 0.6, STRING, attack=1.2, release=1.0,
                           trem=0.18, tremrate=0.32) * 0.16, t)
        place(buf, pad(n2f(root + "2"), seg + 0.4, BASS, attack=0.8, release=0.6) * 0.16, t)
        # sparse high twinkle
        place(buf, pluck(n2f(root + "6"), 1.8, BELL, 2.2) * 0.12, t + 1.0)
        t += seg
    return space(buf, 0.22)


def t_soft_strings():
    spb = 60 / 70
    prog = [("C", "maj", 4), ("G", "maj", 4), ("A", "min", 4), ("F", "maj", 4)]
    total = sum(b for _, _, b in prog) * spb * 2
    buf = np.zeros(int(total * SR))
    t = 0.0
    for _ in range(2):
        for root, q, beats in prog:
            dur = beats * spb
            for f in chord_freqs(root + "3", q):
                place(buf, pad(f, dur + 0.7, STRING, attack=0.9, release=0.8,
                               trem=0.14, tremrate=0.4) * 0.16, t)
            for f in chord_freqs(root + "4", q):
                place(buf, pad(f, dur + 0.5, STRING, attack=1.0, release=0.7) * 0.09, t)
            place(buf, pad(n2f(root + "2"), dur + 0.4, BASS, attack=0.6, release=0.5) * 0.18, t)
            t += dur
    return space(buf, 0.24)


TRACKS = {
    "happy-birthday": t_happy_birthday,
    "birthday-bounce": t_birthday_bounce,
    "celebration": t_celebration,
    "warm-piano": t_warm_piano,
    "acoustic-sunshine": t_acoustic_sunshine,
    "dreamy": t_dreamy,
    "party-pop": t_party_pop,
    "soft-strings": t_soft_strings,
}


def main():
    np.random.seed(7)
    os.makedirs(OUT, exist_ok=True)
    print(f"Generating {len(TRACKS)} tracks into {OUT}")
    for name, fn in TRACKS.items():
        write_wav(name, finalize(fn()))
    print("Done.")


if __name__ == "__main__":
    main()
