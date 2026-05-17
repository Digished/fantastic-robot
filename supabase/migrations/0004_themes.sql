-- Per-celebration visual theme.
do $$ begin
  create type celebration_theme as enum ('ivory','midnight','bloom','sage','ocean','dusk');
exception when duplicate_object then null; end $$;

alter table public.celebrations
  add column if not exists theme celebration_theme not null default 'ivory';
