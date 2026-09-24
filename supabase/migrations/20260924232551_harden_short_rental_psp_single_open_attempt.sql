-- ============================================================================
-- AmImmo
-- Short rental PSP hardening
--
-- Règle :
--   - une seule tentative PSP pending/processing par facture ;
--   - même provider + même moyen + même montant + même devise => réutilisation ;
--   - autre tentative concurrente => PAYMENT_ATTEMPT_CONFLICT côté Edge Function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_short_rental_provider_transaction(
    p_token text,
    p_provider text,
    p_payment_method text
)
RETURNS TABLE(
    transaction_id uuid,
    provider_transaction_id text,
    booking_id uuid,
    booking_reference text,
    invoice_id uuid,
    invoice_number text,
    provider text,
    payment_method text,
    amount numeric,
    currency text,
    status text,
    reused boolean,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$

DECLARE
    v_token text;
    v_token_hash text;

    v_access
        public.short_rental_payment_access%ROWTYPE;

    v_booking
        public.bookings%ROWTYPE;

    v_invoice
        public.invoices%ROWTYPE;

    v_provider text;
    v_payment_method text;
    v_provider_transaction_id text;

    v_net_paid numeric := 0;
    v_remaining numeric := 0;
    v_due_now numeric := 0;
    v_initial_percent numeric := 100;
    v_deadline_passed boolean := false;

    v_existing
        public.payment_provider_transactions%ROWTYPE;

    v_created
        public.payment_provider_transactions%ROWTYPE;

BEGIN

    -- ------------------------------------------------------------------------
    -- TOKEN
    -- ------------------------------------------------------------------------

    v_token :=
        trim(
            coalesce(
                p_token,
                ''
            )
        );

    IF length(v_token) < 32 THEN
        RAISE EXCEPTION
            'Lien de paiement invalide ou expiré';
    END IF;


    -- ------------------------------------------------------------------------
    -- PROVIDER
    -- ------------------------------------------------------------------------

    v_provider :=
        lower(
            trim(
                coalesce(
                    p_provider,
                    ''
                )
            )
        );

    IF v_provider = '' THEN
        RAISE EXCEPTION
            'Provider de paiement obligatoire';
    END IF;

    IF length(v_provider) > 80 THEN
        RAISE EXCEPTION
            'Provider de paiement invalide';
    END IF;

    IF v_provider !~ '^[a-z0-9][a-z0-9_-]*$' THEN
        RAISE EXCEPTION
            'Provider de paiement invalide';
    END IF;


    -- ------------------------------------------------------------------------
    -- PAYMENT METHOD
    -- ------------------------------------------------------------------------

    v_payment_method :=
        lower(
            trim(
                coalesce(
                    p_payment_method,
                    ''
                )
            )
        );

    IF v_payment_method = '' THEN
        RAISE EXCEPTION
            'Moyen de paiement obligatoire';
    END IF;

    IF length(v_payment_method) > 80 THEN
        RAISE EXCEPTION
            'Moyen de paiement invalide';
    END IF;

    IF v_payment_method !~ '^[a-z0-9][a-z0-9_-]*$' THEN
        RAISE EXCEPTION
            'Moyen de paiement invalide';
    END IF;


    -- ------------------------------------------------------------------------
    -- TOKEN HASH
    -- ------------------------------------------------------------------------

    v_token_hash :=
        public.hash_short_rental_payment_token(
            v_token
        );


    -- ------------------------------------------------------------------------
    -- PAYMENT ACCESS
    -- ------------------------------------------------------------------------

    SELECT
        a.*
    INTO
        v_access
    FROM public.short_rental_payment_access a
    WHERE
        a.token_hash = v_token_hash
        AND a.revoked_at IS NULL
        AND a.expires_at > now()
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Lien de paiement invalide ou expiré';
    END IF;


    -- ------------------------------------------------------------------------
    -- BOOKING
    -- ------------------------------------------------------------------------

    SELECT
        b.*
    INTO
        v_booking
    FROM public.bookings b
    WHERE
        b.id = v_access.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Lien de paiement invalide ou expiré';
    END IF;

    IF v_booking.status::text NOT IN (
        'confirmed',
        'in_progress'
    ) THEN
        RAISE EXCEPTION
            'Cette réservation ne peut pas recevoir de paiement';
    END IF;


    -- ------------------------------------------------------------------------
    -- ACTIVE INVOICE
    -- ------------------------------------------------------------------------

    SELECT
        i.*
    INTO
        v_invoice
    FROM public.invoices i
    WHERE
        i.booking_id = v_booking.id
        AND i.kind =
            'booking'::public.invoice_kind
        AND i.status <>
            'cancelled'::public.invoice_status
    ORDER BY
        i.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Aucune facture active associée à ce lien';
    END IF;

    IF coalesce(
        v_invoice.amount,
        0
    ) <= 0 THEN
        RAISE EXCEPTION
            'Montant de facture invalide';
    END IF;

    IF trim(
        coalesce(
            v_invoice.currency,
            ''
        )
    ) = '' THEN
        RAISE EXCEPTION
            'Devise de facture invalide';
    END IF;


    -- ------------------------------------------------------------------------
    -- PSP ORCHESTRATION LOCK
    --
    -- Verrou global à la facture.
    -- Orange et MTN ne disposent donc plus de verrous indépendants.
    -- ------------------------------------------------------------------------

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            concat_ws(
                ':',
                'short_rental_psp',
                v_invoice.id::text
            ),
            0
        )
    );


    -- ------------------------------------------------------------------------
    -- NET PAID
    -- ------------------------------------------------------------------------

    SELECT
        GREATEST(
            COALESCE(
                SUM(
                    CASE

                        WHEN
                            p.status =
                                'completed'::public.payment_status
                            AND p.is_refund = false
                        THEN
                            p.amount

                        WHEN
                            p.status =
                                'completed'::public.payment_status
                            AND p.is_refund = true
                        THEN
                            -p.amount

                        WHEN
                            p.status =
                                'refunded'::public.payment_status
                        THEN
                            -p.amount

                        ELSE
                            0

                    END
                ),
                0
            ),
            0
        )
    INTO
        v_net_paid
    FROM public.payments p
    WHERE
        p.invoice_id = v_invoice.id;


    -- ------------------------------------------------------------------------
    -- REMAINING
    -- ------------------------------------------------------------------------

    v_remaining :=
        GREATEST(
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

    IF v_remaining <= 0 THEN
        RAISE EXCEPTION
            'Cette facture est déjà entièrement payée';
    END IF;


    -- ------------------------------------------------------------------------
    -- INITIAL PAYMENT PERCENT
    -- ------------------------------------------------------------------------

    IF
        v_booking.payment_plan =
            'half'::public.short_rental_payment_plan
    THEN

        v_initial_percent :=
            coalesce(
                v_booking.initial_payment_percent,
                50
            );

    ELSE
        v_initial_percent := 100;
    END IF;

    IF
        v_initial_percent <= 0
        OR v_initial_percent > 100
    THEN
        RAISE EXCEPTION
            'Pourcentage de paiement initial invalide';
    END IF;


    -- ------------------------------------------------------------------------
    -- AMOUNT DUE NOW
    -- ------------------------------------------------------------------------

    IF v_net_paid <= 0 THEN

        v_due_now :=
            LEAST(
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

    ELSE
        v_due_now :=
            v_remaining;
    END IF;

    IF coalesce(
        v_due_now,
        0
    ) <= 0 THEN
        RAISE EXCEPTION
            'Aucun montant à payer actuellement';
    END IF;


    -- ------------------------------------------------------------------------
    -- FIRST PAYMENT DEADLINE
    -- ------------------------------------------------------------------------

    v_deadline_passed :=
        (
            v_net_paid <= 0
            AND v_booking.payment_due_at IS NOT NULL
            AND now() > v_booking.payment_due_at
        );

    IF v_deadline_passed THEN
        RAISE EXCEPTION
            'Le délai de paiement de cette réservation est dépassé';
    END IF;


    -- ------------------------------------------------------------------------
    -- IDEMPOTENCE
    --
    -- Une tentative strictement identique déjà ouverte est réutilisée.
    -- ------------------------------------------------------------------------

    SELECT
        t.*
    INTO
        v_existing
    FROM public.payment_provider_transactions t
    WHERE
        t.invoice_id = v_invoice.id
        AND t.booking_id = v_booking.id
        AND t.provider = v_provider
        AND t.payment_method = v_payment_method
        AND t.payment_id IS NULL
        AND t.status IN (
            'pending',
            'processing'
        )
        AND t.amount = v_due_now
        AND upper(
            trim(
                t.currency
            )
        ) =
            upper(
                trim(
                    v_invoice.currency
                )
            )
    ORDER BY
        t.created_at DESC,
        t.id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN

        UPDATE public.short_rental_payment_access
        SET
            last_accessed_at = now()
        WHERE
            id = v_access.id;

        RETURN QUERY
        SELECT
            v_existing.id,
            v_existing.provider_transaction_id,
            v_booking.id,
            v_booking.reference,
            v_invoice.id,
            v_invoice.number,
            v_existing.provider,
            v_existing.payment_method,
            v_existing.amount,
            v_existing.currency,
            v_existing.status,
            true,
            v_existing.created_at;

        RETURN;

    END IF;


    -- ------------------------------------------------------------------------
    -- SINGLE OPEN PSP ATTEMPT PER INVOICE
    --
    -- Si une autre tentative pending/processing existe, quel que soit
    -- l'opérateur ou le moyen de paiement, aucune nouvelle transaction
    -- ne peut être créée.
    -- ------------------------------------------------------------------------

    IF EXISTS (

        SELECT
            1
        FROM public.payment_provider_transactions t
        WHERE
            t.invoice_id = v_invoice.id
            AND t.booking_id = v_booking.id
            AND t.payment_id IS NULL
            AND t.status IN (
                'pending',
                'processing'
            )

    ) THEN

        RAISE EXCEPTION
            'Une tentative de paiement est déjà en cours pour cette facture';

    END IF;


    -- ------------------------------------------------------------------------
    -- MERCHANT TRANSACTION ID
    -- ------------------------------------------------------------------------

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


    -- ------------------------------------------------------------------------
    -- CREATE PSP TRANSACTION
    -- ------------------------------------------------------------------------

    INSERT INTO public.payment_provider_transactions (
        payment_id,
        invoice_id,
        booking_id,
        provider,
        provider_transaction_id,
        provider_reference,
        payment_method,
        amount,
        currency,
        status,
        initiated_at
    )
    VALUES (
        NULL,
        v_invoice.id,
        v_booking.id,
        v_provider,
        v_provider_transaction_id,
        NULL,
        v_payment_method,
        v_due_now,
        upper(
            trim(
                v_invoice.currency
            )
        ),
        'pending',
        now()
    )
    RETURNING *
    INTO
        v_created;


    -- ------------------------------------------------------------------------
    -- ACCESS AUDIT
    -- ------------------------------------------------------------------------

    UPDATE public.short_rental_payment_access
    SET
        last_accessed_at = now()
    WHERE
        id = v_access.id;


    -- ------------------------------------------------------------------------
    -- SANITIZED RESULT
    -- ------------------------------------------------------------------------

    RETURN QUERY
    SELECT
        v_created.id,
        v_created.provider_transaction_id,
        v_booking.id,
        v_booking.reference,
        v_invoice.id,
        v_invoice.number,
        v_created.provider,
        v_created.payment_method,
        v_created.amount,
        v_created.currency,
        v_created.status,
        false,
        v_created.created_at;

END;

$function$;


-- ============================================================================
-- PRIVILEGES
-- ============================================================================

REVOKE ALL
ON FUNCTION public.create_short_rental_provider_transaction(
    text,
    text,
    text
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.create_short_rental_provider_transaction(
    text,
    text,
    text
)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.create_short_rental_provider_transaction(
    text,
    text,
    text
)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.create_short_rental_provider_transaction(
    text,
    text,
    text
)
TO postgres;

GRANT EXECUTE
ON FUNCTION public.create_short_rental_provider_transaction(
    text,
    text,
    text
)
TO service_role;