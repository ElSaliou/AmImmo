-- ============================================================
-- AMIMMO-PREST-P3-B1
-- Controlled public service quote RPC.
--
-- Security model:
--   browser -> Edge Function -> service_role -> RPC
--
-- This function is NOT executable by anon/authenticated.
-- No public INSERT policy is added to quote_requests.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_public_quote_request(
    p_service_id uuid,
    p_customer_name text,
    p_message text,
    p_customer_email text DEFAULT NULL,
    p_customer_phone text DEFAULT NULL,
    p_subject text DEFAULT NULL,
    p_property_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_quote_request_id uuid;

    v_customer_name text;
    v_customer_email text;
    v_customer_phone text;
    v_subject text;
    v_message text;

    v_service_exists boolean;
    v_property_exists boolean;
BEGIN
    -- --------------------------------------------------------
    -- Normalize public input.
    -- Empty optional values become NULL.
    -- --------------------------------------------------------

    v_customer_name := btrim(COALESCE(p_customer_name, ''));
    v_message := btrim(COALESCE(p_message, ''));

    v_customer_email :=
        NULLIF(lower(btrim(COALESCE(p_customer_email, ''))), '');

    v_customer_phone :=
        NULLIF(btrim(COALESCE(p_customer_phone, '')), '');

    v_subject :=
        NULLIF(btrim(COALESCE(p_subject, '')), '');


    -- --------------------------------------------------------
    -- Required payload validation.
    -- --------------------------------------------------------

    IF p_service_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_SERVICE'
            USING ERRCODE = '22023';
    END IF;

    IF char_length(v_customer_name) < 2
       OR char_length(v_customer_name) > 120 THEN
        RAISE EXCEPTION 'INVALID_CUSTOMER_NAME'
            USING ERRCODE = '22023';
    END IF;

    IF char_length(v_message) < 10
       OR char_length(v_message) > 5000 THEN
        RAISE EXCEPTION 'INVALID_MESSAGE'
            USING ERRCODE = '22023';
    END IF;

    IF v_customer_email IS NULL
       AND v_customer_phone IS NULL THEN
        RAISE EXCEPTION 'CONTACT_REQUIRED'
            USING ERRCODE = '22023';
    END IF;

    IF v_customer_email IS NOT NULL
       AND char_length(v_customer_email) > 254 THEN
        RAISE EXCEPTION 'INVALID_EMAIL'
            USING ERRCODE = '22023';
    END IF;

    IF v_customer_phone IS NOT NULL
       AND char_length(v_customer_phone) > 40 THEN
        RAISE EXCEPTION 'INVALID_PHONE'
            USING ERRCODE = '22023';
    END IF;

    IF v_subject IS NOT NULL
       AND char_length(v_subject) > 180 THEN
        RAISE EXCEPTION 'INVALID_SUBJECT'
            USING ERRCODE = '22023';
    END IF;


    -- --------------------------------------------------------
    -- The requested service must really be publicly available.
    --
    -- A published service attached to an inactive category must
    -- not accept new public quote requests.
    --
    -- A published service without category remains valid.
    -- --------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.services AS s
        LEFT JOIN public.service_categories AS sc
          ON sc.id = s.category_id
        WHERE s.id = p_service_id
          AND s.status = 'published'::public.service_status
          AND s.published_at IS NOT NULL
          AND (
              s.category_id IS NULL
              OR sc.is_active IS TRUE
          )
    )
    INTO v_service_exists;

    IF NOT v_service_exists THEN
        RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE'
            USING ERRCODE = '22023';
    END IF;


    -- --------------------------------------------------------
    -- Optional property binding.
    -- Only guarantee referential existence here.
    -- Business qualification remains an agency responsibility.
    -- --------------------------------------------------------

    IF p_property_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.properties AS p
            WHERE p.id = p_property_id
        )
        INTO v_property_exists;

        IF NOT v_property_exists THEN
            RAISE EXCEPTION 'INVALID_PROPERTY'
                USING ERRCODE = '22023';
        END IF;
    END IF;


    -- --------------------------------------------------------
    -- Controlled insertion.
    --
    -- Internal workflow fields are never accepted from the
    -- public caller.
    -- --------------------------------------------------------

    INSERT INTO public.quote_requests (
        service_id,
        property_id,
        booking_id,
        lead_id,
        customer_name,
        customer_email,
        customer_phone,
        subject,
        message,
        status,
        assigned_to,
        internal_notes,
        agency_response,
        responded_at,
        closed_at
    )
    VALUES (
        p_service_id,
        p_property_id,
        NULL,
        NULL,
        v_customer_name,
        v_customer_email,
        v_customer_phone,
        v_subject,
        v_message,
        'new'::public.quote_request_status,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    )
    RETURNING id
    INTO v_quote_request_id;

    RETURN v_quote_request_id;
END;
$function$;


-- ============================================================
-- RPC privilege boundary.
--
-- PUBLIC is revoked first because PostgreSQL functions normally
-- receive EXECUTE for PUBLIC unless explicitly restricted.
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_public_quote_request(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.create_public_quote_request(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
FROM anon;

REVOKE ALL
ON FUNCTION public.create_public_quote_request(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.create_public_quote_request(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
TO service_role;