-- ============================================================
-- AMIMMO NEXT-1B-S3B
-- SOFT ARCHIVE OWNERS AND TENANTS
-- ============================================================

alter table public.owners
add column archived_at timestamptz null;

alter table public.tenants
add column archived_at timestamptz null;

create index idx_owners_active_full_name
on public.owners(full_name)
where archived_at is null;

create index idx_tenants_active_full_name
on public.tenants(full_name)
where archived_at is null;
