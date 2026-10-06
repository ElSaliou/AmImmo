-- ============================================================
-- AMIMMO NEXT-1E-S1-02
-- CANONICAL LONG-TERM RENT BILLING RESOLVER
-- Policy: LONG_TERM_C_V1
-- IDEMPOTENT RECONCILIATION MIGRATION
-- ============================================================
--
-- Pure calculation only:
--   * no table reads
--   * no INSERT / UPDATE / DELETE
--   * no invoice generation
--   * no accounting mutation
--   * no lease-status mutation
--
-- Existing billing / exit RPCs are intentionally untouched.
-- ============================================================

begin;

create or replace function public.resolve_long_term_rent_billing(
    p_lease_start_date date,
    p_billing_month date,
    p_monthly_rent numeric,
    p_monthly_charges numeric,
    p_billing_context public.long_term_rent_billing_context,
    p_effective_date date default null,
    p_requested_rule public.rent_billing_rule default null
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
immutable
parallel safe
set search_path = public
as $$
declare
    v_lease_start_month date;
    v_month_end date;
    v_rule public.rent_billing_rule;
    v_period_start date;
    v_period_end date;
    v_effective_date date;
    v_billed_days integer;
    v_rent_amount numeric;
    v_charges_amount numeric;
begin
    resolution_status := null;
    resolution_code := null;

    billing_month := p_billing_month;
    billing_context := p_billing_context;
    billing_rule := null;
    policy_version := 'LONG_TERM_C_V1';
    effective_date := p_effective_date;

    period_start := null;
    period_end := null;
    days_in_month := null;
    billed_days := null;

    monthly_rent_snapshot := p_monthly_rent;
    monthly_charges_snapshot := p_monthly_charges;

    rent_amount := null;
    charges_amount := null;
    total_amount := null;

    -- 1. Fundamental validation

    if p_billing_month is null
       or extract(day from p_billing_month)::integer <> 1
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_INVALID_BILLING_MONTH';
        return next;
        return;
    end if;

    days_in_month :=
        ((p_billing_month + interval '1 month')::date - p_billing_month);

    v_month_end :=
        (p_billing_month + interval '1 month' - interval '1 day')::date;

    if p_lease_start_date is null then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_INVALID_LEASE_START';
        return next;
        return;
    end if;

    v_lease_start_month :=
        p_lease_start_date
        - (extract(day from p_lease_start_date)::integer - 1);

    if p_monthly_rent is null
       or p_monthly_rent <= 0
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_INVALID_RENT';
        return next;
        return;
    end if;

    if p_monthly_charges is null
       or p_monthly_charges < 0
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_INVALID_CHARGES';
        return next;
        return;
    end if;

    if p_billing_context is null then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_CONTEXT_MISMATCH';
        return next;
        return;
    end if;

    if p_billing_month < v_lease_start_month then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_CONTEXT_MISMATCH';
        return next;
        return;
    end if;

    -- 2. Requested-rule contract

    if p_billing_context <>
           'termination_mutual'::public.long_term_rent_billing_context
       and p_requested_rule is not null
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_RULE_NOT_ALLOWED';
        return next;
        return;
    end if;

    if p_billing_context =
           'termination_mutual'::public.long_term_rent_billing_context
       and p_requested_rule is null
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_MUTUAL_RULE_REQUIRED';
        return next;
        return;
    end if;

    -- 3. Context resolution

    if p_billing_context =
           'regular_month'::public.long_term_rent_billing_context
    then
        if p_effective_date is not null then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        if p_billing_month <= v_lease_start_month then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_CONTEXT_MISMATCH';
            return next;
            return;
        end if;

        v_rule := 'full_month'::public.rent_billing_rule;
        v_effective_date := p_billing_month;
        v_period_start := p_billing_month;
        v_period_end := v_month_end;

    elsif p_billing_context =
              'lease_start'::public.long_term_rent_billing_context
    then
        if p_effective_date is not null then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        if p_billing_month <> v_lease_start_month then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_CONTEXT_MISMATCH';
            return next;
            return;
        end if;

        v_effective_date := p_lease_start_date;
        v_period_start := p_lease_start_date;
        v_period_end := v_month_end;

        if p_lease_start_date = p_billing_month then
            v_rule := 'full_month'::public.rent_billing_rule;
        else
            v_rule := 'prorata'::public.rent_billing_rule;
        end if;

    elsif p_billing_context =
              'contract_expiration'::public.long_term_rent_billing_context
    then
        if p_effective_date is null
           or p_effective_date < p_billing_month
           or p_effective_date > v_month_end
           or p_effective_date < p_lease_start_date
        then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        v_rule := 'full_month'::public.rent_billing_rule;
        v_effective_date := p_effective_date;

        if v_lease_start_month = p_billing_month
           and p_lease_start_date > p_billing_month
        then
            resolution_status := 'manual_review';
            resolution_code := 'BILLING_SAME_MONTH_POLICY_CONFLICT';
            billing_rule := v_rule;
            effective_date := v_effective_date;
            return next;
            return;
        end if;

        v_period_start := p_billing_month;
        v_period_end := v_month_end;

    elsif p_billing_context =
              'termination_landlord'::public.long_term_rent_billing_context
    then
        if p_effective_date is null
           or p_effective_date < p_billing_month
           or p_effective_date > v_month_end
           or p_effective_date < p_lease_start_date
        then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        v_rule := 'prorata'::public.rent_billing_rule;
        v_effective_date := p_effective_date;
        v_period_start := greatest(p_billing_month, p_lease_start_date);
        v_period_end := p_effective_date;

    elsif p_billing_context =
              'termination_tenant'::public.long_term_rent_billing_context
    then
        if p_effective_date is null
           or p_effective_date < p_billing_month
           or p_effective_date > v_month_end
           or p_effective_date < p_lease_start_date
        then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        v_rule := 'full_month'::public.rent_billing_rule;
        v_effective_date := p_effective_date;

        if v_lease_start_month = p_billing_month
           and p_lease_start_date > p_billing_month
        then
            resolution_status := 'manual_review';
            resolution_code := 'BILLING_SAME_MONTH_POLICY_CONFLICT';
            billing_rule := v_rule;
            effective_date := v_effective_date;
            return next;
            return;
        end if;

        v_period_start := p_billing_month;
        v_period_end := v_month_end;

    elsif p_billing_context =
              'termination_mutual'::public.long_term_rent_billing_context
    then
        if p_effective_date is null
           or p_effective_date < p_billing_month
           or p_effective_date > v_month_end
           or p_effective_date < p_lease_start_date
        then
            resolution_status := 'invalid';
            resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
            return next;
            return;
        end if;

        v_rule := p_requested_rule;
        v_effective_date := p_effective_date;

        if v_rule = 'full_month'::public.rent_billing_rule
           and v_lease_start_month = p_billing_month
           and p_lease_start_date > p_billing_month
        then
            resolution_status := 'manual_review';
            resolution_code := 'BILLING_SAME_MONTH_POLICY_CONFLICT';
            billing_rule := v_rule;
            effective_date := v_effective_date;
            return next;
            return;
        end if;

        if v_rule = 'prorata'::public.rent_billing_rule then
            v_period_start := greatest(p_billing_month, p_lease_start_date);
            v_period_end := p_effective_date;
        else
            v_period_start := p_billing_month;
            v_period_end := v_month_end;
        end if;

    else
        resolution_status := 'invalid';
        resolution_code := 'BILLING_CONTEXT_MISMATCH';
        return next;
        return;
    end if;

    -- 4. Period validation + normalization

    if v_period_start is null
       or v_period_end is null
       or v_period_start > v_period_end
    then
        resolution_status := 'invalid';
        resolution_code := 'BILLING_INVALID_EFFECTIVE_DATE';
        return next;
        return;
    end if;

    v_billed_days := v_period_end - v_period_start + 1;

    if v_rule = 'prorata'::public.rent_billing_rule
       and v_period_start = p_billing_month
       and v_period_end = v_month_end
       and v_billed_days = days_in_month
    then
        v_rule := 'full_month'::public.rent_billing_rule;
    end if;

    -- 5. Policy C calculation

    if v_rule = 'full_month'::public.rent_billing_rule then
        v_period_start := p_billing_month;
        v_period_end := v_month_end;
        v_billed_days := days_in_month;

        v_rent_amount := p_monthly_rent;
        v_charges_amount := p_monthly_charges;
    else
        v_rent_amount :=
            round(
                p_monthly_rent
                * v_billed_days
                / days_in_month,
                0
            );

        v_charges_amount :=
            round(
                p_monthly_charges
                * v_billed_days
                / days_in_month,
                0
            );
    end if;

    -- 6. Resolved result

    resolution_status := 'resolved';
    resolution_code := 'BILLING_OK';

    billing_rule := v_rule;
    effective_date := v_effective_date;

    period_start := v_period_start;
    period_end := v_period_end;
    billed_days := v_billed_days;

    rent_amount := v_rent_amount;
    charges_amount := v_charges_amount;
    total_amount := v_rent_amount + v_charges_amount;

    return next;
    return;
end;
$$;

comment on function public.resolve_long_term_rent_billing(
    date,
    date,
    numeric,
    numeric,
    public.long_term_rent_billing_context,
    date,
    public.rent_billing_rule
) is
'Pure canonical long-term rent resolver for Policy LONG_TERM_C_V1. Returns resolved/manual_review/invalid without mutating business or accounting data.';

revoke execute
on function public.resolve_long_term_rent_billing(
    date,
    date,
    numeric,
    numeric,
    public.long_term_rent_billing_context,
    date,
    public.rent_billing_rule
)
from public, anon, authenticated, service_role;

commit;
