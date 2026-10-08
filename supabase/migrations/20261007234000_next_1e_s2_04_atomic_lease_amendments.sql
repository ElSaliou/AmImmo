-- ============================================================
-- AMIMMO NEXT-1E — S2-04
-- ATOMIC LEASE AMENDMENT APPLICATION
--
-- Baseline Git:
-- 3a8fa8ada15d19f7e3ae9eb9f0d2b2975f6765eb
--
-- Scope:
-- - add one staff-only SECURITY DEFINER RPC to apply amendments
-- - write lease_amendments + lease_term_versions atomically
-- - derive immutable previous/new full-term snapshots server-side
-- - block financial amendments against an already invoiced month/later
-- - keep financial effective dates on first day of month
-- - preserve future-dated amendment semantics (no early lease snapshot)
-- - make amendment insert guard consult temporal history, not stale lease snapshot
--
-- Deliberately unchanged:
-- - historical invoices/accounting/calculation evidence
-- - Policy C rules
-- - management_commission_rate
-- - document upload/storage workflow (S2-05)
-- - existing frontend (S2-05)
-- ============================================================

begin;

create or replace function public.guard_lease_amendment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_latest_effective_from date;
    v_latest_end_date date;
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

    select v.effective_from, v.end_date
    into v_latest_effective_from, v_latest_end_date
    from public.lease_term_versions v
    where v.lease_id = new.lease_id
    order by v.version_no desc
    limit 1;

    if found then
        if new.effective_date <= v_latest_effective_from then
            raise exception using
                errcode = '23514',
                message = 'LEASE_AMENDMENT_EFFECTIVE_DATE_NOT_FORWARD';
        end if;

        if v_latest_end_date is not null
           and new.effective_date > v_latest_end_date
        then
            raise exception using
                errcode = '23514',
                message = 'LEASE_AMENDMENT_AFTER_CURRENT_END_DATE';
        end if;
    elsif v_lease.end_date is not null
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

revoke all on function public.guard_lease_amendment_insert()
from public, anon, authenticated, service_role;

create or replace function public.apply_lease_amendment(
    p_lease_id uuid,
    p_effective_date date,
    p_reason text,
    p_changes jsonb
)
returns table (
    amendment_id uuid,
    amendment_reference text,
    lease_id uuid,
    effective_date date,
    version_id uuid,
    version_no integer,
    changed_fields text[],
    previous_terms jsonb,
    new_terms jsonb,
    effective_now boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_latest public.lease_term_versions%rowtype;
    v_current_terms record;

    v_new_monthly_rent numeric;
    v_new_charges numeric;
    v_new_deposit numeric;
    v_new_due_day integer;
    v_new_end_date date;

    v_due_numeric numeric;
    v_changed_fields text[] := array[]::text[];
    v_financial_change boolean := false;

    v_previous_terms jsonb;
    v_new_terms jsonb;

    v_amendment_id uuid;
    v_amendment_reference text;
    v_version_id uuid;
    v_version_no integer;

    v_conflict_invoice_number text;
    v_effective_now boolean := false;
begin
    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    if p_lease_id is null then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_INVALID_LEASE_ID';
    end if;

    if p_effective_date is null then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_INVALID_EFFECTIVE_DATE';
    end if;

    if p_reason is null or btrim(p_reason) = '' then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_REASON_REQUIRED';
    end if;

    if p_changes is null
       or jsonb_typeof(p_changes) <> 'object'
       or p_changes = '{}'::jsonb
    then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_CHANGES_REQUIRED';
    end if;

    if exists (
        select 1
        from jsonb_object_keys(p_changes) as k(key)
        where k.key not in (
            'monthly_rent',
            'charges',
            'due_day',
            'deposit',
            'end_date'
        )
    ) then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_UNSUPPORTED_FIELD';
    end if;

    select l.*
    into v_lease
    from public.leases l
    where l.id = p_lease_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'LEASE_AMENDMENT_LEASE_NOT_FOUND';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_ACTIVE_LEASE_REQUIRED';
    end if;

    if p_effective_date < v_lease.start_date then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_BEFORE_LEASE_START';
    end if;

    perform public.ensure_lease_initial_term_version(p_lease_id);

    select v.*
    into v_latest
    from public.lease_term_versions v
    where v.lease_id = p_lease_id
    order by v.version_no desc
    limit 1
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'LEASE_TERMS_VERSION_NOT_FOUND';
    end if;

    if p_effective_date <= v_latest.effective_from then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_EFFECTIVE_DATE_NOT_FORWARD';
    end if;

    if v_latest.end_date is not null
       and p_effective_date > v_latest.end_date
    then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_AFTER_CURRENT_END_DATE';
    end if;

    v_new_monthly_rent := v_latest.monthly_rent;
    v_new_charges := v_latest.charges;
    v_new_deposit := v_latest.deposit;
    v_new_due_day := v_latest.due_day;
    v_new_end_date := v_latest.end_date;

    if p_changes ? 'monthly_rent' then
        if jsonb_typeof(p_changes -> 'monthly_rent') <> 'number' then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_MONTHLY_RENT';
        end if;
        v_new_monthly_rent := (p_changes ->> 'monthly_rent')::numeric;
        if v_new_monthly_rent <= 0 then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_MONTHLY_RENT';
        end if;
    end if;

    if p_changes ? 'charges' then
        if jsonb_typeof(p_changes -> 'charges') <> 'number' then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_CHARGES';
        end if;
        v_new_charges := (p_changes ->> 'charges')::numeric;
        if v_new_charges < 0 then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_CHARGES';
        end if;
    end if;

    if p_changes ? 'deposit' then
        if jsonb_typeof(p_changes -> 'deposit') <> 'number' then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_DEPOSIT';
        end if;
        v_new_deposit := (p_changes ->> 'deposit')::numeric;
        if v_new_deposit < 0 then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_DEPOSIT';
        end if;
    end if;

    if p_changes ? 'due_day' then
        if jsonb_typeof(p_changes -> 'due_day') <> 'number' then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_DUE_DAY';
        end if;
        v_due_numeric := (p_changes ->> 'due_day')::numeric;
        if v_due_numeric <> trunc(v_due_numeric)
           or v_due_numeric < 1
           or v_due_numeric > 31
        then
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_DUE_DAY';
        end if;
        v_new_due_day := v_due_numeric::integer;
    end if;

    if p_changes ? 'end_date' then
        if jsonb_typeof(p_changes -> 'end_date') = 'null' then
            v_new_end_date := null;
        elsif jsonb_typeof(p_changes -> 'end_date') = 'string' then
            begin
                v_new_end_date := (p_changes ->> 'end_date')::date;
            exception
                when others then
                    raise exception using errcode = '22007', message = 'LEASE_AMENDMENT_INVALID_END_DATE';
            end;
        else
            raise exception using errcode = '23514', message = 'LEASE_AMENDMENT_INVALID_END_DATE';
        end if;
    end if;

    if v_new_end_date is not null
       and v_new_end_date < p_effective_date
    then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_END_DATE_BEFORE_EFFECTIVE_DATE';
    end if;

    if v_new_monthly_rent is distinct from v_latest.monthly_rent then
        v_changed_fields := array_append(v_changed_fields, 'monthly_rent');
    end if;
    if v_new_charges is distinct from v_latest.charges then
        v_changed_fields := array_append(v_changed_fields, 'charges');
    end if;
    if v_new_due_day is distinct from v_latest.due_day then
        v_changed_fields := array_append(v_changed_fields, 'due_day');
    end if;
    if v_new_deposit is distinct from v_latest.deposit then
        v_changed_fields := array_append(v_changed_fields, 'deposit');
    end if;
    if v_new_end_date is distinct from v_latest.end_date then
        v_changed_fields := array_append(v_changed_fields, 'end_date');
    end if;

    if cardinality(v_changed_fields) = 0 then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_NO_CHANGES';
    end if;

    v_financial_change :=
        v_changed_fields
        && array['monthly_rent', 'charges', 'due_day']::text[];

    if v_financial_change
       and p_effective_date <> date_trunc('month', p_effective_date)::date
    then
        raise exception using
            errcode = '23514',
            message = 'LEASE_AMENDMENT_FINANCIAL_EFFECTIVE_DATE_MUST_BE_MONTH_START';
    end if;

    if v_financial_change
       and exists (
            select 1
            from public.invoices i
            where i.lease_id = p_lease_id
              and i.kind = 'rent'::public.invoice_kind
              and i.status <> 'cancelled'::public.invoice_status
              and (i.period_start is null or i.period_end is null)
       )
    then
        raise exception using
            errcode = '23514',
            message = 'BILLING_EXISTING_INVOICE_PERIOD_INVALID';
    end if;

    if v_financial_change then
        select i.number
        into v_conflict_invoice_number
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start is not null
          and date_trunc('month', i.period_start)::date >= date_trunc('month', p_effective_date)::date
        order by i.period_start, i.number
        limit 1;

        if found then
            raise exception using
                errcode = '23514',
                message = 'BILLING_AMENDMENT_EXISTING_INVOICE_CONFLICT',
                detail = format('Conflicting rent invoice: %s', v_conflict_invoice_number);
        end if;
    end if;

    v_previous_terms := jsonb_build_object(
        'monthly_rent', v_latest.monthly_rent,
        'charges', v_latest.charges,
        'due_day', v_latest.due_day,
        'deposit', v_latest.deposit,
        'end_date', v_latest.end_date
    );

    v_new_terms := jsonb_build_object(
        'monthly_rent', v_new_monthly_rent,
        'charges', v_new_charges,
        'due_day', v_new_due_day,
        'deposit', v_new_deposit,
        'end_date', v_new_end_date
    );

    insert into public.lease_amendments (
        lease_id, reference, effective_date, reason,
        changed_fields, previous_terms, new_terms,
        created_by, created_at
    )
    values (
        p_lease_id, null, p_effective_date, btrim(p_reason),
        v_changed_fields, v_previous_terms, v_new_terms,
        auth.uid(), now()
    )
    returning id, reference
    into v_amendment_id, v_amendment_reference;

    v_version_no := v_latest.version_no + 1;

    insert into public.lease_term_versions (
        lease_id, version_no, effective_from, source_kind, amendment_id,
        monthly_rent, charges, deposit, due_day, end_date,
        created_by, created_at
    )
    values (
        p_lease_id, v_version_no, p_effective_date, 'amendment', v_amendment_id,
        v_new_monthly_rent, v_new_charges, v_new_deposit, v_new_due_day, v_new_end_date,
        auth.uid(), now()
    )
    returning id into v_version_id;

    if current_date >= v_lease.start_date then
        select *
        into v_current_terms
        from public.resolve_lease_terms_at_date(p_lease_id, current_date);

        update public.leases l
        set
            monthly_rent = v_current_terms.monthly_rent,
            charges = v_current_terms.charges,
            deposit = v_current_terms.deposit,
            due_day = v_current_terms.due_day,
            end_date = v_current_terms.end_date
        where l.id = p_lease_id;

        v_effective_now := p_effective_date <= current_date;
    else
        v_effective_now := false;
    end if;

    return query
    select
        v_amendment_id,
        v_amendment_reference,
        p_lease_id,
        p_effective_date,
        v_version_id,
        v_version_no,
        v_changed_fields,
        v_previous_terms,
        v_new_terms,
        v_effective_now;
end;
$function$;

comment on function public.apply_lease_amendment(uuid, date, text, jsonb) is
'NEXT-1E S2-04 atomic staff-only lease amendment RPC. Creates one immutable amendment event and one strictly-forward temporal version, blocks financial changes from an already invoiced effective month onward, and keeps leases as the current effective snapshot without applying future terms early.';

revoke all on function public.apply_lease_amendment(uuid, date, text, jsonb)
from public, anon;

grant execute on function public.apply_lease_amendment(uuid, date, text, jsonb)
to authenticated, service_role;

commit;
