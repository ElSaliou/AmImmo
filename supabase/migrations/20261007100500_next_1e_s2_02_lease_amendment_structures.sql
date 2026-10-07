begin;

-- ============================================================
-- AMIMMO NEXT-1E — S2-02
-- LEASE AMENDMENT + TERM VERSION STRUCTURES
-- Baseline Git: 34e497233e1b60fcebec102fd665c1e04bb39878
-- ============================================================

create sequence if not exists public.lease_amendment_reference_seq;

create table public.lease_amendments (
    id uuid primary key default gen_random_uuid(),
    lease_id uuid not null references public.leases(id) on delete restrict,
    reference text not null,
    effective_date date not null,
    reason text not null,
    changed_fields text[] not null,
    previous_terms jsonb not null,
    new_terms jsonb not null,
    created_by uuid default auth.uid(),
    created_at timestamptz not null default now(),

    constraint lease_amendments_reference_nonblank_check
        check (btrim(reference) <> ''),

    constraint lease_amendments_reason_nonblank_check
        check (btrim(reason) <> ''),

    constraint lease_amendments_changed_fields_nonempty_check
        check (cardinality(changed_fields) > 0),

    constraint lease_amendments_changed_fields_allowed_check
        check (
            changed_fields <@ array[
                'monthly_rent',
                'charges',
                'due_day',
                'deposit',
                'end_date'
            ]::text[]
        ),

    constraint lease_amendments_previous_terms_object_check
        check (
            jsonb_typeof(previous_terms) = 'object'
            and previous_terms ?& array[
                'monthly_rent',
                'charges',
                'due_day',
                'deposit',
                'end_date'
            ]
        ),

    constraint lease_amendments_new_terms_object_check
        check (
            jsonb_typeof(new_terms) = 'object'
            and new_terms ?& array[
                'monthly_rent',
                'charges',
                'due_day',
                'deposit',
                'end_date'
            ]
        ),

    constraint lease_amendments_reference_key unique (reference)
);

create index idx_lease_amendments_lease_effective_date
    on public.lease_amendments (lease_id, effective_date, created_at);

create table public.lease_term_versions (
    id uuid primary key default gen_random_uuid(),
    lease_id uuid not null references public.leases(id) on delete restrict,
    version_no integer not null,
    effective_from date not null,
    source_kind text not null,
    amendment_id uuid references public.lease_amendments(id) on delete restrict,
    monthly_rent numeric not null,
    charges numeric not null,
    deposit numeric not null,
    due_day integer not null,
    end_date date,
    created_by uuid default auth.uid(),
    created_at timestamptz not null default now(),

    constraint lease_term_versions_version_no_check
        check (version_no >= 1),

    constraint lease_term_versions_source_kind_check
        check (source_kind in ('initial', 'amendment')),

    constraint lease_term_versions_source_mapping_check
        check (
            (
                source_kind = 'initial'
                and version_no = 1
                and amendment_id is null
            )
            or
            (
                source_kind = 'amendment'
                and version_no > 1
                and amendment_id is not null
            )
        ),

    constraint lease_term_versions_monthly_rent_positive_check
        check (monthly_rent > 0),

    constraint lease_term_versions_charges_non_negative_check
        check (charges >= 0),

    constraint lease_term_versions_deposit_non_negative_check
        check (deposit >= 0),

    constraint lease_term_versions_due_day_check
        check (due_day between 1 and 31),

    constraint lease_term_versions_end_date_check
        check (end_date is null or end_date >= effective_from),

    constraint lease_term_versions_lease_version_key
        unique (lease_id, version_no),

    constraint lease_term_versions_lease_effective_from_key
        unique (lease_id, effective_from)
);

create unique index uq_lease_term_versions_amendment
    on public.lease_term_versions (amendment_id)
    where amendment_id is not null;

create index idx_lease_term_versions_resolve
    on public.lease_term_versions (
        lease_id,
        effective_from desc,
        version_no desc
    );

create or replace function public.set_lease_amendment_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if new.reference is null or btrim(new.reference) = '' then
        new.reference :=
            'AVN-'
            || to_char(coalesce(new.effective_date, current_date), 'YYYY')
            || '-'
            || lpad(
                nextval('public.lease_amendment_reference_seq')::text,
                6,
                '0'
            );
    end if;

    return new;
end;
$function$;

revoke all
on function public.set_lease_amendment_reference()
from public, anon, authenticated, service_role;

create trigger trg_lease_amendment_reference
before insert on public.lease_amendments
for each row
execute function public.set_lease_amendment_reference();

create or replace function public.guard_lease_amendment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_financial_change boolean;
begin
    select l.*
    into v_lease
    from public.leases l
    where l.id = new.lease_id;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'LEASE_AMENDMENT_LEASE_NOT_FOUND';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_ACTIVE_LEASE_REQUIRED';
    end if;

    if new.effective_date < v_lease.start_date then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_BEFORE_LEASE_START';
    end if;

    if v_lease.end_date is not null
       and new.effective_date > v_lease.end_date
    then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_AFTER_CURRENT_END_DATE';
    end if;

    v_financial_change :=
        new.changed_fields
        && array['monthly_rent', 'charges', 'due_day']::text[];

    if v_financial_change
       and new.effective_date <>
           date_trunc('month', new.effective_date)::date
    then
        raise exception using
            errcode = '23514',
            message =
                'LEASE_AMENDMENT_FINANCIAL_EFFECTIVE_DATE_MUST_BE_MONTH_START';
    end if;

    return new;
end;
$function$;

revoke all
on function public.guard_lease_amendment_insert()
from public, anon, authenticated, service_role;

create trigger trg_guard_lease_amendment_insert
before insert on public.lease_amendments
for each row
execute function public.guard_lease_amendment_insert();

create or replace function public.guard_lease_term_version_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_amendment_lease_id uuid;
    v_amendment_effective_date date;
    v_existing_versions integer;
    v_max_version integer;
    v_latest_effective_from date;
begin
    select l.*
    into v_lease
    from public.leases l
    where l.id = new.lease_id;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'LEASE_TERM_VERSION_LEASE_NOT_FOUND';
    end if;

    if new.effective_from < v_lease.start_date then
        raise exception using
            errcode = '23514',
            message = 'LEASE_TERM_VERSION_BEFORE_LEASE_START';
    end if;

    select
        count(*),
        max(v.version_no),
        max(v.effective_from)
    into
        v_existing_versions,
        v_max_version,
        v_latest_effective_from
    from public.lease_term_versions v
    where v.lease_id = new.lease_id;

    if new.source_kind = 'initial' then
        if new.version_no <> 1
           or new.effective_from <> v_lease.start_date
           or new.amendment_id is not null
           or v_existing_versions <> 0
        then
            raise exception using
                errcode = '23514',
                message = 'LEASE_TERM_VERSION_INVALID_INITIAL';
        end if;

    elsif new.source_kind = 'amendment' then
        select a.lease_id, a.effective_date
        into v_amendment_lease_id, v_amendment_effective_date
        from public.lease_amendments a
        where a.id = new.amendment_id;

        if not found then
            raise exception using
                errcode = '23503',
                message = 'LEASE_TERM_VERSION_AMENDMENT_NOT_FOUND';
        end if;

        if v_amendment_lease_id is distinct from new.lease_id
           or v_amendment_effective_date
              is distinct from new.effective_from
        then
            raise exception using
                errcode = '23514',
                message = 'LEASE_TERM_VERSION_AMENDMENT_MISMATCH';
        end if;

        if new.version_no <> coalesce(v_max_version, 0) + 1 then
            raise exception using
                errcode = '23514',
                message = 'LEASE_TERM_VERSION_SEQUENCE_ERROR';
        end if;

        if v_latest_effective_from is not null
           and new.effective_from <= v_latest_effective_from
        then
            raise exception using
                errcode = '23514',
                message = 'LEASE_TERM_VERSION_EFFECTIVE_DATE_NOT_FORWARD';
        end if;

    else
        raise exception using
            errcode = '23514',
            message = 'LEASE_TERM_VERSION_INVALID_SOURCE';
    end if;

    return new;
end;
$function$;

revoke all
on function public.guard_lease_term_version_insert()
from public, anon, authenticated, service_role;

create trigger trg_guard_lease_term_version_insert
before insert on public.lease_term_versions
for each row
execute function public.guard_lease_term_version_insert();

create or replace function public.guard_lease_history_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    raise exception using
        errcode = '23514',
        message =
            case
                when tg_table_name = 'lease_amendments'
                    then 'LEASE_AMENDMENT_IMMUTABLE'
                else 'LEASE_TERM_VERSION_IMMUTABLE'
            end;
end;
$function$;

revoke all
on function public.guard_lease_history_immutable()
from public, anon, authenticated, service_role;

create trigger trg_lease_amendments_immutable
before update or delete on public.lease_amendments
for each row
execute function public.guard_lease_history_immutable();

create trigger trg_lease_term_versions_immutable
before update or delete on public.lease_term_versions
for each row
execute function public.guard_lease_history_immutable();

create trigger trg_audit_lease_amendments
after insert or update or delete on public.lease_amendments
for each row
execute function public.log_audit();

create trigger trg_audit_lease_term_versions
after insert or update or delete on public.lease_term_versions
for each row
execute function public.log_audit();

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
select
    l.id,
    1,
    l.start_date,
    'initial',
    null,
    l.monthly_rent,
    coalesce(l.charges, 0),
    coalesce(l.deposit, 0),
    coalesce(l.due_day, 1),
    l.end_date,
    null,
    l.created_at
from public.leases l
where not exists (
    select 1
    from public.lease_term_versions v
    where v.lease_id = l.id
);

alter table public.lease_amendments enable row level security;
alter table public.lease_term_versions enable row level security;

create policy "Staff reads lease amendments"
on public.lease_amendments
for select
to authenticated
using (public.is_staff(auth.uid()));

create policy "Owner reads own lease amendments"
on public.lease_amendments
for select
to authenticated
using (
    exists (
        select 1
        from public.leases l
        where l.id = lease_amendments.lease_id
          and public.is_owner_of(l.owner_id)
    )
);

create policy "Tenant reads own lease amendments"
on public.lease_amendments
for select
to authenticated
using (
    exists (
        select 1
        from public.leases l
        where l.id = lease_amendments.lease_id
          and public.is_tenant_of(l.tenant_id)
    )
);

create policy "Staff reads lease term versions"
on public.lease_term_versions
for select
to authenticated
using (public.is_staff(auth.uid()));

create policy "Owner reads own lease term versions"
on public.lease_term_versions
for select
to authenticated
using (
    exists (
        select 1
        from public.leases l
        where l.id = lease_term_versions.lease_id
          and public.is_owner_of(l.owner_id)
    )
);

create policy "Tenant reads own lease term versions"
on public.lease_term_versions
for select
to authenticated
using (
    exists (
        select 1
        from public.leases l
        where l.id = lease_term_versions.lease_id
          and public.is_tenant_of(l.tenant_id)
    )
);

revoke all
on table public.lease_amendments
from public, anon;

revoke all
on table public.lease_term_versions
from public, anon;

grant select
on table public.lease_amendments
to authenticated, service_role;

grant select
on table public.lease_term_versions
to authenticated, service_role;

revoke insert, update, delete, truncate, references, trigger
on table public.lease_amendments
from authenticated, service_role;

revoke insert, update, delete, truncate, references, trigger
on table public.lease_term_versions
from authenticated, service_role;

revoke all
on sequence public.lease_amendment_reference_seq
from public, anon, authenticated, service_role;

commit;
