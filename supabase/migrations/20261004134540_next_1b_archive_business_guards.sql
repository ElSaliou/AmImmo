-- ============================================================
-- AMIMMO NEXT-1B-S3C-3
-- BUSINESS GUARDS FOR LOGICAL ARCHIVING
-- ============================================================

-- ============================================================
-- OWNER
-- Prevent archiving while an active/pending lease exists.
-- ============================================================

create or replace function public.guard_owner_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.archived_at is null
       and new.archived_at is not null then

        if exists (
            select 1
            from public.leases l
            where l.owner_id = old.id
              and l.status in ('active', 'pending')
        ) then
            raise exception using
                errcode = '23514',
                message = 'Impossible d''archiver ce propriétaire : un bail actif ou en attente est lié.';
        end if;

        new.updated_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_guard_owner_archive
on public.owners;

create trigger trg_guard_owner_archive
before update of archived_at
on public.owners
for each row
execute function public.guard_owner_archive();


-- ============================================================
-- TENANT
-- Prevent archiving while an active/pending lease exists.
-- ============================================================

create or replace function public.guard_tenant_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.archived_at is null
       and new.archived_at is not null then

        if exists (
            select 1
            from public.leases l
            where l.tenant_id = old.id
              and l.status in ('active', 'pending')
        ) then
            raise exception using
                errcode = '23514',
                message = 'Impossible d''archiver ce locataire : un bail actif ou en attente est lié.';
        end if;

        new.updated_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_guard_tenant_archive
on public.tenants;

create trigger trg_guard_tenant_archive
before update of archived_at
on public.tenants
for each row
execute function public.guard_tenant_archive();


-- ============================================================
-- PROPERTY
-- Prevent archiving while an active/pending lease exists.
-- A property awaiting control must be archived through the
-- dedicated control workflow, which clears control_required.
-- ============================================================

create or replace function public.guard_property_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status = 'archived'
       and old.status is distinct from new.status then

        if exists (
            select 1
            from public.leases l
            where l.property_id = old.id
              and l.status in ('active', 'pending')
        ) then
            raise exception using
                errcode = '23514',
                message = 'Impossible d''archiver ce bien : un bail actif ou en attente est lié.';
        end if;

        if coalesce(old.control_required, false)
           and coalesce(new.control_required, false) then
            raise exception using
                errcode = '23514',
                message = 'Impossible d''archiver directement ce bien : le contrôle en attente doit être traité via le workflow prévu.';
        end if;

        new.published := false;
        new.status_changed_at := now();
        new.updated_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_guard_property_archive
on public.properties;

create trigger trg_guard_property_archive
before update of status
on public.properties
for each row
execute function public.guard_property_archive();

-- ============================================================
-- FUNCTION PRIVILEGES
-- Trigger functions must not be directly executable by clients.
-- ============================================================

revoke execute on function public.guard_owner_archive()
from public, anon, authenticated;

revoke execute on function public.guard_tenant_archive()
from public, anon, authenticated;

revoke execute on function public.guard_property_archive()
from public, anon, authenticated;
