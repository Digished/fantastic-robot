import { getAdminMusicState } from "@/lib/music/server";
import { BUILTIN_TRACKS, builtinSrc } from "@/lib/music";
import { formatDateTime } from "@/lib/admin/format";
import { UploadCustomMusic } from "./upload-form";
import { ToggleBuiltinButton } from "./toggle-builtin";
import { DeleteCustomButton } from "./delete-custom";
import { PreviewButton } from "./preview-button";

export const dynamic = "force-dynamic";

export default async function AdminSoundsPage() {
  const { custom, disabledBuiltins } = await getAdminMusicState();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="serif text-4xl text-ink">Sounds</h1>
        <p className="text-ink/55 text-sm mt-1.5">
          Manage the background-music library used in the celebration picker.
        </p>
      </header>

      <section className="bg-white rounded-3xl border border-ink/10 p-5">
        <h2 className="font-semibold text-ink">Upload a new sound</h2>
        <p className="text-ink/55 text-sm mt-1">
          Adds a track to the picker for everyone. Audio only (mp3, wav, m4a,
          ogg, webm); max 10 MB.
        </p>
        <UploadCustomMusic />
      </section>

      <section className="bg-white rounded-3xl border border-ink/10 p-5">
        <h2 className="font-semibold text-ink">Custom sounds</h2>
        <p className="text-ink/55 text-sm mt-1">
          Tracks you&rsquo;ve uploaded. Removing one detaches it from any
          celebration still using it.
        </p>
        {custom.length === 0 ? (
          <p className="text-ink/45 text-sm mt-4">No custom sounds yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/8">
            {custom.map((t) => (
              <li
                key={t.id}
                className="py-3 flex items-center gap-3 text-sm"
              >
                <PreviewButton src={t.src} label={t.label} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink truncate">{t.label}</div>
                  <div className="text-ink/50 text-xs truncate">
                    {t.mood} · added {formatDateTime(t.created_at)}
                  </div>
                </div>
                <DeleteCustomButton id={t.id} label={t.label} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-ink/10 p-5">
        <h2 className="font-semibold text-ink">Built-in sounds</h2>
        <p className="text-ink/55 text-sm mt-1">
          These ship with the app. Toggle any off to hide it from the picker
          everywhere.
        </p>
        <ul className="mt-4 divide-y divide-ink/8">
          {BUILTIN_TRACKS.map((t) => {
            const disabled = disabledBuiltins.has(t.id);
            return (
              <li
                key={t.id}
                className={`py-3 flex items-center gap-3 text-sm ${
                  disabled ? "opacity-55" : ""
                }`}
              >
                <PreviewButton src={builtinSrc(t.id)} label={t.label} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink truncate">
                    {t.label}
                  </div>
                  <div className="text-ink/50 text-xs truncate">
                    {t.mood}
                  </div>
                </div>
                <ToggleBuiltinButton id={t.id} disabled={disabled} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
