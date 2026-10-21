-- ============================================================================
-- F2.2C-8B3-A
-- SHORT RENTAL PAYMENT CHOICE
--
-- Purpose:
-- - allow the traveler to choose:
--     installment = contractual first installment
--     full        = entire remaining balance
-- - browser never supplies an amount
-- - PostgreSQL recalculates the authoritative amount
-- - after any successful partial payment, only "full" is allowed
--
-- Existing 3-argument RPC remains temporarily available to service_role
-- during the staged Edge Function deployment.
-- ============================================================================

begin;


-- ============================================================================
-- 1. AUDIT PAYMENT CHOICE ON PSP TRANSACTIONS
-- ============================================================================

alter table public.payment_provider_transactions
    add column if not exists
        payment_choice text;


alter table public.payment_provider_transactions
    drop constraint if exists
        payment_provider_transactions_payment_choice_check;


alter table public.payment_provider_transactions
    add constraint
        payment_provider_transactions_payment_choice_check
    check (
        payment_choice is null
        or payment_choice in (
            'installment',
            'full'
        )
    );


comment on column
public.payment_provider_transactions.payment_choice
is
'Traveler payment choice resolved by the server: installment or full. Historical rows may be null.';


-- ============================================================================
-- 2. NEW PAYMENT-CHOICE-AWARE RPC
--
-- IMPORTANT:
-- p_payment_choice selects a server-side calculation mode.
-- It is NOT an amount.
--
-- Browser:
--   installment | full
--
-- PostgreSQL:
--   calculates the actual monetary amount.
-- ============================================================================

create or replace function
public.create_short_rental_provider_transaction(
    p_token text,
    p_provider text,
    p_payment_method text,
    p_payment_choice text
)
returns table(
    transaction_id uuid,
    provider_transaction_id text,
    booking_id uuid,
    booking_reference text,
    invoice_id uuid,
    invoice_number text,
    provider text,
    payment_method text,
    payment_choice text,
    amount numeric,
    currency text,
    status text,
    reused boolean,
    created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$

declare

    v_token text;
    v_token_hash text;

    v_access
        public.short_rental_payment_access%rowtype;

    v_booking
        public.bookings%rowtype;

    v_invoice
        public.invoices%rowtype;

    v_provider text;
    v_payment_method text;
    v_payment_choice text;

    v_provider_transaction_id text;

    v_net_paid numeric := 0;
    v_remaining numeric := 0;

    v_contractual_installment numeric := 0;
    v_due_now numeric := 0;

    v_initial_percent numeric := 100;

    v_deadline_passed boolean := false;

    v_existing
        public.payment_provider_transactions%rowtype;

    v_created
        public.payment_provider_transactions%rowtype;

begin

    -- ========================================================================
    -- TOKEN
    -- ========================================================================

    v_token :=
        trim(
            coalesce(
                p_token,
                ''
            )
        );


    if length(v_token) < 32 then

        raise exception
            'Lien de paiement invalide ou expiré';

    end if;


    -- ========================================================================
    -- PROVIDER
    -- ========================================================================

    v_provider :=
        lower(
            trim(
                coalesce(
                    p_provider,
                    ''
                )
            )
        );


    if v_provider = '' then

        raise exception
            'Provider de paiement obligatoire';

    end if;


    if length(v_provider) > 80 then

        raise exception
            'Provider de paiement invalide';

    end if;


    if v_provider !~
        '^[a-z0-9][a-z0-9_-]*$'
    then

        raise exception
            'Provider de paiement invalide';

    end if;


    -- ========================================================================
    -- PAYMENT METHOD
    -- ========================================================================

    v_payment_method :=
        lower(
            trim(
                coalesce(
                    p_payment_method,
                    ''
                )
            )
        );


    if v_payment_method = '' then

        raise exception
            'Moyen de paiement obligatoire';

    end if;


    if length(v_payment_method) > 80 then

        raise exception
            'Moyen de paiement invalide';

    end if;


    if v_payment_method !~
        '^[a-z0-9][a-z0-9_-]*$'
    then

        raise exception
            'Moyen de paiement invalide';

    end if;


    -- ========================================================================
    -- PAYMENT CHOICE
    -- ========================================================================

    v_payment_choice :=
        lower(
            trim(
                coalesce(
                    p_payment_choice,
                    ''
                )
            )
        );


    if v_payment_choice not in (
        'installment',
        'full'
    )
    then

        raise exception
            'Choix de paiement invalide';

    end if;


    -- ========================================================================
    -- TOKEN HASH
    -- ========================================================================

    v_token_hash :=
        public.hash_short_rental_payment_token(
            v_token
        );


    -- ========================================================================
    -- PAYMENT ACCESS
    -- ========================================================================

    select
        a.*

    into
        v_access

    from public.short_rental_payment_access a

    where
        a.token_hash =
            v_token_hash

        and a.revoked_at
            is null

        and a.expires_at >
            now()

    limit 1

    for update;


    if not found then

        raise exception
            'Lien de paiement invalide ou expiré';

    end if;


    -- ========================================================================
    -- BOOKING
    -- ========================================================================

    select
        b.*

    into
        v_booking

    from public.bookings b

    where
        b.id =
            v_access.booking_id

    for update;


    if not found then

        raise exception
            'Lien de paiement invalide ou expiré';

    end if;


    if v_booking.status::text
       not in (
           'confirmed',
           'in_progress'
       )
    then

        raise exception
            'Cette réservation ne peut pas recevoir de paiement';

    end if;


    -- ========================================================================
    -- ACTIVE INVOICE
    -- ========================================================================

    select
        i.*

    into
        v_invoice

    from public.invoices i

    where
        i.booking_id =
            v_booking.id

        and i.kind =
            'booking'::public.invoice_kind

        and i.status <>
            'cancelled'::public.invoice_status

    order by
        i.created_at desc

    limit 1

    for update;


    if not found then

        raise exception
            'Aucune facture active associée à ce lien';

    end if;


    if coalesce(
        v_invoice.amount,
        0
    ) <= 0
    then

        raise exception
            'Montant de facture invalide';

    end if;


    if trim(
        coalesce(
            v_invoice.currency,
            ''
        )
    ) = ''
    then

        raise exception
            'Devise de facture invalide';

    end if;


    -- ========================================================================
    -- PSP ORCHESTRATION LOCK
    -- ========================================================================

    perform pg_advisory_xact_lock(
        hashtextextended(
            concat_ws(
                ':',
                'short_rental_psp',
                v_invoice.id::text
            ),
            0
        )
    );


    -- ========================================================================
    -- NET PAID
    -- ========================================================================

    select
        greatest(
            coalesce(
                sum(
                    case

                        when
                            p.status =
                                'completed'::public.payment_status
                            and p.is_refund = false
                        then
                            p.amount

                        when
                            p.status =
                                'completed'::public.payment_status
                            and p.is_refund = true
                        then
                            -p.amount

                        when
                            p.status =
                                'refunded'::public.payment_status
                        then
                            -p.amount

                        else
                            0

                    end
                ),
                0
            ),
            0
        )

    into
        v_net_paid

    from public.payments p

    where
        p.invoice_id =
            v_invoice.id;


    -- ========================================================================
    -- REMAINING
    -- ========================================================================

    v_remaining :=
        greatest(
            coalesce(
                v_invoice.amount,
                0
            )
            -
            coalesce(
                v_net_paid,
                0
            ),
            0
        );


    if v_remaining <= 0 then

        raise exception
            'Cette facture est déjà entièrement payée';

    end if;


    -- ========================================================================
    -- CONTRACTUAL INITIAL PERCENT
    -- ========================================================================

    if
        v_booking.payment_plan =
            'half'::public.short_rental_payment_plan
    then

        v_initial_percent :=
            coalesce(
                v_booking.initial_payment_percent,
                50
            );

    else

        v_initial_percent :=
            100;

    end if;


    if
        v_initial_percent <= 0
        or v_initial_percent > 100
    then

        raise exception
            'Pourcentage de paiement initial invalide';

    end if;


    v_contractual_installment :=
        least(
            v_remaining,
            round(
                (
                    v_invoice.amount
                    *
                    v_initial_percent
                    /
                    100
                ),
                2
            )
        );


    -- ========================================================================
    -- AUTHORITATIVE PAYMENT CHOICE
    --
    -- BEFORE FIRST PAYMENT:
    --
    -- half booking:
    --   installment -> contractual percentage
    --   full        -> entire remaining balance
    --
    -- full booking:
    --   full only
    --
    -- AFTER A PARTIAL PAYMENT:
    --   only the remaining balance may be paid.
    -- ========================================================================

    if v_net_paid > 0 then

        if v_payment_choice <> 'full' then

            raise exception
                'Après un premier paiement, seul le règlement du solde est autorisé';

        end if;


        v_due_now :=
            v_remaining;

    else

        if
            v_booking.payment_plan =
                'half'::public.short_rental_payment_plan
        then

            if
                v_payment_choice =
                    'installment'
            then

                v_due_now :=
                    v_contractual_installment;

            else

                v_due_now :=
                    v_remaining;

            end if;

        else

            if
                v_payment_choice <>
                    'full'
            then

                raise exception
                    'Cette réservation exige un paiement intégral';

            end if;


            v_due_now :=
                v_remaining;

        end if;

    end if;


    if coalesce(
        v_due_now,
        0
    ) <= 0
    then

        raise exception
            'Aucun montant à payer actuellement';

    end if;


    -- ========================================================================
    -- FIRST PAYMENT DEADLINE
    -- ========================================================================

    v_deadline_passed :=
        (
            v_net_paid <= 0
            and v_booking.payment_due_at
                is not null

            and now() >
                v_booking.payment_due_at
        );


    if v_deadline_passed then

        raise exception
            'Le délai de paiement de cette réservation est dépassé';

    end if;


    -- ========================================================================
    -- IDEMPOTENCE
    --
    -- Reuse only the exact same open technical attempt.
    -- ========================================================================

    select
        t.*

    into
        v_existing

    from public.payment_provider_transactions t

    where
        t.invoice_id =
            v_invoice.id

        and t.booking_id =
            v_booking.id

        and t.provider =
            v_provider

        and t.payment_method =
            v_payment_method

        and t.payment_choice =
            v_payment_choice

        and t.payment_id
            is null

        and t.status in (
            'pending',
            'processing'
        )

        and t.amount =
            v_due_now

        and upper(
            trim(
                t.currency
            )
        ) =
            upper(
                trim(
                    v_invoice.currency
                )
            )

    order by
        t.created_at desc,
        t.id desc

    limit 1

    for update;


    if found then

        update public.short_rental_payment_access

        set
            last_accessed_at =
                now()

        where
            id =
                v_access.id;


        return query

        select
            v_existing.id,
            v_existing.provider_transaction_id,
            v_booking.id,
            v_booking.reference,
            v_invoice.id,
            v_invoice.number,
            v_existing.provider,
            v_existing.payment_method,
            v_existing.payment_choice,
            v_existing.amount,
            v_existing.currency,
            v_existing.status,
            true,
            v_existing.created_at;


        return;

    end if;


    -- ========================================================================
    -- SINGLE OPEN PSP ATTEMPT PER INVOICE
    -- ========================================================================

    if exists (

        select
            1

        from public.payment_provider_transactions t

        where
            t.invoice_id =
                v_invoice.id

            and t.booking_id =
                v_booking.id

            and t.payment_id
                is null

            and t.status in (
                'pending',
                'processing'
            )

    )
    then

        raise exception
            'Une tentative de paiement est déjà en cours pour cette facture';

    end if;


    -- ========================================================================
    -- MERCHANT REFERENCE
    -- ========================================================================

    v_provider_transaction_id :=
        'IMMO-'
        ||
        upper(
            replace(
                gen_random_uuid()::text,
                '-',
                ''
            )
        );


    -- ========================================================================
    -- CREATE PSP TRANSACTION
    -- ========================================================================

    insert into
        public.payment_provider_transactions (
            payment_id,
            invoice_id,
            booking_id,
            provider,
            provider_transaction_id,
            provider_reference,
            payment_method,
            payment_choice,
            amount,
            currency,
            status,
            initiated_at
        )

    values (
        null,
        v_invoice.id,
        v_booking.id,
        v_provider,
        v_provider_transaction_id,
        null,
        v_payment_method,
        v_payment_choice,
        v_due_now,
        upper(
            trim(
                v_invoice.currency
            )
        ),
        'pending',
        now()
    )

    returning *
    into
        v_created;


    -- ========================================================================
    -- ACCESS AUDIT
    -- ========================================================================

    update public.short_rental_payment_access

    set
        last_accessed_at =
            now()

    where
        id =
            v_access.id;


    -- ========================================================================
    -- SANITIZED RESULT
    -- ========================================================================

    return query

    select
        v_created.id,
        v_created.provider_transaction_id,
        v_booking.id,
        v_booking.reference,
        v_invoice.id,
        v_invoice.number,
        v_created.provider,
        v_created.payment_method,
        v_created.payment_choice,
        v_created.amount,
        v_created.currency,
        v_created.status,
        false,
        v_created.created_at;

end;

$function$;


-- ============================================================================
-- 3. PRIVILEGES
-- ============================================================================

revoke all
on function
public.create_short_rental_provider_transaction(
    text,
    text,
    text,
    text
)
from public;


revoke execute
on function
public.create_short_rental_provider_transaction(
    text,
    text,
    text,
    text
)
from anon, authenticated;


grant execute
on function
public.create_short_rental_provider_transaction(
    text,
    text,
    text,
    text
)
to postgres, service_role;


comment on function
public.create_short_rental_provider_transaction(
    text,
    text,
    text,
    text
)
is
'Creates or reuses one short-rental PSP attempt. The browser supplies only installment/full; PostgreSQL calculates the monetary amount.';


commit;