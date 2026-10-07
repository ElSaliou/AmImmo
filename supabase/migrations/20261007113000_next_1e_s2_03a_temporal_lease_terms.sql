begin;

-- ============================================================
-- AMIMMO NEXT-1E — S2-03A
-- TEMPORAL LEASE TERMS RESOLVER + ACTIVE-LEASE BOOTSTRAP
--
-- Baseline Git:
-- f90825e7a071ef0377ef347a03338980c04542d1
-- ============================================================

create or replace function public.ensure_lease_initial_term_version(
    p_lease_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_existing public.lease_term_versions%rowtype;
    v_version_id uuid;
begin
    if p_lease_id is null then
        raise exception using
            errcode = '23514',
            message = 'LEASE_INITIAL_TERMS_INVALID_LEASE_ID';
    end if;

    select l.*
    into v_lease
    from public.leases l
    where l.id = p_lease_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'LEASE_INITIAL_TERMS_LEASE_NOT_FOUND';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        raise exception using
            errcode = '23514',
            message = 'LEASE_INITIAL_TERMS_ACTIVE_LEASE_REQUIRED';
    end if;

    select v.*
    into v_existing
    from public.lease_term_versions v
    where v.lease_id = p_lease_id
      and v.version_no = 1
    limit 1;

    if found then
        if v_existing.source_kind <> 'initial'
           or v_existing.amendment_id is not null
           or v_existing.effective_from is distinct from v_lease.start_date
        then
            raise exception using
                errcode = '23514',
                message = 'LEASE_INITIAL_TERMS_HISTORY_CONFLICT';
        end if;

        return v_existing.id;
    end if;

    if exists (
        select 1
        from public.lease_term_versions v
        where v.lease_id = p_lease_id
    ) then
        raise exception using
            errcode = '23514',
            message = 'LEASE_INITIAL_TERMS_HISTORY_CONFLICT';
    end if;

    insert into public.lease_term_versions (
        lease_id,
        version_no,
        effective_from,
        source_kind,
        amendment_id,
        monthly_rent,
        charges,
        deposit,
        due_day,
        end_date,
        created_by,
        created_at
    )
    values (
        v_lease.id,
        1,
        v_lease.start_date,
        'initial',
        null,
        v_lease.monthly_rent,
        coalesce(v_lease.charges, 0),
        coalesce(v_lease.deposit, 0),
        coalesce(v_lease.due_day, 1),
        v_lease.end_date,
        auth.uid(),
        now()
    )
    returning id
    into v_version_id;

    return v_version_id;
end;
$function$;

revoke all
on function public.ensure_lease_initial_term_version(uuid)
from public, anon, authenticated, service_role;

create or replace function public.bootstrap_active_lease_term_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if new.status = 'active'::public.lease_status then
        if tg_op = 'INSERT' then
            perform public.ensure_lease_initial_term_version(new.id);
        elsif old.status is distinct from new.status then
            perform public.ensure_lease_initial_term_version(new.id);
        end if;
    end if;

    return new;
end;
$function$;

revoke all
on function public.bootstrap_active_lease_term_version()
from public, anon, authenticated, service_role;

create trigger trg_bootstrap_active_lease_term_version
after insert or update of status
on public.leases
for each row
execute function public.bootstrap_active_lease_term_version();

do $$
declare
    v_lease_id uuid;
begin
    for v_lease_id in
        select l.id
        from public.leases l
        where l.status = 'active'::public.lease_status
          and not exists (
              select 1
              from public.lease_term_versions v
              where v.lease_id = l.id
                and v.version_no = 1
          )
        order by l.id
    loop
        perform public.ensure_lease_initial_term_version(v_lease_id);
    end loop;
end;
$$;

create or replace function public.resolve_lease_terms_at_date(
    p_lease_id uuid,
    p_effective_date date
)
returns table (
    lease_id uuid,
    version_id uuid,
    version_no integer,
    effective_from date,
    source_kind text,
    amendment_id uuid,
    monthly_rent numeric,
    charges numeric,
    deposit numeric,
    due_day integer,
    end_date date
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
    v_lease_start_date date;
begin
    if p_lease_id is null then
        raise exception using
            errcode = '23514',
            message = 'LEASE_TERMS_INVALID_LEASE_ID';
    end if;

    if p_effective_date is null then
        raise exception using
            errcode = '23514',
            message = 'LEASE_TERMS_INVALID_EFFECTIVE_DATE';
    end if;

    select l.start_date
    into v_lease_start_date
    from public.leases l
    where l.id = p_lease_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'LEASE_TERMS_LEASE_NOT_FOUND';
    end if;

    if p_effective_date < v_lease_start_date then
        raise exception using
            errcode = '23514',
            message = 'LEASE_TERMS_DATE_BEFORE_START';
    end if;

    return query
    select
        v.lease_id,
        v.id,
        v.version_no,
        v.effective_from,
        v.source_kind,
        v.amendment_id,
        v.monthly_rent,
        v.charges,
        v.deposit,
        v.due_day,
        v.end_date
    from public.lease_term_versions v
    where v.lease_id = p_lease_id
      and v.effective_from <= p_effective_date
    order by
        v.effective_from desc,
        v.version_no desc
    limit 1;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'LEASE_TERMS_VERSION_NOT_FOUND';
    end if;
end;
$function$;

revoke all
on function public.resolve_lease_terms_at_date(uuid, date)
from public, anon, authenticated, service_role;

commit;
