-- ============================================================
-- F2.2C-7C-D1
-- GUEST INSPECTION LISTING
--
-- PURPOSE
--
-- Return only inspections attached to bookings belonging to
-- the currently authenticated guest.
--
-- Identity chain:
--
-- auth.uid()
--      ↓
-- guests.user_id
--      ↓
-- my_guest_id()
--      ↓
-- bookings.guest_id
--      ↓
-- inspections.booking_id
--
-- SECURITY
--
-- - authenticated guest required
-- - no client-provided guest_id
-- - no email-based authorization
-- - no payment token
-- - no direct browser trust
-- - can_read_inspection() remains authoritative
-- ============================================================

begin;


create or replace function public.list_my_guest_inspections()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_user_id uuid;

    v_guest_id uuid;

    v_result jsonb;

begin

    -- --------------------------------------------------------
    -- AUTHENTICATION
    -- --------------------------------------------------------

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentification requise.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- CANONICAL GUEST IDENTITY
    -- --------------------------------------------------------

    v_guest_id :=
        public.my_guest_id();


    if v_guest_id is null then

        raise exception
            'Accès voyageur requis.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- AUTHORIZED INSPECTIONS
    --
    -- No guest identifier is supplied by the browser.
    --
    -- The booking relation establishes ownership and
    -- can_read_inspection() provides defense in depth.
    -- --------------------------------------------------------

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(

                    'id',
                        i.id,

                    'reference',
                        i.reference,

                    'kind',
                        i.kind,

                    'status',
                        i.status,

                    'version',
                        i.version,

                    'performed_at',
                        i.performed_at,

                    'booking_id',
                        i.booking_id,

                    'final_document_id',
                        i.final_document_id

                )
                order by
                    i.performed_at desc nulls last,
                    i.id desc
            ),
            '[]'::jsonb
        )

    into
        v_result

    from public.inspections i

    inner join public.bookings b
        on b.id =
            i.booking_id

    where
        b.guest_id =
            v_guest_id

        and i.booking_id is not null

        and public.can_read_inspection(
            i.id
        ) = true;


    return
        coalesce(
            v_result,
            '[]'::jsonb
        );

end;

$function$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all
on function public.list_my_guest_inspections()
from public, anon;


grant execute
on function public.list_my_guest_inspections()
to authenticated, service_role;


-- ============================================================
-- COMMENT
-- ============================================================

comment on function public.list_my_guest_inspections()
is
'Returns inspections belonging to bookings of the currently authenticated guest. Guest identity is resolved exclusively through my_guest_id() and every returned inspection must also satisfy can_read_inspection().';


commit;