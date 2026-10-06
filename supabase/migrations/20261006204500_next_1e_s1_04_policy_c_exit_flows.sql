-- ============================================================
-- AMIMMO NEXT-1E-S1-04
-- POLICY C EXIT FLOWS
-- DRAFT FOR REVIEW - DO NOT APPLY YET
-- ============================================================
--
-- Policy LONG_TERM_C_V1:
--   * contractual expiration        -> full month
--   * landlord early termination    -> prorata
--   * tenant early termination      -> full month
--   * mutual early termination      -> explicit prorata/full_month
--
-- This migration:
--   * adds a Policy-C-aware final-invoice helper overload
--   * makes the legacy 2-arg helper non-executable by API roles
--   * adds the new mandatory-policy termination RPC overload
--   * keeps the legacy 3-arg termination RPC as a safe blocker
--   * updates contractual expiration to full-month Policy C
--   * replaces the old prorata-only exit guard
--   * hardens terminal lease metadata immutability
--   * keeps debt outside the exit-blocking criteria
--
-- It intentionally does NOT modify:
--   * historical invoices
--   * historical terminated lease BAIL-2026-0100
--   * payment balances / receivables
--   * post_rent_invoice_to_accounting()
-- ============================================================

begin;


-- ============================================================
-- 1. POLICY-C-AWARE FINAL INVOICE HELPER
-- ============================================================

create or replace function public.ensure_lease_final_rent_invoice(
    p_lease_id uuid,
    p_effective_date date,
    p_billing_context public.long_term_rent_billing_context,
    p_requested_rule public.rent_billing_rule default null
)
returns table (
    invoice_id uuid,
    invoice_number text,
    invoice_amount numeric,
    period_start date,
    period_end date,
    reused boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_invoice public.invoices%rowtype;
    v_res record;

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
        if v_lease.end_date is null
           or p_effective_date is distinct from v_lease.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_CONTEXT_MISMATCH';
        end if;
    else
        -- Early termination must be strictly before contractual
        -- end date when the lease has one.
        if v_lease.end_date is not null
           and p_effective_date >= v_lease.end_date
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
        v_lease.monthly_rent,
        coalesce(v_lease.charges, 0),
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
            coalesce(v_lease.due_day, 1)
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


comment on function public.ensure_lease_final_rent_invoice(
    uuid,
    date,
    public.long_term_rent_billing_context,
    public.rent_billing_rule
) is
'Internal Policy-C final-rent helper. Requires an explicit exit billing context; mutual termination additionally requires an explicit requested rule.';


revoke execute
on function public.ensure_lease_final_rent_invoice(
    uuid,
    date,
    public.long_term_rent_billing_context,
    public.rent_billing_rule
)
from public, anon, authenticated, service_role;



-- ============================================================
-- 2. LEGACY 2-ARG HELPER: SAFE BLOCKER
-- ============================================================

create or replace function public.ensure_lease_final_rent_invoice(
    p_lease_id uuid,
    p_exit_date date
)
returns table (
    invoice_id uuid,
    invoice_number text,
    invoice_amount numeric,
    period_start date,
    period_end date,
    reused boolean
)
language plpgsql
security definer
set search_path = public
as $function$
begin
    raise exception using
        errcode = '23514',
        message = 'BILLING_EXIT_CONTEXT_REQUIRED';
end;
$function$;


comment on function public.ensure_lease_final_rent_invoice(uuid, date) is
'Deprecated compatibility blocker. Exit invoices must use the Policy-C context-aware helper.';


revoke execute
on function public.ensure_lease_final_rent_invoice(uuid, date)
from public, anon, authenticated, service_role;



-- ============================================================
-- 3. LEASE STATUS / TERMINATION METADATA GUARD
-- ============================================================

create or replace function public.guard_lease_status_transition()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
    -- --------------------------------------------------------
    -- INSERT
    -- --------------------------------------------------------

    if tg_op = 'INSERT' then
        if new.status <> 'pending'::public.lease_status then
            raise exception using
                errcode = '23514',
                message = 'Un nouveau bail doit être créé avec le statut en attente.';
        end if;

        if new.termination_date is not null
           or new.termination_reason is not null
           or new.termination_initiator is not null
           or new.termination_billing_rule is not null
        then
            raise exception using
                errcode = '23514',
                message = 'Un nouveau bail ne peut pas contenir de données de résiliation.';
        end if;

        return new;
    end if;


    -- --------------------------------------------------------
    -- Common update validation
    -- --------------------------------------------------------

    if new.termination_date is not null
       and new.termination_date > current_date
    then
        raise exception using
            errcode = '23514',
            message = 'La date de résiliation ne peut pas être future.';
    end if;


    -- --------------------------------------------------------
    -- Terminal states are historically immutable
    -- --------------------------------------------------------

    if old.status = 'terminated'::public.lease_status then
        if new.status <> 'terminated'::public.lease_status then
            raise exception using
                errcode = '23514',
                message = 'Un bail résilié ne peut pas changer de statut.';
        end if;

        if new.termination_date
                is distinct from old.termination_date
           or new.termination_reason
                is distinct from old.termination_reason
           or new.termination_initiator
                is distinct from old.termination_initiator
           or new.termination_billing_rule
                is distinct from old.termination_billing_rule
           or new.end_date
                is distinct from old.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'Les données historiques d''un bail résilié ne peuvent plus être modifiées.';
        end if;

        return new;
    end if;


    if old.status = 'expired'::public.lease_status then
        if new.status <> 'expired'::public.lease_status then
            raise exception using
                errcode = '23514',
                message = 'Un bail expiré ne peut pas changer de statut.';
        end if;

        if new.end_date is distinct from old.end_date then
            raise exception using
                errcode = '23514',
                message = 'La date de fin contractuelle d''un bail expiré ne peut plus être modifiée.';
        end if;

        return new;
    end if;


    -- --------------------------------------------------------
    -- Update without status change
    -- --------------------------------------------------------

    if old.status = new.status then
        return new;
    end if;


    -- --------------------------------------------------------
    -- PENDING -> ACTIVE
    -- --------------------------------------------------------

    if old.status = 'pending'::public.lease_status
       and new.status = 'active'::public.lease_status
    then
        return new;
    end if;


    -- --------------------------------------------------------
    -- ACTIVE -> EXPIRED
    -- --------------------------------------------------------

    if old.status = 'active'::public.lease_status
       and new.status = 'expired'::public.lease_status
    then
        if new.end_date is null then
            raise exception using
                errcode = '23514',
                message = 'Une date de fin contractuelle est obligatoire pour expirer le bail.';
        end if;

        if new.end_date > current_date then
            raise exception using
                errcode = '23514',
                message = 'Un bail ne peut pas être marqué expiré avant sa date de fin.';
        end if;

        if new.termination_initiator is not null
           or new.termination_billing_rule is not null
        then
            raise exception using
                errcode = '23514',
                message = 'Une expiration contractuelle ne doit pas contenir de politique de résiliation.';
        end if;

        return new;
    end if;


    -- --------------------------------------------------------
    -- ACTIVE -> TERMINATED
    -- --------------------------------------------------------

    if old.status = 'active'::public.lease_status
       and new.status = 'terminated'::public.lease_status
    then
        if new.termination_date is null then
            raise exception using
                errcode = '23514',
                message = 'La date effective de résiliation est obligatoire.';
        end if;

        if new.termination_initiator is null then
            raise exception using
                errcode = '23514',
                message = 'TERMINATION_POLICY_REQUIRED';
        end if;

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

        if new.end_date is not null
           and new.termination_date >= new.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_TERMINATION_NOT_EARLY';
        end if;

        if new.termination_initiator =
               'landlord'::public.lease_termination_initiator
           and new.termination_billing_rule <>
               'prorata'::public.rent_billing_rule
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_RULE_NOT_ALLOWED';
        end if;

        if new.termination_initiator =
               'tenant'::public.lease_termination_initiator
           and new.termination_billing_rule <>
               'full_month'::public.rent_billing_rule
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_RULE_NOT_ALLOWED';
        end if;

        if new.termination_initiator =
               'mutual_agreement'::public.lease_termination_initiator
           and new.termination_billing_rule not in (
               'prorata'::public.rent_billing_rule,
               'full_month'::public.rent_billing_rule
           )
        then
            raise exception using
                errcode = '23514',
                message = 'BILLING_MUTUAL_RULE_REQUIRED';
        end if;

        return new;
    end if;


    raise exception using
        errcode = '23514',
        message = format(
            'Transition de statut de bail interdite : %s -> %s.',
            old.status,
            new.status
        );
end;
$function$;


drop trigger if exists trg_guard_lease_status_transition
on public.leases;

create trigger trg_guard_lease_status_transition
before update of
    status,
    termination_date,
    termination_reason,
    termination_initiator,
    termination_billing_rule,
    end_date
on public.leases
for each row
execute function public.guard_lease_status_transition();



-- ============================================================
-- 4. POLICY-C EXIT FINAL-INVOICE GUARD
-- ============================================================

create or replace function public.guard_lease_exit_final_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_effective_date date;
    v_billing_context public.long_term_rent_billing_context;
    v_requested_rule public.rent_billing_rule;

    v_res record;
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
        if new.end_date is null then
            raise exception using
                errcode = '23514',
                message = 'La date effective de sortie du bail est obligatoire.';
        end if;

        v_effective_date := new.end_date;

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

        if new.end_date is not null
           and new.termination_date >= new.end_date
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
        new.monthly_rent,
        coalesce(new.charges, 0),
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



-- ============================================================
-- 5. READ-ONLY EXIT BILLING PREVIEWS
-- ============================================================

create or replace function public.preview_lease_termination_billing(
    p_lease_id uuid,
    p_termination_date date,
    p_initiator public.lease_termination_initiator,
    p_billing_rule public.rent_billing_rule
)
returns table (
    resolution_status text,
    resolution_code text,
    billing_month date,
    billing_context public.long_term_rent_billing_context,
    billing_rule public.rent_billing_rule,
    policy_version text,
    effective_date date,
    period_start date,
    period_end date,
    days_in_month integer,
    billed_days integer,
    monthly_rent_snapshot numeric,
    monthly_charges_snapshot numeric,
    rent_amount numeric,
    charges_amount numeric,
    total_amount numeric
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
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

    if v_lease.end_date is not null
       and p_termination_date >= v_lease.end_date
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
        v_lease.monthly_rent,
        coalesce(v_lease.charges, 0),
        v_context,
        p_termination_date,
        v_requested_rule
    );
end;
$function$;


revoke execute
on function public.preview_lease_termination_billing(
    uuid,
    date,
    public.lease_termination_initiator,
    public.rent_billing_rule
)
from public, anon;

grant execute
on function public.preview_lease_termination_billing(
    uuid,
    date,
    public.lease_termination_initiator,
    public.rent_billing_rule
)
to authenticated, service_role;


create or replace function public.preview_lease_expiration_billing(
    p_lease_id uuid
)
returns table (
    resolution_status text,
    resolution_code text,
    billing_month date,
    billing_context public.long_term_rent_billing_context,
    billing_rule public.rent_billing_rule,
    policy_version text,
    effective_date date,
    period_start date,
    period_end date,
    days_in_month integer,
    billed_days integer,
    monthly_rent_snapshot numeric,
    monthly_charges_snapshot numeric,
    rent_amount numeric,
    charges_amount numeric,
    total_amount numeric
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
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

    if v_lease.end_date is null then
        raise exception using
            errcode = '23514',
            message = 'Un bail sans date de fin contractuelle ne peut pas être expiré.';
    end if;

    if v_lease.end_date > current_date then
        raise exception using
            errcode = '23514',
            message = 'Le bail ne peut pas être expiré avant sa date de fin contractuelle.';
    end if;

    return query
    select *
    from public.resolve_long_term_rent_billing(
        v_lease.start_date,
        date_trunc('month', v_lease.end_date)::date,
        v_lease.monthly_rent,
        coalesce(v_lease.charges, 0),
        'contract_expiration'
            ::public.long_term_rent_billing_context,
        v_lease.end_date,
        null
    );
end;
$function$;


revoke execute
on function public.preview_lease_expiration_billing(uuid)
from public, anon;

grant execute
on function public.preview_lease_expiration_billing(uuid)
to authenticated, service_role;



-- ============================================================
-- 6. NEW POLICY-C TERMINATION RPC
-- ============================================================

create or replace function public.terminate_lease_with_final_invoice(
    p_lease_id uuid,
    p_termination_date date,
    p_initiator public.lease_termination_initiator,
    p_billing_rule public.rent_billing_rule,
    p_reason text default null
)
returns table (
    lease_id uuid,
    lease_reference text,
    lease_status public.lease_status,
    termination_date date,
    final_invoice_id uuid,
    final_invoice_number text,
    final_invoice_amount numeric,
    invoice_reused boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_final record;

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

    if v_lease.end_date is not null
       and p_termination_date >= v_lease.end_date
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

        v_requested_rule :=
            p_billing_rule;

    else
        raise exception using
            errcode = '23514',
            message = 'TERMINATION_POLICY_REQUIRED';
    end if;


    select *
    into v_final
    from public.ensure_lease_final_rent_invoice(
        p_lease_id,
        p_termination_date,
        v_context,
        v_requested_rule
    );


    update public.leases l
    set
        status =
            'terminated'::public.lease_status,

        termination_date =
            p_termination_date,

        termination_reason =
            nullif(
                btrim(
                    coalesce(
                        p_reason,
                        ''
                    )
                ),
                ''
            ),

        termination_initiator =
            p_initiator,

        termination_billing_rule =
            p_billing_rule
    where l.id = p_lease_id;


    return query
    select
        v_lease.id,
        v_lease.reference,
        'terminated'::public.lease_status,
        p_termination_date,
        v_final.invoice_id,
        v_final.invoice_number,
        v_final.invoice_amount,
        v_final.reused;
end;
$function$;


comment on function public.terminate_lease_with_final_invoice(
    uuid,
    date,
    public.lease_termination_initiator,
    public.rent_billing_rule,
    text
) is
'Terminates an active lease under LONG_TERM_C_V1. Initiator and billing rule are mandatory; fixed-term termination must be strictly before end_date.';


revoke execute
on function public.terminate_lease_with_final_invoice(
    uuid,
    date,
    public.lease_termination_initiator,
    public.rent_billing_rule,
    text
)
from public, anon;

grant execute
on function public.terminate_lease_with_final_invoice(
    uuid,
    date,
    public.lease_termination_initiator,
    public.rent_billing_rule,
    text
)
to authenticated, service_role;



-- ============================================================
-- 7. LEGACY 3-ARG TERMINATION RPC: SAFE BLOCKER
-- ============================================================

create or replace function public.terminate_lease_with_final_invoice(
    p_lease_id uuid,
    p_termination_date date,
    p_reason text default null
)
returns table (
    lease_id uuid,
    lease_reference text,
    lease_status public.lease_status,
    termination_date date,
    final_invoice_id uuid,
    final_invoice_number text,
    final_invoice_amount numeric,
    invoice_reused boolean
)
language plpgsql
security definer
set search_path = public
as $function$
begin
    if auth.uid() is null
       or not public.is_staff(auth.uid())
    then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    raise exception using
        errcode = '23514',
        message = 'TERMINATION_POLICY_REQUIRED';
end;
$function$;


comment on function public.terminate_lease_with_final_invoice(
    uuid,
    date,
    text
) is
'Deprecated compatibility blocker. Use the Policy-C termination RPC with explicit initiator and billing rule.';


revoke execute
on function public.terminate_lease_with_final_invoice(uuid, date, text)
from public, anon;

grant execute
on function public.terminate_lease_with_final_invoice(uuid, date, text)
to authenticated, service_role;



-- ============================================================
-- 8. CONTRACTUAL EXPIRATION = FULL MONTH
-- ============================================================

create or replace function public.expire_lease_with_final_invoice(
    p_lease_id uuid
)
returns table (
    lease_id uuid,
    lease_reference text,
    lease_status public.lease_status,
    end_date date,
    final_invoice_id uuid,
    final_invoice_number text,
    final_invoice_amount numeric,
    invoice_reused boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lease public.leases%rowtype;
    v_final record;
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
            message = 'Seul un bail actif peut être expiré.';
    end if;

    if v_lease.end_date is null then
        raise exception using
            errcode = '23514',
            message = 'Un bail sans date de fin contractuelle ne peut pas être expiré. Utilisez la résiliation.';
    end if;

    if v_lease.end_date > current_date then
        raise exception using
            errcode = '23514',
            message = 'Le bail ne peut pas être expiré avant sa date de fin contractuelle.';
    end if;


    select *
    into v_final
    from public.ensure_lease_final_rent_invoice(
        p_lease_id,
        v_lease.end_date,
        'contract_expiration'
            ::public.long_term_rent_billing_context,
        null
    );


    update public.leases l
    set
        status =
            'expired'::public.lease_status
    where l.id = p_lease_id;


    return query
    select
        v_lease.id,
        v_lease.reference,
        'expired'::public.lease_status,
        v_lease.end_date,
        v_final.invoice_id,
        v_final.invoice_number,
        v_final.invoice_amount,
        v_final.reused;
end;
$function$;


comment on function public.expire_lease_with_final_invoice(uuid) is
'Expires an active fixed-term lease using LONG_TERM_C_V1 contract_expiration billing, which bills the full final month.';


revoke execute
on function public.expire_lease_with_final_invoice(uuid)
from public, anon;

grant execute
on function public.expire_lease_with_final_invoice(uuid)
to authenticated, service_role;


commit;
