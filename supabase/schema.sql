-- OSIS Ngobrol Yuk V1 — initial schema
-- Run this in the Supabase SQL editor (https://app.supabase.com → SQL → New query)
-- It is safe to run multiple times.

create table if not exists public.aspirations (
  id          bigserial primary key,
  case_id     text not null unique,
  topic       text not null check (char_length(topic) between 1 and 80),
  message     text not null check (char_length(message) between 1 and 500),
  anonymous   boolean not null default true,
  status      text not null default 'new'
                check (status in ('new','reviewed','in_progress','done','archived')),
  created_at  timestamptz not null default now()
);

create index if not exists aspirations_status_idx     on public.aspirations (status);
create index if not exists aspirations_created_at_idx on public.aspirations (created_at desc);

-- Enable Row Level Security. The server uses the service role key
-- (bypasses RLS) so this only affects direct anon-key access.
alter table public.aspirations enable row level security;

-- No public read/write policies — only the service role (server) can
-- touch this table in V1. The OSAMA panel in V2 will add policies
-- gated by an authenticated OSIS role.
