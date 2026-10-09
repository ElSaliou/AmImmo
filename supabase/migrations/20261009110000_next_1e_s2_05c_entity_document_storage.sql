-- ============================================================
-- AMIMMO NEXT-1E S2-05C1
-- Generic private document storage
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Private generic document bucket
-- ------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'entity-documents',
  'entity-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ------------------------------------------------------------
-- 2. Extend public.documents for private Storage objects
-- ------------------------------------------------------------

alter table public.documents
  alter column file_url drop not null;

alter table public.documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;


-- ------------------------------------------------------------
-- 3. Integrity constraints
-- ------------------------------------------------------------

alter table public.documents
  drop constraint if exists documents_storage_pair_check;

alter table public.documents
  add constraint documents_storage_pair_check
  check (
    (
      storage_bucket is null
      and storage_path is null
    )
    or
    (
      nullif(btrim(storage_bucket), '') is not null
      and nullif(btrim(storage_path), '') is not null
    )
  );


alter table public.documents
  drop constraint if exists documents_location_check;

alter table public.documents
  add constraint documents_location_check
  check (
    nullif(btrim(file_url), '') is not null
    or (
      nullif(btrim(storage_bucket), '') is not null
      and nullif(btrim(storage_path), '') is not null
    )
  );


alter table public.documents
  drop constraint if exists documents_file_size_check;

alter table public.documents
  add constraint documents_file_size_check
  check (
    file_size is null
    or file_size >= 0
  );


-- ------------------------------------------------------------
-- 4. Indexes
-- ------------------------------------------------------------

create index if not exists idx_documents_entity_uploaded
  on public.documents (
    entity_type,
    entity_id,
    uploaded_at desc
  );


create unique index if not exists uq_documents_storage_location
  on public.documents (
    storage_bucket,
    storage_path
  )
  where
    storage_bucket is not null
    and storage_path is not null;


-- ------------------------------------------------------------
-- 5. Private Storage RLS policies
-- ------------------------------------------------------------

drop policy if exists
  "Staff can read entity documents"
  on storage.objects;

create policy
  "Staff can read entity documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'entity-documents'
    and public.is_staff(auth.uid())
  );


drop policy if exists
  "Staff can upload entity documents"
  on storage.objects;

create policy
  "Staff can upload entity documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'entity-documents'
    and public.is_staff(auth.uid())
  );


drop policy if exists
  "Staff can delete entity documents"
  on storage.objects;

create policy
  "Staff can delete entity documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'entity-documents'
    and public.is_staff(auth.uid())
  );


-- ------------------------------------------------------------
-- 6. Documentation
-- ------------------------------------------------------------

comment on column public.documents.storage_bucket is
  'Supabase Storage bucket containing the private document.';

comment on column public.documents.storage_path is
  'Object path inside the Supabase Storage bucket.';

comment on column public.documents.mime_type is
  'Original MIME type of the uploaded document.';

comment on column public.documents.file_size is
  'Original document size in bytes.';

commit;