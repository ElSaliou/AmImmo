-- ============================================================
-- F2.2C-7C-B
-- GUEST INSPECTION AUTHORIZATION
--
-- Lease inspection:
--   lease.tenant_id -> is_tenant_of()
--
-- Short-rental inspection:
--   booking.guest_id -> is_guest_of()
--
-- No anon access.
-- No Storage policy change.
-- No documents policy change.
-- No RPC signature change.
-- ============================================================

begin;


-- ============================================================
-- 1. can_read_inspection()
-- ============================================================

create or replace function public.can_read_inspection(
    p_inspection_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$

    select exists (

        select 1

        from public.inspections i

        left join public.leases l
            on l.id = i.lease_id

        left join public.bookings b
            on b.id = i.booking_id

        where
            i.id = p_inspection_id

            and (

                -- ------------------------------------------------
                -- STAFF
                -- ------------------------------------------------

                (
                    public.is_staff(
                        auth.uid()
                    )

                    and i.organization_id =
                        public.current_org_id()
                )


                -- ------------------------------------------------
                -- LONG-TERM TENANT
                -- ------------------------------------------------

                or (

                    i.lease_id is not null

                    and l.tenant_id is not null

                    and public.is_tenant_of(
                        l.tenant_id
                    )
                )


                -- ------------------------------------------------
                -- SHORT-RENTAL GUEST
                -- ------------------------------------------------

                or (

                    i.booking_id is not null

                    and b.guest_id is not null

                    and public.is_guest_of(
                        b.guest_id
                    )
                )
            )
    );

$function$;


-- ============================================================
-- 2. sign_inspection()
-- ============================================================

create or replace function public.sign_inspection(
    p_inspection_id uuid,
    p_signer_role public.inspection_signer_role,
    p_signer_name text,
    p_signature_method text default 'typed'::text,
    p_signature_document_id uuid default null::uuid,
    p_accepted_version integer default null::integer,
    p_ip_address inet default null::inet,
    p_user_agent text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_user_id uuid;
    v_org_id uuid;

    v_inspection
        public.inspections%rowtype;

    v_signature
        public.inspection_signatures%rowtype;

    v_existing
        public.inspection_signatures%rowtype;

    v_required_counterparty_role
        public.inspection_signer_role;

    v_counterparty_id uuid;

    v_method text;
    v_name text;

    v_signature_document
        public.documents%rowtype;

begin

    -- ========================================================
    -- AUTH
    -- ========================================================

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentification requise.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- LOCK INSPECTION
    -- ========================================================

    select i.*
    into v_inspection

    from public.inspections i

    where
        i.id = p_inspection_id

    for update;


    if not found then

        raise exception
            'État des lieux introuvable.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- STATUS
    -- ========================================================

    if v_inspection.status
       <> 'ready_for_signature'::public.inspection_status
    then

        raise exception
            'Cet état des lieux n''est pas ouvert à la signature.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- VERSION ACCEPTED
    -- ========================================================

    if p_accepted_version is null
       or p_accepted_version <>
            v_inspection.version
    then

        raise exception
            'La version signée ne correspond pas à la version actuelle de l''état des lieux.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- NAME
    -- ========================================================

    v_name :=
        nullif(
            btrim(
                coalesce(
                    p_signer_name,
                    ''
                )
            ),
            ''
        );


    if v_name is null then

        raise exception
            'Le nom du signataire est obligatoire.'
            using errcode = 'P0001';

    end if;


    if char_length(v_name) > 255 then

        raise exception
            'Le nom du signataire est trop long.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- METHOD
    -- ========================================================

    v_method :=
        lower(
            btrim(
                coalesce(
                    p_signature_method,
                    ''
                )
            )
        );


    if v_method not in (
        'drawn',
        'typed',
        'otp',
        'other'
    ) then

        raise exception
            'Méthode de signature invalide.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- IDENTIFY EXPECTED COUNTERPARTY
    --
    -- Lease:
    --   tenant_id + tenant role
    --
    -- Booking:
    --   guest_id + guest role
    -- ========================================================

    if v_inspection.lease_id is not null then

        select l.tenant_id
        into v_counterparty_id

        from public.leases l

        where
            l.id =
                v_inspection.lease_id;


        v_required_counterparty_role :=
            'tenant'::public.inspection_signer_role;


    else

        select b.guest_id
        into v_counterparty_id

        from public.bookings b

        where
            b.id =
                v_inspection.booking_id;


        v_required_counterparty_role :=
            'guest'::public.inspection_signer_role;

    end if;


    -- ========================================================
    -- AUTHORIZE SIGNER
    -- ========================================================

    if p_signer_role =
       'agency'::public.inspection_signer_role
    then

        v_org_id :=
            public.current_org_id();


        if not public.is_staff(
            v_user_id
        )
        or v_org_id is null
        or v_org_id is distinct from
            v_inspection.organization_id
        then

            raise exception
                'Vous n''êtes pas autorisé à signer pour l''agence.'
                using errcode = 'P0001';

        end if;


    elsif p_signer_role =
          v_required_counterparty_role
    then

        if v_counterparty_id is null then

            raise exception
                'Vous n''êtes pas autorisé à signer cet état des lieux.'
                using errcode = 'P0001';

        end if;


        -- ----------------------------------------------------
        -- TENANT AUTHORIZATION
        -- ----------------------------------------------------

        if v_required_counterparty_role =
           'tenant'::public.inspection_signer_role
        then

            if not public.is_tenant_of(
                v_counterparty_id
            ) then

                raise exception
                    'Vous n''êtes pas autorisé à signer cet état des lieux.'
                    using errcode = 'P0001';

            end if;


        -- ----------------------------------------------------
        -- GUEST AUTHORIZATION
        -- ----------------------------------------------------

        elsif v_required_counterparty_role =
              'guest'::public.inspection_signer_role
        then

            if not public.is_guest_of(
                v_counterparty_id
            ) then

                raise exception
                    'Vous n''êtes pas autorisé à signer cet état des lieux.'
                    using errcode = 'P0001';

            end if;


        else

            raise exception
                'Contrepartie invalide pour cet état des lieux.'
                using errcode = 'P0001';

        end if;


    else

        raise exception
            'Rôle de signataire invalide pour cet état des lieux.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- OPTIONAL SIGNATURE DOCUMENT
    -- ========================================================

    if p_signature_document_id is not null then

        select d.*
        into v_signature_document

        from public.documents d

        where
            d.id =
                p_signature_document_id;


        if not found then

            raise exception
                'Document de signature introuvable.'
                using errcode = 'P0001';

        end if;


        if v_signature_document.organization_id
               is distinct from
               v_inspection.organization_id

           or lower(
                v_signature_document.entity_type
              ) <> 'inspection'

           or v_signature_document.entity_id
               is distinct from
               p_inspection_id
        then

            raise exception
                'Le document de signature ne correspond pas à cet état des lieux.'
                using errcode = 'P0001';

        end if;

    end if;


    -- ========================================================
    -- IDEMPOTENCE
    -- ========================================================

    select s.*
    into v_existing

    from public.inspection_signatures s

    where
        s.inspection_id =
            p_inspection_id

        and s.signer_role =
            p_signer_role;


    if found then

        if v_existing.signer_user_id
               is not distinct from
               v_user_id

           and v_existing.accepted_version =
               v_inspection.version

           and v_existing.signature_method =
               v_method

           and v_existing.signature_document_id
               is not distinct from
               p_signature_document_id
        then

            return jsonb_build_object(

                'signature',
                    to_jsonb(v_existing)
                        - 'ip_address'
                        - 'user_agent',

                'reused',
                    true
            );

        end if;


        raise exception
            'Ce rôle a déjà signé cet état des lieux.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- INSERT IMMUTABLE SIGNATURE RECORD
    -- ========================================================

    insert into public.inspection_signatures (

        inspection_id,

        signer_role,
        signer_user_id,
        signer_name,

        signature_document_id,
        signature_method,

        accepted_version,

        ip_address,
        user_agent

    )
    values (

        p_inspection_id,

        p_signer_role,
        v_user_id,
        v_name,

        p_signature_document_id,
        v_method,

        v_inspection.version,

        p_ip_address,

        nullif(
            btrim(
                coalesce(
                    p_user_agent,
                    ''
                )
            ),
            ''
        )
    )

    returning *
    into v_signature;


    return jsonb_build_object(

        'signature',
            to_jsonb(v_signature)
                - 'ip_address'
                - 'user_agent',

        'inspection_id',
            p_inspection_id,

        'accepted_version',
            v_inspection.version,

        'reused',
            false
    );

end;

$function$;


-- ============================================================
-- 3. PRIVILEGES
-- ============================================================

revoke all
on function public.can_read_inspection(uuid)
from public, anon;

grant execute
on function public.can_read_inspection(uuid)
to authenticated, service_role;


revoke all
on function public.sign_inspection(
    uuid,
    public.inspection_signer_role,
    text,
    text,
    uuid,
    integer,
    inet,
    text
)
from public, anon;


grant execute
on function public.sign_inspection(
    uuid,
    public.inspection_signer_role,
    text,
    text,
    uuid,
    integer,
    inet,
    text
)
to authenticated, service_role;


-- ============================================================
-- 4. DOCUMENTATION
-- ============================================================

comment on function public.can_read_inspection(uuid)
is
'Authorizes staff, the tenant of a lease inspection, or the authenticated guest linked to a short-rental booking.';


comment on function public.sign_inspection(
    uuid,
    public.inspection_signer_role,
    text,
    text,
    uuid,
    integer,
    inet,
    text
)
is
'Signs an inspection using tenant authorization for lease inspections and guest authorization for short-rental booking inspections.';


commit;