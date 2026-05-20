"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createCelebration } from "./actions";
import { ThemePicker } from "@/components/theme-picker";
import { MusicPicker } from "@/components/music-picker";
import { findTrack, type MusicTrack } from "@/lib/music";
import { uploadWithProgress } from "@/lib/upload";
import type { Theme } from "@/lib/themes";
import { X, ImagePlus, Loader2, Video, Search, Check } from "lucide-react";

type Bank = { name: string; code: string };

const EVENT_OPTIONS = [
  ["birthday", "Birthday"], ["graduation", "Graduation"], ["wedding", "Wedding"],
  ["appreciation", "Appreciation"], ["farewell", "Farewell"], ["baby_shower", "Baby shower"],
  ["surprise_gift", "Surprise gift"], ["other", "Other"],
] as const;

function minDate() {
  const d = new Date(Date.now() + 96 * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STEPS = ["Vibe", "Details", "About them", "Recipient", "Review"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

type GalleryItem = { path: string; caption: string; preview: string; kind: "image" | "video" };

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXTS = ["mp4", "mov", "webm"];

function galleryExt(file: File): { ext: string; kind: "image" | "video" } | null {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (file.type.startsWith("image/") && IMAGE_EXTS.includes(ext)) return { ext, kind: "image" };
  if (file.type.startsWith("image/")) return { ext: "jpg", kind: "image" };
  if (file.type.startsWith("video/") && VIDEO_EXTS.includes(ext)) return { ext, kind: "video" };
  if (file.type.startsWith("video/")) return { ext: "mp4", kind: "video" };
  return null;
}

export function CreateForm({ banks, tracks }: { banks: Bank[]; tracks: MusicTrack[] }) {
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 0: Vibe
  const [theme, setTheme] = useState<Theme>("ivory");
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [eventType, setEventType] = useState("birthday");
  const [celebrationDate, setCelebrationDate] = useState("");
  const [messageFromCreator, setMessageFromCreator] = useState("");

  // Step 2: About them
  const [tagline, setTagline] = useState("");
  const [celebrantDescription, setCelebrantDescription] = useState("");

  // Gallery (step 2)
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Step 3: Recipient
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResolved(null); setResolveError(null);
    if (accountNumber.length !== 10 || !bankCode) return;
    startResolve(async () => {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const json = await res.json();
      if (res.ok) setResolved(json.account_name);
      else setResolveError(json.error ?? "Could not verify");
    });
  }, [accountNumber, bankCode]);

  async function onCover(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { alert("Cover must be under 8 MB."); return; }
    setUploading(true);
    setCoverProgress(0);
    setCoverPreview(URL.createObjectURL(file));
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const res = await fetch("/api/media/sign-cover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext: IMAGE_EXTS.includes(ext) ? ext : "jpg" }),
    });
    const sign = await res.json();
    if (!res.ok) { setUploading(false); alert(sign.error ?? "Upload failed"); return; }
    try {
      await uploadWithProgress({
        url: sign.signedUrl,
        file,
        contentType: file.type,
        onProgress: setCoverProgress,
      });
    } catch (e) {
      setUploading(false);
      setCoverProgress(0);
      setCoverPreview(null);
      alert(e instanceof Error ? e.message : "Upload failed");
      return;
    }
    setCoverPath(sign.path);
    setCoverProgress(100);
    setUploading(false);
  }

  async function onGalleryFiles(files: FileList) {
    const remaining = 20 - galleryImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) { alert("Maximum 20 gallery items reached."); return; }
    setUploadingGallery(true);
    for (const file of toUpload) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name} is too large (max 50 MB).`); continue; }
      const meta = galleryExt(file);
      if (!meta) { alert(`${file.name} is not a supported image or video.`); continue; }
      const res = await fetch("/api/media/sign-gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: meta.ext }),
      });
      const sign = await res.json();
      if (!res.ok) { alert(sign.error ?? "Upload failed"); continue; }
      const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) { alert("Upload failed"); continue; }
      const preview = URL.createObjectURL(file);
      setGalleryImages((prev) => [...prev, { path: sign.path, caption: "", preview, kind: meta.kind }]);
    }
    setUploadingGallery(false);
  }

  function removeGalleryImage(idx: number) {
    setGalleryImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setGalleryImages((prev) => prev.map((img, i) => i === idx ? { ...img, caption } : img));
  }

  function step1Errors(): string[] {
    const errs: string[] = [];
    if (title.trim().length < 2) errs.push("Page title is required (at least 2 characters).");
    if (recipientName.trim().length < 1) errs.push("Recipient name is required.");
    if (!celebrationDate) errs.push("Please pick a celebration date.");
    else if (new Date(celebrationDate).getTime() <= Date.now()) errs.push("Celebration date must be in the future.");
    return errs;
  }

  function canAdvance(): boolean {
    if (step === 0) return !!coverPath;
    if (step === 1) return step1Errors().length === 0;
    if (step === 2) return celebrantDescription.trim().length >= 20;
    if (step === 3) return !!(resolved && bankCode && accountNumber.length === 10);
    return true;
  }

  function next() { if (canAdvance() && step < 4) setStep((s) => (s + 1) as Step); }
  function back() { if (step > 0) setStep((s) => (s - 1) as Step); }


  async function submit() {
    setSubmitting(true); setSubmitError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("recipientName", recipientName);
    fd.set("eventType", eventType);
    fd.set("theme", theme);
    if (backgroundMusic) fd.set("backgroundMusic", backgroundMusic);
    fd.set("celebrationDate", celebrationDate);
    if (messageFromCreator) fd.set("messageFromCreator", messageFromCreator);
    if (tagline) fd.set("tagline", tagline);
    fd.set("celebrantDescription", celebrantDescription);
    if (coverPath) fd.set("coverPhotoPath", coverPath);
    fd.set("recipientBankCode", bankCode);
    fd.set("recipientAccountNumber", accountNumber);
    fd.set("galleryImages", JSON.stringify(galleryImages.map(({ path, caption, kind }) => ({ path, caption, kind }))));

    const result = await createCelebration({}, fd);
    if (result?.authorizationUrl) {
      window.location.href = result.authorizationUrl;
      return;
    }
    if (result?.error) {
      setSubmitError(result.error);
      setSubmitting(false);
    }
  }

  const firstName = recipientName.split(" ")[0] || "them";

  return (
    <div data-theme={theme} className="mt-8">
      {/* Progress — mobile: simple bar; desktop: labelled steps */}
      <div className="sm:hidden mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-ink/50">Step {step + 1} of {STEPS.length}</p>
          <p className="text-xs font-medium text-ink">{STEPS[step]}</p>
        </div>
        <div className="h-1.5 rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 mb-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-[var(--accent)]" : "bg-ink/10"}`} />
            <p className={`mt-1.5 text-[11px] uppercase tracking-widest truncate ${i === step ? "text-ink" : "text-ink/40"}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 fade-up" key={step}>
        {/* ── Step 0: Vibe ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="serif text-3xl text-ink">Pick a vibe</h2>
              <p className="text-ink/55 text-sm mt-1">You can change this any time.</p>
            </div>
            <div className="relative h-32 rounded-3xl2 overflow-hidden shadow-ring theme-mesh">
              <p className="absolute bottom-3 left-4 text-[11px] uppercase tracking-widest text-ink/60">Live preview</p>
            </div>
            <ThemePicker value={theme} onChange={setTheme} />

            <div className="pt-2">
              <MusicPicker value={backgroundMusic} onChange={setBackgroundMusic} tracks={tracks} />
            </div>

            <div className="space-y-2 pt-2">
              <label className="label">
                Cover photo<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
              {coverPreview ? (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="relative w-full aspect-[4/3] rounded-3xl2 overflow-hidden shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="" className={`size-full object-cover transition ${uploading ? "scale-[1.02] blur-[1px]" : ""}`} />
                  {uploading && (
                    <>
                      <div className="absolute inset-0 bg-ink/30" />
                      <div
                        className="absolute inset-x-0 bottom-0 bg-white/95 transition-[height] duration-200 ease-out"
                        style={{ height: `${coverProgress}%` }}
                      />
                      <div className="absolute inset-0 grid place-items-center text-white">
                        <div className="text-center">
                          <p className="serif text-3xl text-white drop-shadow">{coverProgress}%</p>
                          <p className="text-xs uppercase tracking-widest mt-1 text-white/80">Uploading</p>
                        </div>
                      </div>
                    </>
                  )}
                  {!uploading && (
                    <span className="absolute bottom-3 right-3 glass-dark text-white rounded-full px-3 py-1 text-xs">Change</span>
                  )}
                </button>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-3xl2 border-2 border-dashed border-ink/15 grid place-items-center text-ink/55 hover:bg-ink/5 transition">
                  + Add a photo of the celebrant
                </button>
              )}
              {!coverPath && (
                <p className="text-xs text-ink/45">A cover photo is required to continue.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">The details</h2>
              <p className="text-ink/55 text-sm mt-1">Tell everyone what this is for.</p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Page title</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Tunde turns 30 🎉" maxLength={80} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Who is it for?</label>
              <input className="field" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Tunde Bakare" maxLength={60} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Type of celebration</label>
              <select className="field" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="label">Celebration date</label>
              <input type="datetime-local" className="field" min={minDate()}
                value={celebrationDate} onChange={(e) => setCelebrationDate(e.target.value)} />
              <p className="text-xs text-ink/50">Contributions close 72 hours before this date.</p>
            </div>

            <div className="space-y-1.5">
              <label className="label">A note from you (optional)</label>
              <textarea className="field min-h-[88px] resize-none"
                value={messageFromCreator} onChange={(e) => setMessageFromCreator(e.target.value)}
                placeholder="Let's spoil her this year ❤️" maxLength={280} />
            </div>

            {step1Errors().length > 0 && (title || recipientName || celebrationDate) && (
              <ul className="text-xs text-red-600 space-y-0.5">
                {step1Errors().map((e) => <li key={e}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* ── Step 2: About them + Gallery ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">About {firstName}</h2>
              <p className="text-ink/55 text-sm mt-1">
                This is used to craft everything on {firstName}&apos;s page — the opening, the messages, and the experience. Be as expressive as you like. The more you share about who they are, the richer and more personal their surprise will be.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">
                Tell us about {firstName}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                className="field min-h-[160px] resize-none"
                value={celebrantDescription}
                onChange={(e) => { setCelebrantDescription(e.target.value); }}
                placeholder={`Their personality, what they love, what makes them who they are — the more you share, the richer the experience.`}
                maxLength={1500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/45">{celebrantDescription.length}/1500</span>
                {celebrantDescription.trim().length < 20 && (
                  <span className="text-xs text-ink/40">at least 20 characters to continue</span>
                )}
              </div>
            </div>


            <div className="space-y-1.5 pt-3 border-t border-ink/10">
              <label className="label">Custom tagline (optional)</label>
              <input
                className="field"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder={`e.g. "We got you, queen ✨"`}
                maxLength={140}
              />
              <p className="text-xs text-ink/45">Shown on {firstName}&apos;s cover page. Leave blank to hide.</p>
            </div>

            {/* Gallery */}
            <div className="pt-3 border-t border-ink/10 space-y-3">
              <div>
                <label className="label">Photo &amp; video gallery (optional)</label>
                <p className="text-xs text-ink/45 mt-0.5">
                  Full-screen slides during {firstName}&apos;s opening. Up to 20 items.
                </p>
              </div>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden shadow-ring bg-ink/5">
                      {img.kind === "video" ? (
                        <div className="w-full aspect-[4/3] bg-ink/80 grid place-items-center">
                          <Video className="size-8 text-white/60" />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.preview} alt="" className="w-full aspect-[4/3] object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-2 right-2 size-6 rounded-full glass-dark text-white grid place-items-center"
                        aria-label="Remove"
                      >
                        <X className="size-3" />
                      </button>
                      <input
                        type="text"
                        placeholder="Add a caption…"
                        maxLength={100}
                        value={img.caption}
                        onChange={(e) => updateCaption(idx, e.target.value)}
                        className="w-full px-3 py-2 text-sm text-ink/80 bg-white/80 border-0 focus:outline-none focus:ring-0 placeholder:text-ink/35"
                      />
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={galleryFileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && e.target.files.length > 0 && onGalleryFiles(e.target.files)}
              />
              {galleryImages.length < 20 && (
                <button
                  type="button"
                  onClick={() => galleryFileRef.current?.click()}
                  disabled={uploadingGallery}
                  className="btn-outline inline-flex text-sm disabled:opacity-50"
                >
                  {uploadingGallery
                    ? <><Loader2 className="size-4 animate-spin" /> Uploading…</>
                    : <><ImagePlus className="size-4" /> Add photos / videos</>
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Recipient ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">Where the gift goes</h2>
              <p className="text-ink/55 text-sm mt-1">
                For monetary gifts friends may send to {firstName}. Locked once the page is live.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Recipient&apos;s bank</label>
              <BankCombobox banks={banks} value={bankCode} onChange={setBankCode} />
            </div>

            <div className="space-y-1.5">
              <label className="label">Account number</label>
              <input className="field" inputMode="numeric" pattern="\d{10}" maxLength={10}
                value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} />
            </div>

            <div className="min-h-[44px]" aria-live="polite">
              {resolving && <p className="text-sm text-ink/60">Verifying account…</p>}
              {resolved && (
                <p className="text-sm rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] px-4 py-2 font-medium">
                  ✓ {resolved}
                </p>
              )}
              {resolveError && (
                <p className="text-sm rounded-2xl bg-red-50 text-red-700 px-4 py-2">{resolveError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="serif text-3xl text-ink">Looks good?</h2>
              <p className="text-ink/55 text-sm mt-1">A quick look before we publish.</p>
            </div>

            <div className="relative aspect-[4/5] rounded-3xl2 overflow-hidden shadow-card">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 theme-mesh" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/70" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/80">{eventType.replace("_", " ")}</p>
                <h3 className="serif text-3xl mt-2">{title || "Your celebration"}</h3>
                <p className="text-white/85 text-sm mt-1">For {recipientName || "—"}</p>
                {tagline && <p className="text-white/70 text-xs mt-1 italic">{tagline}</p>}
              </div>
            </div>

            <ul className="card text-sm divide-y divide-ink/5">
              <li className="py-2 flex justify-between"><span className="text-ink/55">Date</span><span className="text-ink">{celebrationDate ? new Date(celebrationDate).toLocaleString("en-NG") : "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Recipient</span><span className="text-ink">{resolved ?? "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Account</span><span className="text-ink">****{accountNumber.slice(-4)}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Theme</span><span className="text-ink capitalize">{theme}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Music</span><span className="text-ink">{findTrack(backgroundMusic, tracks)?.label ?? "None"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-ink/55">Gallery</span><span className="text-ink">{galleryImages.length > 0 ? `${galleryImages.length} item${galleryImages.length > 1 ? "s" : ""}` : "None"}</span></li>
            </ul>

            <div className="rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/15 p-4 text-sm">
              <p className="font-medium text-[var(--accent)]">Page creation fee · ₦500</p>
              <p className="text-ink/65 mt-1">
                You&apos;ll be redirected to Paystack to complete payment. Your page goes live the moment payment succeeds.
              </p>
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <button type="button" onClick={back} disabled={submitting} className="btn-outline flex-1">
            Back
          </button>
        )}
        {step < 4 && (
          <button type="button" onClick={next} disabled={!canAdvance()} className="btn-accent flex-1 shadow-soft">
            Continue
          </button>
        )}
        {step === 4 && (
          <button type="button" onClick={submit} disabled={submitting} className="btn-accent flex-1 shadow-glow">
            {submitting ? "Publishing…" : "Pay ₦500 & publish"}
          </button>
        )}
      </div>
    </div>
  );
}

function BankCombobox({
  banks, value, onChange,
}: { banks: Bank[]; value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = banks.find((b) => b.code === value) ?? null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? banks.filter((b) => b.name.toLowerCase().includes(q))
    : banks;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field text-left flex items-center justify-between"
      >
        <span className={selected ? "text-ink" : "text-ink/40"}>
          {selected ? selected.name : "Search for a bank…"}
        </span>
        <Search className="size-4 text-ink/40 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-2xl bg-white shadow-card border border-ink/8 overflow-hidden">
          <div className="px-3 py-2 border-b border-ink/8 flex items-center gap-2">
            <Search className="size-4 text-ink/40 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a bank name…"
              className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink/40"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink/50">No banks match &ldquo;{query}&rdquo;</li>
            )}
            {filtered.map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  onClick={() => { onChange(b.code); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 hover:bg-ink/5 ${
                    b.code === value ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-ink"
                  }`}
                  role="option"
                  aria-selected={b.code === value}
                >
                  <span>{b.name}</span>
                  {b.code === value && <Check className="size-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
