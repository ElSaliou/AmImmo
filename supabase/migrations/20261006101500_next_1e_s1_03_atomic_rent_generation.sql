-- ============================================================
-- AMIMMO NEXT-1E-S1-03
-- ATOMIC POLICY-C RENT GENERATION
-- CANONICAL IDEMPOTENT MIGRATION
-- ============================================================
--
-- Scope:
--   * Replace generate_lease_rent_invoices(uuid, date)
--   * Replace generate_all_rent_invoices(date)
--   * Keep both public signatures unchanged
--   * Route all canonical monthly calculations through
--     resolve_long_term_rent_billing()
--   * Prevalidate every candidate month before any invoice write
--   * Reuse compatible existing invoices without fabricating
--     LONG_TERM_C_V1 evidence for legacy invoices
--   * Create invoice + lines + immutable calculation evidence
--     atomically for new invoices
--   * Keep current exit/final-invoice RPCs untouched
--
-- Accounting:
--   invoices are still posted by the existing AFTER INSERT trigger.
--   New auto invoices use issue_date = current_date.
--   due_date remains contractual.
-- ============================================================

begin;

create or replace function public.generate_lease_rent_invoices(
    p_lease_id uuid,
    p_through_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_invoice public.invoices%rowtype;
    v_calc public.rent_invoice_calculations%rowtype;
    v_res record;

    v_horizon_date date;
    v_current_month date;
    v_start_month date;
    v_last_month date;
    v_month date;

    v_context public.long_term_rent_billing_context;
    v_effective_date date;

    v_due_date date;
    v_invoice_id uuid;

    v_active_invoice_count integer;
    v_evidence_count integer;
    v_lines_total numeric;

    v_existing_months date[] := array[]::date[];
    v_created integer := 0;

    v_organization_id uuid;
begin
    -- ========================================================
    -- 1. SECURITY
    -- ========================================================

    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;


    -- ========================================================
    -- 2. INPUT / HORIZON
    -- ========================================================

    if p_through_date is null then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_THROUGH_DATE';
    end if;

    v_current_month := date_trunc('month', current_date)::date;

    if date_trunc('month', p_through_date)::date > v_current_month then
        raise exception using
            errcode = '23514',
            message = 'BILLING_FUTURE_MONTH';
    end if;

    -- A future day inside the current month is clipped to today.
    v_horizon_date := least(p_through_date, current_date);


    -- ========================================================
    -- 3. LEASE + TRANSACTIONAL LOCK
    -- ========================================================

    select l.*
    into v_lease
    from public.leases l
    where l.id = p_lease_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Bail introuvable.';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        return 0;
    end if;

    if v_lease.periodicity <> 'monthly' then
        raise exception using
            errcode = '23514',
            message = format(
                'Périodicité non prise en charge : %s.',
                v_lease.periodicity
            );
    end if;

    if coalesce(v_lease.monthly_rent, 0) <= 0 then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_RENT';
    end if;

    if coalesce(v_lease.charges, 0) < 0 then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_CHARGES';
    end if;

    -- A lease that has not started yet produces no invoice.
    if v_lease.start_date > v_horizon_date then
        return 0;
    end if;

    v_start_month := date_trunc('month', v_lease.start_date)::date;

    v_last_month :=
        date_trunc(
            'month',
            least(
                v_horizon_date,
                coalesce(v_lease.end_date, v_horizon_date)
            )
        )::date;

    if v_last_month < v_start_month then
        return 0;
    end if;


    -- Active rent invoices without a usable period cannot be
    -- mapped safely to a canonical billing month.
    if exists (
        select 1
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and (
                i.period_start is null
             or i.period_end is null
          )
    ) then
        raise exception using
            errcode = '23514',
            message = 'BILLING_EXISTING_INVOICE_PERIOD_INVALID';
    end if;


    -- ========================================================
    -- 4. PHASE 1 - PREVALIDATE EVERY CANDIDATE MONTH
    -- ========================================================
    --
    -- No invoice/line/evidence write is allowed in this phase.
    -- Existing invoice rows are locked when reused.
    -- ========================================================

    for v_month in
        select generate_series(
            v_start_month,
            v_last_month,
            interval '1 month'
        )::date
    loop
        -- ----------------------------------------------------
        -- Context resolution
        -- ----------------------------------------------------

        if v_lease.end_date is not null
           and date_trunc('month', v_lease.end_date)::date = v_month
           and v_lease.end_date <= v_horizon_date
        then
            v_context :=
                'contract_expiration'
                ::public.long_term_rent_billing_context;

            v_effective_date := v_lease.end_date;

        elsif v_month = v_start_month then
            v_context :=
                'lease_start'
                ::public.long_term_rent_billing_context;

            v_effective_date := null;

        else
            v_context :=
                'regular_month'
                ::public.long_term_rent_billing_context;

            v_effective_date := null;
        end if;


        select *
        into v_res
        from public.resolve_long_term_rent_billing(
            v_lease.start_date,
            v_month,
            v_lease.monthly_rent,
            coalesce(v_lease.charges, 0),
            v_context,
            v_effective_date,
            null
        );

        if v_res.resolution_status <> 'resolved' then
            raise exception using
                errcode = '23514',
                message = v_res.resolution_code;
        end if;


        -- ----------------------------------------------------
        -- Business identity = lease + billing month
        -- ----------------------------------------------------

        select count(*)
        into v_active_invoice_count
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start is not null
          and date_trunc('month', i.period_start)::date = v_month;

        if v_active_invoice_count > 1 then
            raise exception using
                errcode = '23514',
                message = 'BILLING_MULTIPLE_ACTIVE_INVOICES';
        end if;


        -- Calculation evidence is checked first. Legacy fallback
        -- is used only when the active invoice has no V1 evidence.
        select count(*)
        into v_evidence_count
        from public.rent_invoice_calculations c
        join public.invoices i
          on i.id = c.invoice_id
        where c.lease_id = p_lease_id
          and c.billing_month = v_month
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status;

        if v_evidence_count > 1 then
            raise exception using
                errcode = '23514',
                message = 'BILLING_MULTIPLE_ACTIVE_CALCULATIONS';
        end if;


        if v_active_invoice_count = 1 then
            select i.*
            into v_invoice
            from public.invoices i
            where i.lease_id = p_lease_id
              and i.kind = 'rent'::public.invoice_kind
              and i.status <> 'cancelled'::public.invoice_status
              and date_trunc('month', i.period_start)::date = v_month
            limit 1
            for update;

            select coalesce(sum(il.amount), 0)
            into v_lines_total
            from public.invoice_lines il
            where il.invoice_id = v_invoice.id;


            if v_invoice.period_start is distinct from v_res.period_start
               or v_invoice.period_end is distinct from v_res.period_end
               or v_invoice.amount is distinct from v_res.total_amount
               or v_lines_total is distinct from v_res.total_amount
               or v_invoice.accounting_entry_id is null
               or v_invoice.tenant_id is distinct from v_lease.tenant_id
               or v_invoice.owner_id is distinct from v_lease.owner_id
               or v_invoice.property_id is distinct from v_lease.property_id
               or v_invoice.currency is distinct from 'GNF'
            then
                raise exception using
                    errcode = '23514',
                    message = format(
                        'BILLING_EXISTING_INVOICE_CONFLICT:%s',
                        v_invoice.number
                    );
            end if;


            if v_evidence_count = 1 then
                select c.*
                into v_calc
                from public.rent_invoice_calculations c
                where c.invoice_id = v_invoice.id;

                if not found then
                    raise exception using
                        errcode = '23514',
                        message = 'BILLING_CALCULATION_INVOICE_MISMATCH';
                end if;

                if v_calc.lease_id is distinct from p_lease_id
                   or v_calc.billing_month is distinct from v_res.billing_month
                   or v_calc.billing_context is distinct from v_res.billing_context
                   or v_calc.billing_rule is distinct from v_res.billing_rule
                   or v_calc.policy_version is distinct from v_res.policy_version
                   or v_calc.effective_date is distinct from v_res.effective_date
                   or v_calc.period_start is distinct from v_res.period_start
                   or v_calc.period_end is distinct from v_res.period_end
                   or v_calc.days_in_month is distinct from v_res.days_in_month
                   or v_calc.billed_days is distinct from v_res.billed_days
                   or v_calc.monthly_rent_snapshot
                        is distinct from v_res.monthly_rent_snapshot
                   or v_calc.monthly_charges_snapshot
                        is distinct from v_res.monthly_charges_snapshot
                   or v_calc.rent_amount is distinct from v_res.rent_amount
                   or v_calc.charges_amount is distinct from v_res.charges_amount
                   or v_calc.total_amount is distinct from v_res.total_amount
                then
                    raise exception using
                        errcode = '23514',
                        message = format(
                            'BILLING_EXISTING_CALCULATION_CONFLICT:%s',
                            v_invoice.number
                        );
                end if;
            end if;

            -- A compatible legacy invoice is reused but no
            -- LONG_TERM_C_V1 evidence is fabricated for history.
            v_existing_months :=
                array_append(v_existing_months, v_month);
        else
            if v_evidence_count <> 0 then
                raise exception using
                    errcode = '23514',
                    message = 'BILLING_CALCULATION_INVOICE_MISMATCH';
            end if;
        end if;
    end loop;


    -- ========================================================
    -- 5. PHASE 2 - CREATE MISSING INVOICES
    -- ========================================================

    v_organization_id := public.current_org_id();

    for v_month in
        select generate_series(
            v_start_month,
            v_last_month,
            interval '1 month'
        )::date
    loop
        -- Recheck every candidate month after Phase 1.
        -- This catches an invoice inserted concurrently even for
        -- a month that already had one validated compatible row.
        select count(*)
        into v_active_invoice_count
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start is not null
          and date_trunc('month', i.period_start)::date = v_month;

        if v_month = any(v_existing_months) then
            if v_active_invoice_count <> 1 then
                raise exception using
                    errcode = '40001',
                    message = 'BILLING_CONCURRENT_INVOICE_CONFLICT';
            end if;

            continue;
        end if;

        if v_active_invoice_count <> 0 then
            raise exception using
                errcode = '40001',
                message = 'BILLING_CONCURRENT_INVOICE_CONFLICT';
        end if;


        if v_lease.end_date is not null
           and date_trunc('month', v_lease.end_date)::date = v_month
           and v_lease.end_date <= v_horizon_date
        then
            v_context :=
                'contract_expiration'
                ::public.long_term_rent_billing_context;

            v_effective_date := v_lease.end_date;

        elsif v_month = v_start_month then
            v_context :=
                'lease_start'
                ::public.long_term_rent_billing_context;

            v_effective_date := null;

        else
            v_context :=
                'regular_month'
                ::public.long_term_rent_billing_context;

            v_effective_date := null;
        end if;


        select *
        into v_res
        from public.resolve_long_term_rent_billing(
            v_lease.start_date,
            v_month,
            v_lease.monthly_rent,
            coalesce(v_lease.charges, 0),
            v_context,
            v_effective_date,
            null
        );

        if v_res.resolution_status <> 'resolved' then
            raise exception using
                errcode = '23514',
                message = v_res.resolution_code;
        end if;


        -- ----------------------------------------------------
        -- Contractual due date
        -- ----------------------------------------------------

        v_due_date :=
            public.rent_due_date(
                extract(year from v_month)::integer,
                extract(month from v_month)::integer,
                coalesce(v_lease.due_day, 1)
            );

        if v_due_date < v_lease.start_date then
            v_due_date := v_lease.start_date;
        end if;


        -- ----------------------------------------------------
        -- Invoice
        -- ----------------------------------------------------
        --
        -- Existing AFTER INSERT accounting trigger remains the
        -- single posting path. issue_date is intentionally today.
        -- ----------------------------------------------------

        insert into public.invoices (
            number,
            kind,
            status,

            lease_id,
            tenant_id,
            owner_id,
            property_id,

            issue_date,
            due_date,

            period_start,
            period_end,

            currency,

            amount,
            paid_amount,

            notes,

            organization_id
        )
        values (
            '',

            'rent'::public.invoice_kind,

            case
                when v_due_date < current_date
                    then 'overdue'::public.invoice_status
                else
                    'issued'::public.invoice_status
            end,

            v_lease.id,
            v_lease.tenant_id,
            v_lease.owner_id,
            v_lease.property_id,

            current_date,
            v_due_date,

            v_res.period_start,
            v_res.period_end,

            'GNF',

            v_res.total_amount,
            0,

            case
                when v_res.billing_rule =
                     'prorata'::public.rent_billing_rule
                then format(
                    'Loyer proratisé %s - %s - Policy %s',
                    to_char(v_res.period_start, 'DD/MM/YYYY'),
                    to_char(v_res.period_end, 'DD/MM/YYYY'),
                    v_res.policy_version
                )
                else format(
                    'Loyer %s - Policy %s',
                    to_char(v_month, 'MM/YYYY'),
                    v_res.policy_version
                )
            end,

            v_organization_id
        )
        returning id
        into v_invoice_id;


        -- ----------------------------------------------------
        -- Rent line
        -- ----------------------------------------------------

        insert into public.invoice_lines (
            invoice_id,
            label,
            quantity,
            unit_price,
            amount
        )
        values (
            v_invoice_id,

            case
                when v_res.billing_rule =
                     'prorata'::public.rent_billing_rule
                then format(
                    'Loyer proratisé %s - %s',
                    to_char(v_res.period_start, 'DD/MM/YYYY'),
                    to_char(v_res.period_end, 'DD/MM/YYYY')
                )
                else
                    'Loyer ' || to_char(v_month, 'MM/YYYY')
            end,

            1,
            v_res.rent_amount,
            v_res.rent_amount
        );


        -- ----------------------------------------------------
        -- Charges line
        -- ----------------------------------------------------

        if v_res.charges_amount > 0 then
            insert into public.invoice_lines (
                invoice_id,
                label,
                quantity,
                unit_price,
                amount
            )
            values (
                v_invoice_id,

                case
                    when v_res.billing_rule =
                         'prorata'::public.rent_billing_rule
                    then format(
                        'Charges proratisées %s - %s',
                        to_char(v_res.period_start, 'DD/MM/YYYY'),
                        to_char(v_res.period_end, 'DD/MM/YYYY')
                    )
                    else
                        'Charges ' || to_char(v_month, 'MM/YYYY')
                end,

                1,
                v_res.charges_amount,
                v_res.charges_amount
            );
        end if;


        -- ----------------------------------------------------
        -- Immutable calculation evidence
        -- ----------------------------------------------------
        --
        -- The insert guard verifies:
        --   invoice amount / period
        --   invoice-line total
        --   accounting_entry_id already populated
        -- ----------------------------------------------------

        insert into public.rent_invoice_calculations (
            invoice_id,
            lease_id,
            billing_month,
            billing_context,
            billing_rule,
            policy_version,
            effective_date,
            period_start,
            period_end,
            days_in_month,
            billed_days,
            monthly_rent_snapshot,
            monthly_charges_snapshot,
            rent_amount,
            charges_amount,
            total_amount
        )
        values (
            v_invoice_id,
            v_lease.id,
            v_res.billing_month,
            v_res.billing_context,
            v_res.billing_rule,
            v_res.policy_version,
            v_res.effective_date,
            v_res.period_start,
            v_res.period_end,
            v_res.days_in_month,
            v_res.billed_days,
            v_res.monthly_rent_snapshot,
            v_res.monthly_charges_snapshot,
            v_res.rent_amount,
            v_res.charges_amount,
            v_res.total_amount
        );

        v_created := v_created + 1;
    end loop;


    return v_created;
end;
$function$;


comment on function public.generate_lease_rent_invoices(uuid, date) is
'Generates missing long-term rent invoices atomically using Policy LONG_TERM_C_V1. Existing compatible invoices are reused; legacy invoices are never backfilled with fabricated V1 calculation evidence.';


-- Explicit API permissions: staff authentication is still checked
-- inside the SECURITY DEFINER function.
revoke execute
on function public.generate_lease_rent_invoices(uuid, date)
from public, anon;

grant execute
on function public.generate_lease_rent_invoices(uuid, date)
to authenticated, service_role;



-- ============================================================
-- GENERATE ALL - STRICT FAIL-FAST
-- ============================================================

create or replace function public.generate_all_rent_invoices(
    p_through_date date default current_date
)
returns table (
    lease_id uuid,
    invoices_created integer
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease record;
    v_count integer;
    v_horizon_date date;
    v_current_month date;
begin
    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    if p_through_date is null then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_THROUGH_DATE';
    end if;

    v_current_month := date_trunc('month', current_date)::date;

    if date_trunc('month', p_through_date)::date > v_current_month then
        raise exception using
            errcode = '23514',
            message = 'BILLING_FUTURE_MONTH';
    end if;

    v_horizon_date := least(p_through_date, current_date);

    -- Fail-fast is intentional: any lease conflict aborts the
    -- complete batch call and therefore rolls back batch writes.
    for v_lease in
        select l.id
        from public.leases l
        where l.status = 'active'::public.lease_status
          and l.periodicity = 'monthly'
          and l.start_date <= v_horizon_date
        order by l.id
    loop
        v_count :=
            public.generate_lease_rent_invoices(
                v_lease.id,
                v_horizon_date
            );

        lease_id := v_lease.id;
        invoices_created := v_count;

        return next;
    end loop;
end;
$function$;


comment on function public.generate_all_rent_invoices(date) is
'Strict fail-fast batch generator for active monthly leases using generate_lease_rent_invoices().';


revoke execute
on function public.generate_all_rent_invoices(date)
from public, anon;

grant execute
on function public.generate_all_rent_invoices(date)
to authenticated, service_role;


commit;
