begin;


-- ============================================================
-- F2.2C-7C-F2A
-- GUEST ORGANIZATION ANTI-REGRESSION
--
-- Guarantees:
--   1. every guest belongs to one organization;
--   2. staff-created guests inherit current_org_id();
--   3. ordinary staff cannot move guests across organizations;
--   4. RLS scopes guest access to current organization;
--   5. booking.guest_id must belong to booking.organization_id.
-- ============================================================


-- ============================================================
-- 1. PRECONDITIONS
-- ============================================================

do $block$
declare
    v_guests_without_org bigint;
    v_booking_mismatches bigint;
begin

    select count(*)
    into v_guests_without_org
    from public.guests g
    where g.organization_id is null;


    if v_guests_without_org <> 0 then
        raise exception
            'Migration refusée : % voyageur(s) sans organisation.',
            v_guests_without_org
            using errcode = '23514';
    end if;


    select count(*)
    into v_booking_mismatches

    from public.bookings b

    join public.guests g
        on g.id = b.guest_id

    where b.guest_id is not null
      and g.organization_id
          is distinct from
          b.organization_id;


    if v_booking_mismatches <> 0 then
        raise exception
            'Migration refusée : % rattachement(s) booking/voyageur inter-organisation.',
            v_booking_mismatches
            using errcode = '23514';
    end if;

end;
$block$;


-- ============================================================
-- 2. SERVER-SIDE GUEST ORGANIZATION ENFORCEMENT
-- ============================================================

create or replace function
public.enforce_guest_organization_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$

declare

    v_user_id uuid;
    v_current_org_id uuid;
    v_jwt_role text;

begin

    v_user_id :=
        auth.uid();

    v_jwt_role :=
        nullif(
            current_setting(
                'request.jwt.claim.role',
                true
            ),
            ''
        );


    -- --------------------------------------------------------
    -- Administrative / service-role writes
    --
    -- Explicit organization remains mandatory.
    -- This keeps migrations and controlled backend jobs usable.
    -- --------------------------------------------------------

    if v_user_id is null then

        if
            v_jwt_role = 'service_role'
            or current_user in (
                'postgres',
                'supabase_admin',
                'service_role'
            )
        then

            if new.organization_id is null then
                raise exception
                    'organization_id est obligatoire pour un voyageur.'
                    using errcode = '23502';
            end if;

            return new;

        end if;


        raise exception
            'Authentification requise.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- Application writes must come from staff.
    -- --------------------------------------------------------

    if not public.is_staff(
        v_user_id
    ) then

        raise exception
            'Accès refusé.'
            using errcode = '42501';

    end if;


    v_current_org_id :=
        public.current_org_id();


    if v_current_org_id is null then

        raise exception
            'Organisation courante introuvable.'
            using errcode = '42501';

    end if;


    -- --------------------------------------------------------
    -- INSERT
    --
    -- The client does not choose the organization.
    -- Missing organization is derived from authenticated staff.
    -- --------------------------------------------------------

    if tg_op = 'INSERT' then

        if new.organization_id is null then

            new.organization_id :=
                v_current_org_id;

        elsif new.organization_id
                is distinct from
                v_current_org_id
        then

            raise exception
                'Impossible de créer un voyageur dans une autre organisation.'
                using errcode = '42501';

        end if;


        return new;

    end if;


    -- --------------------------------------------------------
    -- UPDATE
    --
    -- Existing row must belong to current organization and the
    -- organization itself is immutable from the application.
    -- --------------------------------------------------------

    if old.organization_id
        is distinct from
        v_current_org_id
    then

        raise exception
            'Ce voyageur n''appartient pas à votre organisation.'
            using errcode = '42501';

    end if;


    if new.organization_id
        is distinct from
        old.organization_id
    then

        raise exception
            'Le rattachement organisationnel d''un voyageur ne peut pas être modifié.'
            using errcode = '42501';

    end if;


    return new;

end;

$function$;


drop trigger if exists
trg_enforce_guest_organization_scope
on public.guests;


create trigger
trg_enforce_guest_organization_scope

before insert
or update of organization_id

on public.guests

for each row

execute function
public.enforce_guest_organization_scope();


-- ============================================================
-- 3. DATABASE INVARIANT
-- ============================================================

alter table public.guests
    alter column organization_id
    set not null;


-- Existing FK used ON DELETE SET NULL, which is incompatible
-- with the new invariant. An organization containing guests
-- must not silently orphan those guests.

alter table public.guests
    drop constraint if exists
    guests_organization_id_fkey;


alter table public.guests
    add constraint guests_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict;


-- ============================================================
-- 4. RLS — ORGANIZATION SCOPE
-- ============================================================

drop policy if exists
"Staff manage guests"
on public.guests;


create policy
"Staff manage guests"

on public.guests

for all

to authenticated

using (
    public.is_staff(auth.uid())
    and organization_id =
        public.current_org_id()
)

with check (
    public.is_staff(auth.uid())
    and organization_id =
        public.current_org_id()
);


-- ============================================================
-- 5. BOOKING / GUEST ORGANIZATION CONSISTENCY
-- ============================================================

create or replace function
public.enforce_booking_guest_organization()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$

declare

    v_guest_org_id uuid;
    v_booking_org_id uuid;

begin

    if new.guest_id is null then
        return new;
    end if;


    select g.organization_id
    into v_guest_org_id

    from public.guests g

    where g.id =
        new.guest_id;


    if not found then

        raise exception
            'Voyageur introuvable.'
            using errcode = '23503';

    end if;


    v_booking_org_id :=
        new.organization_id;


    -- The existing booking organization trigger may also derive
    -- organization_id from the property. Derive it here as well
    -- so this guard does not depend on trigger execution order.

    if v_booking_org_id is null
       and new.property_id is not null
    then

        select p.organization_id
        into v_booking_org_id

        from public.properties p

        where p.id =
            new.property_id;

    end if;


    if v_booking_org_id is null then

        raise exception
            'Organisation de réservation introuvable.'
            using errcode = '23514';

    end if;


    if v_guest_org_id
        is distinct from
        v_booking_org_id
    then

        raise exception
            'Le voyageur et la réservation doivent appartenir à la même organisation.'
            using errcode = '23514';

    end if;


    return new;

end;

$function$;


drop trigger if exists
trg_booking_guest_organization
on public.bookings;


create trigger
trg_booking_guest_organization

before insert
or update of
    guest_id,
    organization_id,
    property_id

on public.bookings

for each row

execute function
public.enforce_booking_guest_organization();


-- ============================================================
-- 6. DOCUMENTATION
-- ============================================================

comment on function
public.enforce_guest_organization_scope()
is
'Assigns current_org_id() to staff-created guests and prevents application-level cross-organization guest reassignment.';


comment on function
public.enforce_booking_guest_organization()
is
'Rejects bookings whose guest belongs to a different organization from the booking/property organization.';


comment on column
public.guests.organization_id
is
'Mandatory organization ownership for guest records. Application staff creation is derived from current_org_id().';


commit;