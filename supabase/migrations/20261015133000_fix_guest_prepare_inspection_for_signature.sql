-- ============================================================
-- F2.2C-7C-E1A
-- Fix short-rental guest resolution before inspection signature
-- ============================================================

CREATE OR REPLACE FUNCTION public.prepare_inspection_for_signature(
    p_inspection_id uuid,
    p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_inspection public.inspections%rowtype;

    v_room_count integer;
    v_counterparty_id uuid;
    v_counterparty_role public.inspection_signer_role;
BEGIN

    -- --------------------------------------------------------
    -- AUTH
    -- --------------------------------------------------------

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentification requise.'
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT public.is_staff(v_user_id) THEN
        RAISE EXCEPTION
            'Accès refusé.'
            USING ERRCODE = 'P0001';
    END IF;

    v_org_id := public.current_org_id();

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION
            'Organisation courante introuvable.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- LOCK
    -- --------------------------------------------------------

    SELECT i.*
    INTO v_inspection
    FROM public.inspections i
    WHERE i.id = p_inspection_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'État des lieux introuvable.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- ORGANISATION
    -- --------------------------------------------------------

    IF v_inspection.organization_id
       IS DISTINCT FROM v_org_id
    THEN
        RAISE EXCEPTION
            'Cet état des lieux n''appartient pas à l''organisation courante.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- STATUS
    -- --------------------------------------------------------

    IF v_inspection.status
       <> 'draft'::public.inspection_status
    THEN
        RAISE EXCEPTION
            'Seul un état des lieux en brouillon peut être envoyé à la signature.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- OPTIMISTIC VERSION CHECK
    -- --------------------------------------------------------

    IF p_expected_version IS NULL
       OR p_expected_version <> v_inspection.version
    THEN
        RAISE EXCEPTION
            'La version de l''état des lieux a changé. Rechargez les données avant de continuer.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- MINIMUM CONTENT
    -- --------------------------------------------------------

    SELECT count(*)
    INTO v_room_count
    FROM public.inspection_rooms r
    WHERE r.inspection_id = p_inspection_id;

    IF v_room_count = 0 THEN
        RAISE EXCEPTION
            'Ajoutez au moins une pièce avant d''envoyer l''état des lieux à la signature.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- COUNTERPARTY
    --
    -- lease   -> tenant_id / tenant
    -- booking -> guest_id  / guest
    -- --------------------------------------------------------

    IF v_inspection.lease_id IS NOT NULL THEN

        SELECT l.tenant_id
        INTO v_counterparty_id

        FROM public.leases l

        WHERE l.id =
            v_inspection.lease_id;


        v_counterparty_role :=
            'tenant'::public.inspection_signer_role;

    ELSE

        SELECT b.guest_id
        INTO v_counterparty_id

        FROM public.bookings b

        WHERE b.id =
            v_inspection.booking_id;


        v_counterparty_role :=
            'guest'::public.inspection_signer_role;

    END IF;


    IF v_counterparty_id IS NULL THEN
        RAISE EXCEPTION
            'Aucun locataire ou voyageur n''est associé à cet état des lieux.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- DEFENSIVE CHECK
    -- --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM public.inspection_signatures s
        WHERE s.inspection_id = p_inspection_id
    ) THEN
        RAISE EXCEPTION
            'Des signatures existent déjà sur cet état des lieux en brouillon.'
            USING ERRCODE = 'P0001';
    END IF;


    -- --------------------------------------------------------
    -- TRANSITION
    -- --------------------------------------------------------

    UPDATE public.inspections

    SET status =
        'ready_for_signature'::public.inspection_status

    WHERE id =
        p_inspection_id;


    RETURN jsonb_build_object(
        'inspection_id',
            p_inspection_id,

        'status',
            'ready_for_signature',

        'version',
            v_inspection.version,

        'required_signers',
            jsonb_build_array(
                'agency',
                v_counterparty_role::text
            )
    );

END;
$function$;