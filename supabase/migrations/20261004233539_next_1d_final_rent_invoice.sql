-- ============================================================
-- AMIMMO NEXT-1D-S2A
-- ATOMIC LEASE EXIT + FINAL PRORATED RENT INVOICE
-- ============================================================


-- ============================================================
-- 1. INTERNAL FINAL-INVOICE ENGINE
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
as $$
declare
    v_lease public.leases%rowtype;
    v_invoice public.invoices%rowtype;

    v_month_start date;
    v_period_start date;
    v_previous_month_end date;

    v_days_in_month integer;
    v_billable_days integer;

    v_rent_amount numeric;
    v_charges_amount numeric;
    v_total_amount numeric;

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


    if p_exit_date is null then
        raise exception using
            errcode = '23514',
            message = 'La date de sortie est obligatoire.';
    end if;


    if p_exit_date < v_lease.start_date then
        raise exception using
            errcode = '23514',
            message = 'La date de sortie ne peut pas être antérieure au début du bail.';
    end if;


    if p_exit_date > current_date then
        raise exception using
            errcode = '23514',
            message = 'La date de sortie ne peut pas être future.';
    end if;


    if coalesce(v_lease.monthly_rent, 0) <= 0 then
        raise exception using
            errcode = '23514',
            message = 'Le loyer mensuel doit être supérieur à zéro.';
    end if;


    if coalesce(v_lease.charges, 0) < 0 then
        raise exception using
            errcode = '23514',
            message = 'Les charges mensuelles ne peuvent pas être négatives.';
    end if;


    -- --------------------------------------------------------
    -- Final period
    -- --------------------------------------------------------

    v_month_start :=
        date_trunc(
            'month',
            p_exit_date
        )::date;

    v_period_start :=
        greatest(
            v_month_start,
            v_lease.start_date
        );

    v_days_in_month :=
        (
            (
                v_month_start
                + interval '1 month'
            )::date
            - v_month_start
        );

    v_billable_days :=
        p_exit_date
        - v_period_start
        + 1;


    if v_days_in_month <= 0
       or v_billable_days <= 0
    then
        raise exception using
            errcode = '23514',
            message = 'Période finale de facturation invalide.';
    end if;


    -- --------------------------------------------------------
    -- Calendar-day proration.
    --
    -- Rent and monthly charges are rounded independently so
    -- invoice.amount always equals the sum of invoice lines.
    -- --------------------------------------------------------

    v_rent_amount :=
        round(
            coalesce(
                v_lease.monthly_rent,
                0
            )
            *
            v_billable_days
            /
            v_days_in_month,
            0
        );

    v_charges_amount :=
        round(
            coalesce(
                v_lease.charges,
                0
            )
            *
            v_billable_days
            /
            v_days_in_month,
            0
        );

    v_total_amount :=
        v_rent_amount
        +
        v_charges_amount;


    if v_total_amount <= 0 then
        raise exception using
            errcode = '23514',
            message = 'Le montant de la facture finale doit être supérieur à zéro.';
    end if;


    -- --------------------------------------------------------
    -- No active rent invoice may exist after the effective
    -- exit date.
    --
    -- Those cases require an explicit accounting adjustment /
    -- credit workflow and must never be silently rewritten.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start > p_exit_date
    ) then
        raise exception using
            errcode = '23514',
            message = 'Une facture de loyer existe après la date de sortie. Une régularisation comptable est nécessaire avant la clôture du bail.';
    end if;


    -- --------------------------------------------------------
    -- Defensive overlap detection
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.invoices i
        where i.lease_id = p_lease_id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start <> v_period_start
          and i.period_start <= p_exit_date
          and i.period_end >= v_period_start
    ) then
        raise exception using
            errcode = '23514',
            message = 'Une facture de loyer chevauche la période finale. Une régularisation comptable est nécessaire.';
    end if;


    -- --------------------------------------------------------
    -- Generate missing prior months only.
    --
    -- The termination month itself is handled below because it
    -- follows the final-invoice proration rule.
    -- --------------------------------------------------------

    v_previous_month_end :=
        v_month_start - 1;

    if v_previous_month_end >= v_lease.start_date then
        perform public.generate_lease_rent_invoices(
            p_lease_id,
            v_previous_month_end
        );
    end if;


    -- --------------------------------------------------------
    -- Existing active invoice for final period
    -- --------------------------------------------------------

    select i.*
    into v_invoice
    from public.invoices i
    where i.lease_id = p_lease_id
      and i.kind = 'rent'::public.invoice_kind
      and i.status <> 'cancelled'::public.invoice_status
      and i.period_start = v_period_start
    order by i.created_at desc
    limit 1
    for update;


    if found then

        if v_invoice.period_end is distinct from p_exit_date
           or v_invoice.amount is distinct from v_total_amount
        then
            raise exception using
                errcode = '23514',
                message = format(
                    'La facture %s existe déjà pour la période finale avec un montant ou une période incompatible. Une régularisation comptable est nécessaire.',
                    v_invoice.number
                );
        end if;


        -- Defensive accounting guarantee.
        if v_invoice.accounting_entry_id is null then
            perform public.post_rent_invoice_to_accounting(
                v_invoice.id
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
    -- Organization
    -- --------------------------------------------------------

    v_organization_id :=
        public.current_org_id();


    -- --------------------------------------------------------
    -- Create the canonical final invoice.
    --
    -- issue_date / due_date = actual creation date.
    -- period_end             = effective exit date.
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
        'issued'::public.invoice_status,

        v_lease.id,
        v_lease.tenant_id,
        v_lease.owner_id,
        v_lease.property_id,

        current_date,
        current_date,

        v_period_start,
        p_exit_date,

        'GNF',

        v_total_amount,
        0,

        format(
            'Facture finale proratisée - %s jour(s) sur %s - sortie au %s',
            v_billable_days,
            v_days_in_month,
            to_char(
                p_exit_date,
                'DD/MM/YYYY'
            )
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

        format(
            'Loyer proratisé %s - %s',
            to_char(
                v_period_start,
                'DD/MM/YYYY'
            ),
            to_char(
                p_exit_date,
                'DD/MM/YYYY'
            )
        ),

        1,
        v_rent_amount,
        v_rent_amount
    );


    -- --------------------------------------------------------
    -- Charges line
    -- --------------------------------------------------------

    if v_charges_amount > 0 then

        insert into public.invoice_lines (
            invoice_id,
            label,
            quantity,
            unit_price,
            amount
        )
        values (
            v_invoice_id,

            format(
                'Charges proratisées %s - %s',
                to_char(
                    v_period_start,
                    'DD/MM/YYYY'
                ),
                to_char(
                    p_exit_date,
                    'DD/MM/YYYY'
                )
            ),

            1,
            v_charges_amount,
            v_charges_amount
        );

    end if;


    return query
    select
        v_invoice_id,
        v_invoice_number,
        v_total_amount,
        v_period_start,
        p_exit_date,
        false;
end;
$$;


-- Internal helper only.
revoke execute
on function public.ensure_lease_final_rent_invoice(uuid, date)
from public, anon, authenticated;

grant execute
on function public.ensure_lease_final_rent_invoice(uuid, date)
to service_role;



-- ============================================================
-- 2. TERMINATION RPC
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
as $$
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
            message = 'Seul un bail actif peut être résilié.';
    end if;


    if p_termination_date is null then
        raise exception using
            errcode = '23514',
            message = 'La date effective de résiliation est obligatoire.';
    end if;


    if p_termination_date < v_lease.start_date then
        raise exception using
            errcode = '23514',
            message = 'La date de résiliation ne peut pas être antérieure au début du bail.';
    end if;


    if p_termination_date > current_date then
        raise exception using
            errcode = '23514',
            message = 'La date de résiliation ne peut pas être future.';
    end if;


    if v_lease.end_date is not null
       and p_termination_date > v_lease.end_date
    then
        raise exception using
            errcode = '23514',
            message = 'La date de résiliation dépasse la date de fin contractuelle. Le bail doit être expiré selon sa date contractuelle.';
    end if;


    select *
    into v_final
    from public.ensure_lease_final_rent_invoice(
        p_lease_id,
        p_termination_date
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
            )
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
$$;


revoke execute
on function public.terminate_lease_with_final_invoice(uuid, date, text)
from public, anon;

grant execute
on function public.terminate_lease_with_final_invoice(uuid, date, text)
to authenticated, service_role;



-- ============================================================
-- 3. EXPIRATION RPC
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
as $$
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
        v_lease.end_date
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
$$;


revoke execute
on function public.expire_lease_with_final_invoice(uuid)
from public, anon;

grant execute
on function public.expire_lease_with_final_invoice(uuid)
to authenticated, service_role;



-- ============================================================
-- 4. DATABASE INVARIANT
--
-- Any ACTIVE -> TERMINATED / EXPIRED transition must already
-- have the exact final rent invoice.
--
-- This prevents a direct table UPDATE from bypassing the
-- financial exit workflow.
-- ============================================================

create or replace function public.guard_lease_exit_final_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_exit_date date;

    v_month_start date;
    v_period_start date;

    v_days_in_month integer;
    v_billable_days integer;

    v_expected_rent numeric;
    v_expected_charges numeric;
    v_expected_total numeric;
begin
    if old.status <> 'active'::public.lease_status
       or new.status not in (
            'terminated'::public.lease_status,
            'expired'::public.lease_status
       )
    then
        return new;
    end if;


    if new.status = 'terminated'::public.lease_status then

        v_exit_date :=
            new.termination_date;

        if new.end_date is not null
           and v_exit_date > new.end_date
        then
            raise exception using
                errcode = '23514',
                message = 'La date de résiliation ne peut pas dépasser la date de fin contractuelle.';
        end if;

    else

        v_exit_date :=
            new.end_date;

    end if;


    if v_exit_date is null then
        raise exception using
            errcode = '23514',
            message = 'La date effective de sortie du bail est obligatoire.';
    end if;


    v_month_start :=
        date_trunc(
            'month',
            v_exit_date
        )::date;

    v_period_start :=
        greatest(
            v_month_start,
            new.start_date
        );

    v_days_in_month :=
        (
            (
                v_month_start
                + interval '1 month'
            )::date
            - v_month_start
        );

    v_billable_days :=
        v_exit_date
        - v_period_start
        + 1;


    v_expected_rent :=
        round(
            coalesce(
                new.monthly_rent,
                0
            )
            *
            v_billable_days
            /
            v_days_in_month,
            0
        );

    v_expected_charges :=
        round(
            coalesce(
                new.charges,
                0
            )
            *
            v_billable_days
            /
            v_days_in_month,
            0
        );

    v_expected_total :=
        v_expected_rent
        +
        v_expected_charges;


    if not exists (
        select 1
        from public.invoices i
        where i.lease_id = new.id
          and i.kind = 'rent'::public.invoice_kind
          and i.status <> 'cancelled'::public.invoice_status
          and i.period_start = v_period_start
          and i.period_end = v_exit_date
          and i.amount = v_expected_total
    ) then
        raise exception using
            errcode = '23514',
            message = 'La sortie du bail exige d''abord une facture finale de loyer conforme.';
    end if;


    return new;
end;
$$;


drop trigger if exists trg_require_lease_final_invoice
on public.leases;

create trigger trg_require_lease_final_invoice
before update of
    status,
    termination_date,
    end_date
on public.leases
for each row
execute function public.guard_lease_exit_final_invoice();


revoke execute
on function public.guard_lease_exit_final_invoice()
from public, anon, authenticated;

grant execute
on function public.guard_lease_exit_final_invoice()
to service_role;