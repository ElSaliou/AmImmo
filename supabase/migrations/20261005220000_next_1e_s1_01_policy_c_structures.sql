-- ============================================================
-- AMIMMO NEXT-1E-S1-01
-- POLICY C - ADDITIVE DATA STRUCTURES
-- CANONICAL IDEMPOTENT RECONCILIATION MIGRATION
-- ============================================================

begin;

-- 1. ENUM TYPES

do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'lease_termination_initiator'
    ) then
        create type public.lease_termination_initiator as enum (
            'landlord',
            'tenant',
            'mutual_agreement'
        );
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'rent_billing_rule'
    ) then
        create type public.rent_billing_rule as enum (
            'prorata',
            'full_month'
        );
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'long_term_rent_billing_context'
    ) then
        create type public.long_term_rent_billing_context as enum (
            'regular_month',
            'lease_start',
            'contract_expiration',
            'termination_landlord',
            'termination_tenant',
            'termination_mutual'
        );
    end if;
end;
$$;

comment on type public.lease_termination_initiator is
'Originator of a long-term lease early termination. NEXT-1E Policy C.';

comment on type public.rent_billing_rule is
'Financial rule used for long-term rent billing: calendar-day prorata or full month.';

comment on type public.long_term_rent_billing_context is
'Business context used by the canonical long-term rent billing engine.';

-- 2. TERMINATION POLICY METADATA ON LEASES

alter table public.leases
add column if not exists termination_initiator
    public.lease_termination_initiator null;

alter table public.leases
add column if not exists termination_billing_rule
    public.rent_billing_rule null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.leases'::regclass
          and conname = 'leases_termination_policy_pair_check'
    ) then
        alter table public.leases
        add constraint leases_termination_policy_pair_check
        check (
               (
                   termination_initiator is null
                   and termination_billing_rule is null
               )
            or (
                   termination_initiator is not null
                   and termination_billing_rule is not null
               )
        );
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.leases'::regclass
          and conname = 'leases_termination_policy_status_check'
    ) then
        alter table public.leases
        add constraint leases_termination_policy_status_check
        check (
            termination_initiator is null
            or status = 'terminated'::public.lease_status
        );
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.leases'::regclass
          and conname = 'leases_termination_policy_mapping_check'
    ) then
        alter table public.leases
        add constraint leases_termination_policy_mapping_check
        check (
            termination_initiator is null
            or (
                   (
                       termination_initiator =
                           'landlord'::public.lease_termination_initiator
                       and termination_billing_rule =
                           'prorata'::public.rent_billing_rule
                   )
                or (
                       termination_initiator =
                           'tenant'::public.lease_termination_initiator
                       and termination_billing_rule =
                           'full_month'::public.rent_billing_rule
                   )
                or (
                       termination_initiator =
                           'mutual_agreement'::public.lease_termination_initiator
                       and termination_billing_rule in (
                           'prorata'::public.rent_billing_rule,
                           'full_month'::public.rent_billing_rule
                       )
                   )
            )
        );
    end if;
end;
$$;

comment on column public.leases.termination_initiator is
'Initiator of a Policy-C early termination. NULL is preserved for legacy terminations.';

comment on column public.leases.termination_billing_rule is
'Policy-C billing rule selected for the termination. NULL is preserved for legacy terminations.';

-- 3. APPEND-ONLY CALCULATION EVIDENCE

create table if not exists public.rent_invoice_calculations (
    id uuid primary key default gen_random_uuid(),

    invoice_id uuid not null unique
        references public.invoices(id) on delete restrict,

    lease_id uuid not null
        references public.leases(id) on delete restrict,

    billing_month date not null,
    billing_context public.long_term_rent_billing_context not null,
    billing_rule public.rent_billing_rule not null,
    policy_version text not null,
    effective_date date not null,
    period_start date not null,
    period_end date not null,
    days_in_month integer not null,
    billed_days integer not null,
    monthly_rent_snapshot numeric not null,
    monthly_charges_snapshot numeric not null,
    rent_amount numeric not null,
    charges_amount numeric not null,
    total_amount numeric not null,
    created_at timestamptz not null default now(),

    constraint rent_invoice_calculations_policy_version_check
        check (policy_version = 'LONG_TERM_C_V1'),

    constraint rent_invoice_calculations_billing_month_check
        check (
            billing_month =
            date_trunc('month', billing_month)::date
        ),

    constraint rent_invoice_calculations_period_order_check
        check (period_start <= period_end),

    constraint rent_invoice_calculations_period_month_check
        check (
            period_start >= billing_month
            and period_end < (billing_month + interval '1 month')::date
        ),

    constraint rent_invoice_calculations_days_in_month_check
        check (
            days_in_month =
            ((billing_month + interval '1 month')::date - billing_month)
        ),

    constraint rent_invoice_calculations_billed_days_check
        check (
            billed_days = (period_end - period_start + 1)
            and billed_days >= 1
            and billed_days <= days_in_month
        ),

    constraint rent_invoice_calculations_snapshot_check
        check (
            monthly_rent_snapshot > 0
            and monthly_charges_snapshot >= 0
        ),

    constraint rent_invoice_calculations_amounts_check
        check (
            rent_amount >= 0
            and charges_amount >= 0
            and total_amount > 0
            and total_amount = rent_amount + charges_amount
        ),

    constraint rent_invoice_calculations_full_month_shape_check
        check (
            billing_rule <> 'full_month'::public.rent_billing_rule
            or (
                period_start = billing_month
                and period_end =
                    (billing_month + interval '1 month' - interval '1 day')::date
                and billed_days = days_in_month
            )
        ),

    constraint rent_invoice_calculations_prorata_normalization_check
        check (
            billing_rule <> 'prorata'::public.rent_billing_rule
            or billed_days < days_in_month
        ),

    constraint rent_invoice_calculations_policy_c_amount_check
        check (
               (
                   billing_rule = 'full_month'::public.rent_billing_rule
                   and rent_amount = monthly_rent_snapshot
                   and charges_amount = monthly_charges_snapshot
               )
            or (
                   billing_rule = 'prorata'::public.rent_billing_rule
                   and rent_amount =
                       round(
                           monthly_rent_snapshot
                           * billed_days
                           / nullif(days_in_month, 0),
                           0
                       )
                   and charges_amount =
                       round(
                           monthly_charges_snapshot
                           * billed_days
                           / nullif(days_in_month, 0),
                           0
                       )
               )
        )
);

comment on table public.rent_invoice_calculations is
'Append-only evidence of canonical long-term rent calculations. NEXT-1E Policy LONG_TERM_C_V1.';

create index if not exists idx_rent_invoice_calculations_lease_month
on public.rent_invoice_calculations (lease_id, billing_month);

create index if not exists idx_rent_invoice_calculations_billing_month
on public.rent_invoice_calculations (billing_month);

-- 4. CROSS-TABLE INSERT GUARD

create or replace function public.guard_rent_invoice_calculation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_invoice public.invoices%rowtype;
    v_lines_total numeric;
begin
    select i.*
    into v_invoice
    from public.invoices i
    where i.id = new.invoice_id
    for key share;

    if not found then
        raise exception using
            errcode = '23514',
            message = 'Facture introuvable pour la preuve de calcul de loyer.';
    end if;

    if v_invoice.kind <> 'rent'::public.invoice_kind then
        raise exception using
            errcode = '23514',
            message = 'Une preuve de calcul de loyer doit référencer une facture de type loyer.';
    end if;

    if v_invoice.status = 'cancelled'::public.invoice_status then
        raise exception using
            errcode = '23514',
            message = 'Une preuve de calcul ne peut pas être créée pour une facture annulée.';
    end if;

    if v_invoice.lease_id is distinct from new.lease_id then
        raise exception using
            errcode = '23514',
            message = 'Le bail de la preuve de calcul ne correspond pas au bail de la facture.';
    end if;

    if v_invoice.amount is distinct from new.total_amount then
        raise exception using
            errcode = '23514',
            message = 'Le montant de la facture ne correspond pas au total de la preuve de calcul.';
    end if;

    if v_invoice.period_start is distinct from new.period_start
       or v_invoice.period_end is distinct from new.period_end
    then
        raise exception using
            errcode = '23514',
            message = 'La période de la facture ne correspond pas à la période financière de la preuve de calcul.';
    end if;

    select coalesce(sum(il.amount), 0)
    into v_lines_total
    from public.invoice_lines il
    where il.invoice_id = new.invoice_id;

    if v_lines_total is distinct from new.total_amount then
        raise exception using
            errcode = '23514',
            message = 'Le total des lignes de facture ne correspond pas à la preuve de calcul.';
    end if;

    if v_invoice.accounting_entry_id is null then
        raise exception using
            errcode = '23514',
            message = 'La facture doit être comptabilisée avant l''enregistrement de sa preuve de calcul.';
    end if;

    return new;
end;
$$;

revoke execute
on function public.guard_rent_invoice_calculation_insert()
from public, anon, authenticated, service_role;

drop trigger if exists trg_guard_rent_invoice_calculation_insert
on public.rent_invoice_calculations;

create trigger trg_guard_rent_invoice_calculation_insert
before insert
on public.rent_invoice_calculations
for each row
execute function public.guard_rent_invoice_calculation_insert();

-- 5. APPEND-ONLY GUARD

create or replace function public.guard_rent_invoice_calculation_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    raise exception using
        errcode = '23514',
        message = 'Une preuve de calcul de loyer est immuable et ne peut être ni modifiée ni supprimée.';
end;
$$;

revoke execute
on function public.guard_rent_invoice_calculation_immutable()
from public, anon, authenticated, service_role;

drop trigger if exists trg_guard_rent_invoice_calculation_immutable
on public.rent_invoice_calculations;

create trigger trg_guard_rent_invoice_calculation_immutable
before update or delete
on public.rent_invoice_calculations
for each row
execute function public.guard_rent_invoice_calculation_immutable();

-- 6. RLS + DIRECT ACCESS HARDENING

alter table public.rent_invoice_calculations
enable row level security;

revoke all
on table public.rent_invoice_calculations
from public, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.rent_invoice_calculations
from service_role;

grant select
on table public.rent_invoice_calculations
to service_role;

-- The following existing NEXT-1D / accounting objects are intentionally
-- left untouched in S1-01:
-- generate_lease_rent_invoices
-- generate_all_rent_invoices
-- ensure_lease_final_rent_invoice
-- terminate_lease_with_final_invoice
-- expire_lease_with_final_invoice
-- guard_lease_status_transition
-- guard_lease_exit_final_invoice
-- trg_post_rent_invoice_accounting
-- post_rent_invoice_to_accounting

commit;
