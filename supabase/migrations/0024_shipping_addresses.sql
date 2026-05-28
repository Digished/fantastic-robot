-- Add shipping_addresses (address book) to users and shipping_address to celebrations.
alter table public.users
  add column if not exists shipping_addresses jsonb not null default '[]'::jsonb;

alter table public.celebrations
  add column if not exists shipping_address jsonb;
