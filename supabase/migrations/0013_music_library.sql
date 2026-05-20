-- Admin-managed background music: custom uploaded tracks live in
-- `music_library`, and any of the built-in tracks (defined in `lib/music.ts`)
-- can be hidden from the picker by inserting its id into `music_disabled`.
-- Audio files are stored in the existing `celebrations` storage bucket under
-- the `music/` prefix, served publicly like all other media in that bucket.

create table if not exists public.music_library (
  id text primary key,
  label text not null,
  mood text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_disabled (
  id text primary key,
  disabled_at timestamptz not null default now()
);

alter table public.music_library enable row level security;
alter table public.music_disabled enable row level security;

-- Everyone can read the library so the music picker shows custom tracks for
-- anonymous + authenticated visitors. All writes go through the service-role
-- client (admin dashboard), so no insert/update/delete policies are defined.
create policy "music_library public read"
  on public.music_library for select
  to anon, authenticated using (true);

create policy "music_disabled public read"
  on public.music_disabled for select
  to anon, authenticated using (true);
