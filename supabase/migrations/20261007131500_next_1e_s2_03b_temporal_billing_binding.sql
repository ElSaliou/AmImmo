-- ============================================================
-- AMIMMO NEXT-1E — S2-03B
-- TEMPORAL BILLING BINDING
--
-- Baseline Git:
-- 03f471332b20338248bdf541de136bc9780a1752
--
-- Scope:
-- - bind monthly rent generation to lease_term_versions
-- - bind Policy-C final invoice calculation to lease_term_versions
-- - bind expiration/termination previews to lease_term_versions
-- - bind final-invoice exit guard to lease_term_versions
--
-- Deliberately unchanged in S2-03B:
-- - resolve_long_term_rent_billing() pure Policy-C calculator
-- - generate_all_rent_invoices() orchestration
-- - lease lifecycle snapshot/application semantics (S2-04)
-- - historical invoices / accounting / calculation evidence
-- ============================================================

begin;

-- ============================================================
-- 1. MONTHLY RENT GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_lease_rent_invoices(p_lease_id uuid, p_through_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_lease public.leases%rowtype;
    v_invoice public.invoices%rowtype;
    v_calc public.rent_invoice_calculations%rowtype;
    v_res record;
    v_terms record;

    v_horizon_date date;
    v_terms_lookup_date date;
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

    -- A lease that has not started yet produces no invoice.
    if v_lease.start_date > v_horizon_date then
        return 0;
    end if;

    -- Temporal term history is canonical for versioned terms.
    select *
    into v_terms
    from public.resolve_lease_terms_at_date(
        p_lease_id,
        v_horizon_date
    );

    if coalesce(v_terms.monthly_rent, 0) <= 0 then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_RENT';
    end if;

    if coalesce(v_terms.charges, 0) < 0 then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_CHARGES';
    end if;

    v_start_month := date_trunc('month', v_lease.start_date)::date;

    v_last_month :=
        date_trunc(
            'month',
            least(
                v_horizon_date,
                coalesce(v_terms.end_date, v_horizon_date)
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
        -- Temporal terms + context resolution
        -- ----------------------------------------------------

        v_terms_lookup_date :=
            least(
                (v_month + interval '1 month' - interval '1 day')::date,
                v_horizon_date
            );

        select *
        into v_terms
        from public.resolve_lease_terms_at_date(
            p_lease_id,
            v_terms_lookup_date
        );

        if v_terms.end_date is not null
           and date_trunc('month', v_terms.end_date)::date = v_month
           and v_terms.end_date <= v_horizon_date
        then
            v_context :=
                'contract_expiration'
                ::public.long_term_rent_billing_context;

            v_effective_date := v_terms.end_date;

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
            v_terms.monthly_rent,
            coalesce(v_terms.charges, 0),
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


        v_terms_lookup_date :=
            least(
                (v_month + interval '1 month' - interval '1 day')::date,
                v_horizon_date
            );

        select *
        into v_terms
        from public.resolve_lease_terms_at_date(
            p_lease_id,
            v_terms_lookup_date
        );

        if v_terms.end_date is not null
           and date_trunc('month', v_terms.end_date)::date = v_month
           and v_terms.end_date <= v_horizon_date
        then
            v_context :=
                'contract_expiration'
                ::public.long_term_rent_billing_context;

            v_effective_date := v_terms.end_date;

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
            v_terms.monthly_rent,
            coalesce(v_terms.charges, 0),
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
                coalesce(v_terms.due_day, 1)
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


-- ============================================================
-- 2. POLICY-C FINAL INVOICE HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_lease_final_rent_invoice(p_lease_id uuid, p_effective_date date, p_billing_context long_term_rent_billing_context, p_requested_rule rent_billing_rule DEFAULT NULL::rent_billing_rule)
 RETURNS TABLE(invoice_id uuid, invoice_number text, invoice_amount numeric, period_start date, period_end date, reused boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_lease public.leases%rowtype;
    v_invoice public.invoices%rowtype;
    v_res record;
    v_terms record;

    v_billing_month date;
    v_previous_month_end date;

    v_active_invoice_count integer;
    v_lines_total numeric;

    v_due_date date;
    v_invoice_id uuid;
    v_invoice_number text;

    v_organization_id uuid;
begin
    -- --------------------------------------------------------
    -- Security
    -- --------------------------------------------------------

    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;


    -- --------------------------------------------------------
    -- Lease + transactional lock
    -- --------------------------------------------------------

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
        raise exception using
            errcode = '23514',
            message = 'La facture finale ne peut être calculée que pour un bail actif.';
    end if;

    if v_lease.periodicity <> 'monthly' then
        raise exception using
            errcode = '23514',
            message = format(
                'Périodicité non prise en charge : %s.',
                v_lease.periodicity
            );
    end if;

    if p_effective_date is null then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_EFFECTIVE_DATE';
    end if;

    if p_effective_date < v_lease.start_date
       or p_effective_date > current_date
    then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_EFFECTIVE_DATE';
    end if;

    select *
    into v_terms
    from public.resolve_lease_terms_at_date(
        p_lease_id,
        p_effective_date
    );

    if p_billing_context not in (
        'contract_expiration'::public.long_term_rent_billing_context,
        'termination_landlord'::public.long_term_rent_billing_context,
        'termination_tenant'::public.long_term_rent_billing_context,
        'termination_mutual'::public.long_term_rent_billing_context
    ) then
        raise exception using
            errcode = '23514',
            message = 'BILLING_CONTEXT_MISMATCH';
    end if;


    -- --------------------------------------------------------
    -- Context / legal-date consistency
    -- --------------------------------------------------------

    if p_billing_context =
       'contract_expiration'::public.long_term_rent_billing_context
    then
        if v_terms.end_date is null
           or p_effective_date is distinct from v_terms.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_CONTEXT_MISMATCH';
        end if;
    else
        -- Early termination must be strictly before contractual
        -- end date when the lease has one.
        if v_terms.end_date is not null
           and p_effective_date >= v_terms.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_TERMINATION_NOT_EARLY';
        end if;
    end if;


    -- --------------------------------------------------------
    -- Policy C resolver
    -- --------------------------------------------------------

    v_billing_month :=
        date_trunc('month', p_effective_date)::date;

    select *
    into v_res
    from public.resolve_long_term_rent_billing(
        v_lease.start_date,
        v_billing_month,
        v_terms.monthly_rent,
        coalesce(v_terms.charges, 0),
        p_billing_context,
        p_effective_date,
        p_requested_rule
    );

    if v_res.resolution_status <> 'resolved' then
        raise exception using
            errcode = '23514',
            message = v_res.resolution_code;
    end if;


    -- --------------------------------------------------------
    -- No rent invoice may exist in a later billing month.
    -- Same-month full-month billing may legitimately extend
    -- beyond the effective exit date.
    -- --------------------------------------------------------

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

    if exists (
        select 1
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and date_trunc('month', i.period_start)::date
                > v_res.billing_month
    ) then
        raise exception using
            errcode = '23514',
            message = 'BILLING_LATER_INVOICE_REQUIRES_REGULARIZATION';
    end if;


    -- --------------------------------------------------------
    -- Generate only missing PRIOR months.
    -- The exit month is handled below with the exact Policy-C
    -- context resolved above.
    -- --------------------------------------------------------

    v_previous_month_end :=
        v_res.billing_month - 1;

    if v_previous_month_end >= v_lease.start_date then
        perform public.generate_lease_rent_invoices(
            p_lease_id,
            v_previous_month_end
        );
    end if;


    -- --------------------------------------------------------
    -- Existing invoice identity = lease + billing month
    -- --------------------------------------------------------

    select count(*)
    into v_active_invoice_count
    from public.invoices i
    where i.lease_id = p_lease_id
      and i.kind = 'rent'::public.invoice_kind
      and i.status <> 'cancelled'::public.invoice_status
      and i.period_start is not null
      and date_trunc('month', i.period_start)::date
            = v_res.billing_month;

    if v_active_invoice_count > 1 then
        raise exception using
            errcode = '23514',
            message = 'BILLING_MULTIPLE_ACTIVE_INVOICES';
    end if;


    if v_active_invoice_count = 1 then
        select i.*
        into v_invoice
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and date_trunc('month', i.period_start)::date
                = v_res.billing_month
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

        return query
        select
            v_invoice.id,
            v_invoice.number,
            v_invoice.amount,
            v_invoice.period_start,
            v_invoice.period_end,
            true;

        return;
    end if;


    -- --------------------------------------------------------
    -- Contractual due date / current creation date
    -- --------------------------------------------------------

    v_due_date :=
        public.rent_due_date(
            extract(year from v_res.billing_month)::integer,
            extract(month from v_res.billing_month)::integer,
            coalesce(v_terms.due_day, 1)
        );

    if v_due_date < v_lease.start_date then
        v_due_date := v_lease.start_date;
    end if;

    v_organization_id :=
        public.current_org_id();


    -- --------------------------------------------------------
    -- Create final invoice
    -- Accounting is posted by the existing AFTER INSERT trigger.
    -- --------------------------------------------------------

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

        format(
            'Facture finale - contexte %s - règle %s - Policy %s - date effective %s',
            v_res.billing_context,
            v_res.billing_rule,
            v_res.policy_version,
            to_char(p_effective_date, 'DD/MM/YYYY')
        ),

        v_organization_id
    )
    returning
        public.invoices.id,
        public.invoices.number
    into
        v_invoice_id,
        v_invoice_number;


    -- --------------------------------------------------------
    -- Rent line
    -- --------------------------------------------------------

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
                'Loyer ' || to_char(v_res.billing_month, 'MM/YYYY')
        end,

        1,
        v_res.rent_amount,
        v_res.rent_amount
    );


    -- --------------------------------------------------------
    -- Charges line
    -- --------------------------------------------------------

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
                    'Charges ' || to_char(v_res.billing_month, 'MM/YYYY')
            end,

            1,
            v_res.charges_amount,
            v_res.charges_amount
        );
    end if;


    -- --------------------------------------------------------
    -- Immutable Policy-C calculation evidence
    -- --------------------------------------------------------

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


    return query
    select
        v_invoice_id,
        v_invoice_number,
        v_res.total_amount,
        v_res.period_start,
        v_res.period_end,
        false;
end;
$function$;


-- ============================================================
-- 3. EXPIRATION PREVIEW
-- ============================================================

CREATE OR REPLACE FUNCTION public.preview_lease_expiration_billing(p_lease_id uuid)
 RETURNS TABLE(resolution_status text, resolution_code text, billing_month date, billing_context long_term_rent_billing_context, billing_rule rent_billing_rule, policy_version text, effective_date date, period_start date, period_end date, days_in_month integer, billed_days integer, monthly_rent_snapshot numeric, monthly_charges_snapshot numeric, rent_amount numeric, charges_amount numeric, total_amount numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_lease public.leases%rowtype;
    v_terms record;
begin
    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    select l.*
    into v_lease
    from public.leases l
    where l.id = p_lease_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Bail introuvable.';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        raise exception using
            errcode = '23514',
            message = 'Seul un bail actif peut être expiré.';
    end if;

    select *
    into v_terms
    from public.resolve_lease_terms_at_date(
        p_lease_id,
        greatest(current_date, v_lease.start_date)
    );

    if v_terms.end_date is null then
        raise exception using
            errcode = '23514',
            message = 'Un bail sans date de fin contractuelle ne peut pas être expiré.';
    end if;

    if v_terms.end_date > current_date then
        raise exception using
            errcode = '23514',
            message = 'Le bail ne peut pas être expiré avant sa date de fin contractuelle.';
    end if;

    return query
    select *
    from public.resolve_long_term_rent_billing(
        v_lease.start_date,
        date_trunc('month', v_terms.end_date)::date,
        v_terms.monthly_rent,
        coalesce(v_terms.charges, 0),
        'contract_expiration'
            ::public.long_term_rent_billing_context,
        v_terms.end_date,
        null
    );
end;
$function$;


-- ============================================================
-- 4. TERMINATION PREVIEW
-- ============================================================

CREATE OR REPLACE FUNCTION public.preview_lease_termination_billing(p_lease_id uuid, p_termination_date date, p_initiator lease_termination_initiator, p_billing_rule rent_billing_rule)
 RETURNS TABLE(resolution_status text, resolution_code text, billing_month date, billing_context long_term_rent_billing_context, billing_rule rent_billing_rule, policy_version text, effective_date date, period_start date, period_end date, days_in_month integer, billed_days integer, monthly_rent_snapshot numeric, monthly_charges_snapshot numeric, rent_amount numeric, charges_amount numeric, total_amount numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_lease public.leases%rowtype;
    v_terms record;
    v_context public.long_term_rent_billing_context;
    v_requested_rule public.rent_billing_rule;
begin
    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    select l.*
    into v_lease
    from public.leases l
    where l.id = p_lease_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Bail introuvable.';
    end if;

    if v_lease.status <> 'active'::public.lease_status then
        raise exception using
            errcode = '23514',
            message = 'Seul un bail actif peut être résilié.';
    end if;

    if p_termination_date is null
       or p_termination_date < v_lease.start_date
       or p_termination_date > current_date
    then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_EFFECTIVE_DATE';
    end if;

    select *
    into v_terms
    from public.resolve_lease_terms_at_date(
        p_lease_id,
        p_termination_date
    );

    if v_terms.end_date is not null
       and p_termination_date >= v_terms.end_date
    then
        raise exception using
            errcode = '23514',
            message = 'BILLING_TERMINATION_NOT_EARLY';
    end if;

    if p_initiator is null then
        raise exception using
            errcode = '23514',
            message = 'TERMINATION_POLICY_REQUIRED';
    end if;

    if p_billing_rule is null then
        raise exception using
            errcode = '23514',
            message =
                case
                    when p_initiator =
                         'mutual_agreement'::public.lease_termination_initiator
                    then 'BILLING_MUTUAL_RULE_REQUIRED'
                    else 'TERMINATION_POLICY_REQUIRED'
                end;
    end if;

    if p_initiator =
       'landlord'::public.lease_termination_initiator
    then
        if p_billing_rule <>
           'prorata'::public.rent_billing_rule
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_RULE_NOT_ALLOWED';
        end if;

        v_context :=
            'termination_landlord'
            ::public.long_term_rent_billing_context;

        v_requested_rule := null;

    elsif p_initiator =
          'tenant'::public.lease_termination_initiator
    then
        if p_billing_rule <>
           'full_month'::public.rent_billing_rule
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_RULE_NOT_ALLOWED';
        end if;

        v_context :=
            'termination_tenant'
            ::public.long_term_rent_billing_context;

        v_requested_rule := null;

    elsif p_initiator =
          'mutual_agreement'
          ::public.lease_termination_initiator
    then
        if p_billing_rule not in (
            'prorata'::public.rent_billing_rule,
            'full_month'::public.rent_billing_rule
        ) then
            raise exception using
                errcode = '23514',
                message = 'BILLING_MUTUAL_RULE_REQUIRED';
        end if;

        v_context :=
            'termination_mutual'
            ::public.long_term_rent_billing_context;

        v_requested_rule := p_billing_rule;

    else
        raise exception using
            errcode = '23514',
            message = 'TERMINATION_POLICY_REQUIRED';
    end if;

    return query
    select *
    from public.resolve_long_term_rent_billing(
        v_lease.start_date,
        date_trunc('month', p_termination_date)::date,
        v_terms.monthly_rent,
        coalesce(v_terms.charges, 0),
        v_context,
        p_termination_date,
        v_requested_rule
    );
end;
$function$;


-- ============================================================
-- 5. EXIT FINAL-INVOICE GUARD
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_lease_exit_final_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_effective_date date;
    v_billing_context public.long_term_rent_billing_context;
    v_requested_rule public.rent_billing_rule;

    v_res record;
    v_terms record;
    v_invoice public.invoices%rowtype;

    v_active_invoice_count integer;
    v_lines_total numeric;
begin
    if old.status <> 'active'::public.lease_status
       or new.status not in (
            'terminated'::public.lease_status,
            'expired'::public.lease_status
       )
    then
        return new;
    end if;


    -- --------------------------------------------------------
    -- Resolve legal exit context
    -- --------------------------------------------------------

    if new.status = 'expired'::public.lease_status then
        select *
        into v_terms
        from public.resolve_lease_terms_at_date(
            new.id,
            greatest(current_date, new.start_date)
        );

        if v_terms.end_date is null then
            raise exception using
                errcode = '23514',
                message = 'La date effective de sortie du bail est obligatoire.';
        end if;

        v_effective_date := v_terms.end_date;

        v_billing_context :=
            'contract_expiration'
            ::public.long_term_rent_billing_context;

        v_requested_rule := null;

    else
        if new.termination_date is null
           or new.termination_initiator is null
        then
            raise exception using
                errcode = '23514',
                message = 'TERMINATION_POLICY_REQUIRED';
        end if;

        if new.termination_date < new.start_date
           or new.termination_date > current_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_INVALID_EFFECTIVE_DATE';
        end if;

        select *
        into v_terms
        from public.resolve_lease_terms_at_date(
            new.id,
            new.termination_date
        );

        if new.termination_billing_rule is null then
            raise exception using
                errcode = '23514',
                message =
                    case
                        when new.termination_initiator =
                             'mutual_agreement'::public.lease_termination_initiator
                        then 'BILLING_MUTUAL_RULE_REQUIRED'
                        else 'TERMINATION_POLICY_REQUIRED'
                    end;
        end if;

        if v_terms.end_date is not null
           and new.termination_date >= v_terms.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_TERMINATION_NOT_EARLY';
        end if;

        v_effective_date :=
            new.termination_date;

        if new.termination_initiator =
           'landlord'::public.lease_termination_initiator
        then
            if new.termination_billing_rule <>
               'prorata'::public.rent_billing_rule
            then
                raise exception using
                    errcode = '23514',
                    message = 'BILLING_RULE_NOT_ALLOWED';
            end if;

            v_billing_context :=
                'termination_landlord'
                ::public.long_term_rent_billing_context;

            v_requested_rule := null;

        elsif new.termination_initiator =
              'tenant'::public.lease_termination_initiator
        then
            if new.termination_billing_rule <>
               'full_month'::public.rent_billing_rule
            then
                raise exception using
                    errcode = '23514',
                    message = 'BILLING_RULE_NOT_ALLOWED';
            end if;

            v_billing_context :=
                'termination_tenant'
                ::public.long_term_rent_billing_context;

            v_requested_rule := null;

        elsif new.termination_initiator =
              'mutual_agreement'
              ::public.lease_termination_initiator
        then
            v_billing_context :=
                'termination_mutual'
                ::public.long_term_rent_billing_context;

            v_requested_rule :=
                new.termination_billing_rule;

        else
            raise exception using
                errcode = '23514',
                message = 'TERMINATION_POLICY_REQUIRED';
        end if;
    end if;


    -- --------------------------------------------------------
    -- Resolve expected Policy-C financial shape
    -- --------------------------------------------------------

    select *
    into v_res
    from public.resolve_long_term_rent_billing(
        new.start_date,
        date_trunc('month', v_effective_date)::date,
        v_terms.monthly_rent,
        coalesce(v_terms.charges, 0),
        v_billing_context,
        v_effective_date,
        v_requested_rule
    );

    if v_res.resolution_status <> 'resolved' then
        raise exception using
            errcode = '23514',
            message = v_res.resolution_code;
    end if;


    if v_effective_date < new.start_date
       or v_effective_date > current_date
    then
        raise exception using
            errcode = '23514',
            message = 'BILLING_INVALID_EFFECTIVE_DATE';
    end if;


    -- Active invoices without a canonical period can never
    -- satisfy an exit transition safely.
    if exists (
        select 1
        from public.invoices i
        where i.lease_id = new.id
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


    -- Later billing months require explicit accounting
    -- regularization before lease closure.
    if exists (
        select 1
        from public.invoices i
        where i.lease_id = new.id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and date_trunc('month', i.period_start)::date
                > v_res.billing_month
    ) then
        raise exception using
            errcode = '23514',
            message = 'BILLING_LATER_INVOICE_REQUIRES_REGULARIZATION';
    end if;


    select count(*)
    into v_active_invoice_count
    from public.invoices i
    where i.lease_id = new.id
      and i.kind = 'rent'::public.invoice_kind
      and i.status <> 'cancelled'::public.invoice_status
      and i.period_start is not null
      and date_trunc('month', i.period_start)::date
            = v_res.billing_month;

    if v_active_invoice_count <> 1 then
        raise exception using
            errcode = '23514',
            message = 'La sortie du bail exige d''abord une facture finale de loyer conforme.';
    end if;


    select i.*
    into v_invoice
    from public.invoices i
    where i.lease_id = new.id
      and i.kind = 'rent'::public.invoice_kind
      and i.status <> 'cancelled'::public.invoice_status
      and date_trunc('month', i.period_start)::date
            = v_res.billing_month
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
       or v_invoice.tenant_id is distinct from new.tenant_id
       or v_invoice.owner_id is distinct from new.owner_id
       or v_invoice.property_id is distinct from new.property_id
       or v_invoice.currency is distinct from 'GNF'
    then
        raise exception using
            errcode = '23514',
            message = format(
                'BILLING_EXISTING_INVOICE_CONFLICT:%s',
                v_invoice.number
            );
    end if;


    return new;
end;
$function$;


commit;
