-- OSIS Ngobrol Yuk V2 — schema migration
-- Run this in the Supabase SQL editor AFTER schema.sql (or on its own
-- if the table already exists from V1).
--
-- Changes from V1:
--   * `status` allowed values updated: now `new`, `processing`,
--     `resolved`, `archived`. (V1 used `reviewed`, `in_progress`,
--     `done`, `archived` — those values, if any exist in the table,
--     are remapped below.)
--   * New `updated_at` column for tracking status changes.
--   * RLS enabled, with policies:
--       - No public SELECT / INSERT / UPDATE / DELETE on the table.
--         All operations go through the service role (server).
--       - This means the publishable (anon) key cannot read the
--         aspirations table, which is the correct behavior for V2.
--
-- Idempotent: safe to re-run.

-- 1. Remap any existing V1 status values to the V2 vocabulary.
update public.aspirations
   set status = case status
     when 'reviewed'   then 'processing'
     when 'in_progress' then 'processing'
     when 'done'        then 'resolved'
     else status
   end
 where status in ('reviewed', 'in_progress', 'done');

-- 2. Replace the status CHECK constraint with the V2 vocabulary.
alter table public.aspirations
  drop constraint if exists aspirations_status_check;

alter table public.aspirations
  add constraint aspirations_status_check
  check (status in ('new', 'processing', 'resolved', 'archived'));

-- 3. Add updated_at (idempotent). Default to created_at for existing
--    rows; trigger keeps it current going forward.
alter table public.aspirations
  add column if not exists updated_at timestamptz;

update public.aspirations
   set updated_at = created_at
 where updated_at is null;

alter table public.aspirations
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- 3.5. Add admin_reply column (idempotent).
alter table public.aspirations
  add column if not exists admin_reply text;

-- 4. Trigger to keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aspirations_set_updated_at on public.aspirations;
create trigger aspirations_set_updated_at
  before update on public.aspirations
  for each row execute function public.set_updated_at();

-- 5. RLS: deny everything to the anon/authenticated roles. The
--    service role bypasses RLS, which is what the OSAMA panel uses
--    via the server-side admin client.
alter table public.aspirations enable row level security;

drop policy if exists aspirations_anon_select on public.aspirations;
drop policy if exists aspirations_anon_insert on public.aspirations;
drop policy if exists aspirations_anon_update on public.aspirations;
drop policy if exists aspirations_anon_delete on public.aspirations;

-- No policies are created for anon or authenticated. The defaults
-- already deny everything; the drops above are defensive in case
-- a previous migration added something.
