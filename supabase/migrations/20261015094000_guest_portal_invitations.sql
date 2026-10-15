-- ============================================================
-- F2.2C-7C-C1
-- SECURE GUEST PORTAL INVITATIONS
--
-- PURPOSE
--
-- Staff:
--   create_guest_portal_invitation()
--
-- Authenticated guest:
--   redeem_guest_portal_invitation()
--
-- Security:
--   - raw token is NEVER stored
--   - only SHA-256 token hash is stored
--   - invitation is bound to a guest record
--   - invitation is bound to guest email snapshot
--   - redeem requires authenticated + confirmed matching email
--   - email alone NEVER authorizes the binding
--   - anon has no access
-- ============================================================

begin;


-- ============================================================
-- 1. INVITATION TABLE
-- ============================================================

create table if not exists public.guest_portal_invitations (

    id uuid
        primary key
        default gen_random_uuid(),

    guest_id uuid
        not null
        references public.guests(id)
        on delete cascade,

    token_hash text
        not null,

    invited_email text
        not null,

    expires_at timestamptz
        not null,

    redeemed_at timestamptz
        null,

    redeemed_by uuid
        null
        references auth.users(id)
        on delete set null,

    revoked_at timestamptz
        null,

    created_by uuid
        not null
        references auth.users(id)
        on delete restrict,

    created_at timestamptz
        not null
        default now(),

    constraint guest_portal_invitations_token_hash_key
        unique (token_hash),

    constraint guest_portal_invitations_email_not_blank
        check (
            length(
                btrim(invited_email)
            ) > 0
        ),

    constraint guest_portal_invitations_expiration_valid
        check (
            expires_at > created_at
        )
);


create index if not exists
    idx_guest_portal_invitations_guest
on public.guest_portal_invitations(
    guest_id,
    created_at desc
);


create index if not exists
    idx_guest_portal_invitations_active
on public.guest_portal_invitations(
    guest_id,
    expires_at
)
where
    redeemed_at is null
    and revoked_at is null;


-- ============================================================
-- 2. TABLE SECURITY
--
-- No direct browser access.
-- All operations go through controlled SECURITY DEFINER RPCs.
-- ============================================================

alter table public.guest_portal_invitations
enable row level security;


revoke all
on table public.guest_portal_invitations
from public, anon, authenticated;


grant all
on table public.guest_portal_invitations
to service_role;


-- ============================================================
-- 3. CREATE INVITATION
--
-- Staff only.
--
-- Returns raw_token ONCE.
-- Database stores only SHA-256 hash.
-- ============================================================

create or replace function public.create_guest_portal_invitation(
    p_guest_id uuid,
    p_expires_in_minutes integer default 1440
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$

declare

    v_user_id uuid;
    v_org_id uuid;

    v_guest public.guests%rowtype;

    v_email text;

    v_raw_token text;
    v_token_hash text;

    v_invitation_id uuid;
    v_expires_at timestamptz;

begin

    -- --------------------------------------------------------
    -- AUTH
    -- --------------------------------------------------------

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentification requise.'
            using errcode = '42501';

    end if;


    if not public.is_staff(
        v_user_id
    ) then

        raise exception
            'Accès refusé.'
            using errcode = '42501';

    end if;


    v_org_id :=
        public.current_org_id();


    if v_org_id is null then

        raise exception
            'Organisation courante introuvable.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- INPUT
    -- --------------------------------------------------------

    if p_guest_id is null then

        raise exception
            'Voyageur obligatoire.'
            using errcode = '22023';

    end if;


    if p_expires_in_minutes is null
       or p_expires_in_minutes < 15
       or p_expires_in_minutes > 10080
    then

        raise exception
            'La durée de validité doit être comprise entre 15 minutes et 7 jours.'
            using errcode = '22023';

    end if;


    -- --------------------------------------------------------
    -- LOCK GUEST
    -- --------------------------------------------------------

    select g.*
    into v_guest

    from public.guests g

    where
        g.id = p_guest_id

    for update;


    if not found then

        raise exception
            'Voyageur introuvable.'
            using errcode = 'P0002';

    end if;


    -- --------------------------------------------------------
    -- ORGANIZATION BOUNDARY
    -- --------------------------------------------------------

    if v_guest.organization_id is null
       or v_guest.organization_id
            is distinct from
            v_org_id
    then

        raise exception
            'Ce voyageur n''appartient pas à votre organisation.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- ALREADY LINKED
    -- --------------------------------------------------------

    if v_guest.user_id is not null then

        raise exception
            'Ce voyageur possède déjà un compte lié.'
            using errcode = '23505';

    end if;


    -- --------------------------------------------------------
    -- EMAIL SNAPSHOT
    -- --------------------------------------------------------

    v_email :=
        lower(
            btrim(
                coalesce(
                    v_guest.email,
                    ''
                )
            )
        );


    if v_email = '' then

        raise exception
            'Le voyageur doit avoir une adresse email avant invitation.'
            using errcode = '22023';

    end if;


    -- --------------------------------------------------------
    -- REVOKE PREVIOUS ACTIVE INVITATIONS
    -- --------------------------------------------------------

    update public.guest_portal_invitations

    set
        revoked_at = now()

    where
        guest_id = p_guest_id

        and redeemed_at is null

        and revoked_at is null;


    -- --------------------------------------------------------
    -- GENERATE HIGH-ENTROPY TOKEN
    -- --------------------------------------------------------

    v_raw_token :=
        encode(
            extensions.gen_random_bytes(32),
            'hex'
        );


    v_token_hash :=
        encode(
            extensions.digest(
                convert_to(
                    v_raw_token,
                    'UTF8'
                ),
                'sha256'
            ),
            'hex'
        );


    v_expires_at :=
        now()
        + make_interval(
            mins => p_expires_in_minutes
        );


    -- --------------------------------------------------------
    -- STORE HASH ONLY
    -- --------------------------------------------------------

    insert into public.guest_portal_invitations (

        guest_id,
        token_hash,
        invited_email,

        expires_at,

        created_by

    )
    values (

        p_guest_id,
        v_token_hash,
        v_email,

        v_expires_at,

        v_user_id

    )

    returning id
    into v_invitation_id;


    -- --------------------------------------------------------
    -- RAW TOKEN RETURNED ONCE TO AUTHORIZED STAFF
    -- --------------------------------------------------------

    return jsonb_build_object(

        'invitation_id',
            v_invitation_id,

        'guest_id',
            p_guest_id,

        'email',
            v_email,

        'expires_at',
            v_expires_at,

        'token',
            v_raw_token
    );

end;

$function$;


-- ============================================================
-- 4. REDEEM INVITATION
--
-- Authenticated user only.
--
-- Requirements:
--   - valid bearer token
--   - token not expired/revoked/redeemed
--   - auth.users email confirmed
--   - authenticated email matches invitation email
--
-- Email equality is NOT sufficient by itself.
-- ============================================================

create or replace function public.redeem_guest_portal_invitation(
    p_token text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$

declare

    v_user_id uuid;

    v_token text;
    v_token_hash text;

    v_invitation
        public.guest_portal_invitations%rowtype;

    v_guest
        public.guests%rowtype;

    v_auth_email text;
    v_email_confirmed_at timestamptz;

    v_existing_guest_id uuid;

begin

    -- --------------------------------------------------------
    -- AUTHENTICATED USER REQUIRED
    -- --------------------------------------------------------

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentification requise.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- TOKEN
    -- --------------------------------------------------------

    v_token :=
        nullif(
            btrim(
                coalesce(
                    p_token,
                    ''
                )
            ),
            ''
        );


    if v_token is null then

        raise exception
            'Invitation invalide.'
            using errcode = '22023';

    end if;


    v_token_hash :=
        encode(
            extensions.digest(
                convert_to(
                    v_token,
                    'UTF8'
                ),
                'sha256'
            ),
            'hex'
        );


    -- --------------------------------------------------------
    -- LOCK INVITATION
    -- --------------------------------------------------------

    select i.*
    into v_invitation

    from public.guest_portal_invitations i

    where
        i.token_hash =
            v_token_hash

    for update;


    if not found then

        raise exception
            'Invitation invalide.'
            using errcode = '42501';

    end if;


    if v_invitation.revoked_at is not null then

        raise exception
            'Cette invitation a été révoquée.'
            using errcode = '42501';

    end if;


    if v_invitation.redeemed_at is not null then

        if v_invitation.redeemed_by
            is not distinct from
            v_user_id
        then

            return jsonb_build_object(

                'guest_id',
                    v_invitation.guest_id,

                'already_redeemed',
                    true
            );

        end if;


        raise exception
            'Cette invitation a déjà été utilisée.'
            using errcode = '42501';

    end if;


    if v_invitation.expires_at <= now() then

        raise exception
            'Cette invitation a expiré.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- AUTH USER + CONFIRMED EMAIL
    -- --------------------------------------------------------

    select
        lower(
            btrim(
                coalesce(
                    u.email,
                    ''
                )
            )
        ),
        u.email_confirmed_at

    into
        v_auth_email,
        v_email_confirmed_at

    from auth.users u

    where
        u.id =
            v_user_id;


    if not found then

        raise exception
            'Utilisateur Auth introuvable.'
            using errcode = 'P0002';

    end if;


    if v_email_confirmed_at is null then

        raise exception
            'Votre adresse email doit être confirmée avant activation du portail.'
            using errcode = '42501';

    end if;


    if v_auth_email = ''
       or v_auth_email
            is distinct from
            lower(
                btrim(
                    v_invitation.invited_email
                )
            )
    then

        raise exception
            'Le compte connecté ne correspond pas à l''invitation.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- LOCK GUEST
    -- --------------------------------------------------------

    select g.*
    into v_guest

    from public.guests g

    where
        g.id =
            v_invitation.guest_id

    for update;


    if not found then

        raise exception
            'Voyageur introuvable.'
            using errcode = 'P0002';

    end if;


    -- --------------------------------------------------------
    -- INVITATION EMAIL MUST STILL MATCH GUEST
    --
    -- This prevents a stale invitation from silently binding
    -- after the guest identity has been changed by staff.
    -- --------------------------------------------------------

    if lower(
        btrim(
            coalesce(
                v_guest.email,
                ''
            )
        )
    )
    is distinct from
    lower(
        btrim(
            v_invitation.invited_email
        )
    )
    then

        raise exception
            'Les informations du voyageur ont changé depuis la création de l''invitation.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- IDEMPOTENT SAME USER
    -- --------------------------------------------------------

    if v_guest.user_id
        is not distinct from
        v_user_id
    then

        update public.guest_portal_invitations

        set
            redeemed_at =
                coalesce(
                    redeemed_at,
                    now()
                ),

            redeemed_by =
                coalesce(
                    redeemed_by,
                    v_user_id
                )

        where
            id =
                v_invitation.id;


        return jsonb_build_object(

            'guest_id',
                v_guest.id,

            'already_linked',
                true
        );

    end if;


    -- --------------------------------------------------------
    -- GUEST ALREADY LINKED TO SOMEONE ELSE
    -- --------------------------------------------------------

    if v_guest.user_id is not null then

        raise exception
            'Ce voyageur est déjà lié à un autre compte.'
            using errcode = '23505';

    end if;


    -- --------------------------------------------------------
    -- AUTH USER ALREADY LINKED TO ANOTHER GUEST
    -- --------------------------------------------------------

    select g.id
    into v_existing_guest_id

    from public.guests g

    where
        g.user_id =
            v_user_id

        and g.id <>
            v_guest.id

    limit 1;


    if v_existing_guest_id is not null then

        raise exception
            'Ce compte est déjà lié à un autre voyageur.'
            using errcode = '23505';

    end if;


    -- --------------------------------------------------------
    -- BIND AUTH USER TO GUEST
    -- --------------------------------------------------------

    update public.guests

    set
        user_id =
            v_user_id,

        updated_at =
            now()

    where
        id =
            v_guest.id;


    -- --------------------------------------------------------
    -- CONSUME INVITATION
    -- --------------------------------------------------------

    update public.guest_portal_invitations

    set
        redeemed_at =
            now(),

        redeemed_by =
            v_user_id

    where
        id =
            v_invitation.id;


    return jsonb_build_object(

        'guest_id',
            v_guest.id,

        'user_id',
            v_user_id,

        'linked',
            true
    );

end;

$function$;


-- ============================================================
-- 5. RPC PRIVILEGES
-- ============================================================

revoke all
on function public.create_guest_portal_invitation(
    uuid,
    integer
)
from public, anon;


grant execute
on function public.create_guest_portal_invitation(
    uuid,
    integer
)
to authenticated, service_role;


revoke all
on function public.redeem_guest_portal_invitation(
    text
)
from public, anon;


grant execute
on function public.redeem_guest_portal_invitation(
    text
)
to authenticated, service_role;


-- ============================================================
-- 6. COMMENTS
-- ============================================================

comment on table public.guest_portal_invitations
is
'Single-use hashed invitations used to securely bind an authenticated Auth user to a guest portal identity.';


comment on function public.create_guest_portal_invitation(
    uuid,
    integer
)
is
'Staff-only RPC creating a single-use guest portal invitation. Only the SHA-256 hash is persisted; the raw token is returned once.';


comment on function public.redeem_guest_portal_invitation(
    text
)
is
'Authenticated RPC redeeming a guest portal invitation after validating token, expiration, confirmed Auth email and guest email snapshot.';


commit;