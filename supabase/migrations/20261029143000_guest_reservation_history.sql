-- ============================================================================
-- AMIMMO — GUEST RESERVATION HISTORY
--
-- Identity rule:
--   same normalized email + same organization = same booking history
--
-- Security:
--   auth.uid()
--     -> guests.user_id
--     -> guest.organization_id
--     -> confirmed Auth email
--     -> normalized guest email
--     -> booking history
--
-- Never:
--   - merge by name
--   - merge by phone
--   - trust an email supplied by the browser
-- ============================================================================

begin;


-- ============================================================================
-- 1. LOOKUP INDEX
-- ============================================================================

create index if not exists
    idx_bookings_org_normalized_guest_email
on public.bookings (
    organization_id,
    lower(btrim(guest_email))
);


-- ============================================================================
-- 2. AUTHENTICATED GUEST BOOKING HISTORY
-- ============================================================================

create or replace function public.list_my_guest_bookings()
returns table (

    booking_id uuid,
    booking_reference text,
    booking_status text,

    guest_name text,
    guest_email text,
    guests_count integer,

    check_in date,
    check_out date,

    total_amount numeric,
    currency text,
    deposit_amount numeric,

    property_id uuid,
    property_reference text,
    property_title text,
    property_city text,
    property_commune text,
    property_district text,

    invoice_id uuid,
    invoice_number text,
    invoice_status text,
    invoice_amount numeric,

    paid_amount numeric,
    remaining_amount numeric,
    payment_status text,

    confirmed_at timestamptz,
    checked_in_at timestamptz,
    checked_out_at timestamptz,
    cancelled_at timestamptz,

    created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
#variable_conflict use_column

declare

    v_user_id uuid;

    v_guest
        public.guests%rowtype;

    v_guest_email text;

    v_auth_email text;
    v_email_confirmed_at timestamptz;

begin

    -- ------------------------------------------------------------------------
    -- AUTHENTICATED USER
    -- ------------------------------------------------------------------------

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentification requise.'
            using errcode = '42501';

    end if;


    -- ------------------------------------------------------------------------
    -- CANONICAL GUEST LINKED TO AUTH USER
    -- ------------------------------------------------------------------------

    select
        g.*
    into
        v_guest

    from public.guests g

    where
        g.user_id =
            v_user_id

    limit 1;


    if not found then

        raise exception
            'Aucun profil voyageur associé à ce compte.'
            using errcode = '42501';

    end if;


    if v_guest.organization_id is null then

        raise exception
            'Organisation voyageur introuvable.'
            using errcode = '42501';

    end if;


    -- ------------------------------------------------------------------------
    -- CANONICAL GUEST EMAIL
    -- ------------------------------------------------------------------------

    v_guest_email :=
        lower(
            btrim(
                coalesce(
                    v_guest.email,
                    ''
                )
            )
        );


    if v_guest_email = '' then

        raise exception
            'Adresse email voyageur introuvable.'
            using errcode = '42501';

    end if;


    -- ------------------------------------------------------------------------
    -- VERIFIED AUTH EMAIL
    -- ------------------------------------------------------------------------

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
            using errcode = '42501';

    end if;


    if v_email_confirmed_at is null then

        raise exception
            'Votre adresse email doit être confirmée.'
            using errcode = '42501';

    end if;


    if v_auth_email = ''
       or v_auth_email
            is distinct from
            v_guest_email
    then

        raise exception
            'Le compte connecté ne correspond pas au profil voyageur.'
            using errcode = '42501';

    end if;


    -- ------------------------------------------------------------------------
    -- BOOKING HISTORY
    --
    -- IMPORTANT:
    --
    -- guest_id is deliberately NOT used as the historical identity boundary.
    --
    -- This includes legacy reservations where:
    --   - guest_id references an older duplicate guest row;
    --   - guest_id is NULL;
    --   - the booking predates canonical guest linking.
    --
    -- Historical identity is strictly:
    --
    --   organization_id + normalized email
    -- ------------------------------------------------------------------------

    return query

    select

        b.id,
        b.reference,
        b.status::text,

        b.guest_name,
        lower(
            btrim(
                b.guest_email
            )
        ),
        b.guests_count,

        b.check_in,
        b.check_out,

        b.total_amount,
        b.currency,
        b.deposit,

        p.id,
        p.reference,
        p.title,
        p.city,
        p.commune,
        p.district,

        inv.id,
        inv.number,
        inv.status,
        inv.amount,

        coalesce(
            financial.net_paid,
            0
        ),

        case

            when inv.id is null then

                greatest(
                    b.total_amount,
                    0
                )

            else

                greatest(
                    inv.amount
                    -
                    coalesce(
                        financial.net_paid,
                        0
                    ),
                    0
                )

        end,

        case

            when inv.id is null then
                'not_invoiced'

            when inv.status = 'cancelled' then
                'cancelled'

            when
                inv.amount > 0
                and greatest(
                    inv.amount
                    -
                    coalesce(
                        financial.net_paid,
                        0
                    ),
                    0
                ) <= 0
            then
                'paid'

            when
                coalesce(
                    financial.net_paid,
                    0
                ) > 0
            then
                'partially_paid'

            else
                coalesce(
                    inv.status,
                    'unpaid'
                )

        end,

        b.confirmed_at,
        b.checked_in_at,
        b.checked_out_at,
        b.cancelled_at,

        b.created_at

    from public.bookings b


    left join public.properties p

        on p.id =
            b.property_id

        and p.organization_id =
            b.organization_id


    left join lateral (

        select

            i.id,
            i.number,
            i.status::text as status,
            i.amount

        from public.invoices i

        where

            i.booking_id =
                b.id

            and i.organization_id =
                b.organization_id

            and i.kind::text =
                'booking'

        order by

            i.created_at desc,
            i.id desc

        limit 1

    ) inv
        on true


    left join lateral (

        select

            greatest(
                coalesce(
                    sum(
                        case

                            when
                                pay.status::text = 'completed'
                                and pay.is_refund = false
                            then
                                pay.amount

                            when
                                pay.status::text = 'completed'
                                and pay.is_refund = true
                            then
                                -pay.amount

                            when
                                pay.status::text = 'refunded'
                            then
                                -pay.amount

                            else
                                0

                        end
                    ),
                    0
                ),
                0
            )::numeric as net_paid

        from public.payments pay

        where
            pay.invoice_id =
                inv.id

    ) financial
        on true


    where

        b.organization_id =
            v_guest.organization_id

        and lower(
            btrim(
                b.guest_email
            )
        ) =
            v_guest_email


    order by

        b.check_in desc,
        b.created_at desc,
        b.id desc;

end;

$function$;


-- ============================================================================
-- 3. PRIVILEGES
-- ============================================================================

revoke all
on function public.list_my_guest_bookings()
from public, anon;


grant execute
on function public.list_my_guest_bookings()
to authenticated, service_role;


-- ============================================================================
-- 4. DOCUMENTATION
-- ============================================================================

comment on function public.list_my_guest_bookings()
is
'Returns booking history for the authenticated guest using organization_id + normalized confirmed email. Name and phone are never identity criteria.';


commit;