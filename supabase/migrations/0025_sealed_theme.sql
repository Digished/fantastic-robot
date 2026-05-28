alter table public.celebrations
  add column if not exists sealed_theme varchar(40);
