-- ============================================================
-- F2.2C-7C-A
-- GUEST IDENTITY BACKEND CONTRACT
-- ============================================================

begin;


-- ============================================================
-- 1. is_guest_of()
-- ============================================================

create or replace function public.is_guest_of(
    p_guest_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$

    select
        auth.uid() is not null
        and p_guest_id is not null
        and exists (
            select 1
            from public.guests g
            where
                g.id = p_guest_id
                and g.user_id = auth.uid()
        );

$function$;


-- ============================================================
-- 2. my_guest_id()
-- ============================================================

create or replace function public.my_guest_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $function$

    select g.id

    from public.guests g

    where
        auth.uid() is not null
        and g.user_id = auth.uid()

    limit 1;

$function$;


-- ============================================================
-- 3. link_guest_user()
-- ============================================================

create or replace function public.link_guest_user(
    p_guest_id uuid,
    p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

    v_current_user_id uuid;
    v_current_org_id uuid;

    v_guest public.guests%rowtype;

    v_existing_guest_id uuid;

begin

    v_current_user_id :=
        auth.uid();


    if v_current_user_id is null then
        raise exception
            'Authentification requise.'
            using errcode = '42501';
    end if;


    if not public.is_staff(
        v_current_user_id
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


    if p_guest_id is null then
        raise exception
            'Voyageur obligatoire.'
            using errcode = '22023';
    end if;


    if p_user_id is null then
        raise exception
            'Utilisateur Auth obligatoire.'
            using errcode = '22023';
    end if;


    select g.*
    into v_guest

    from public.guests g

    where g.id =
        p_guest_id

    for update;


    if not found then
        raise exception
            'Voyageur introuvable.'
            using errcode = 'P0002';
    end if;


    if v_guest.organization_id is null
       or v_guest.organization_id
            is distinct from
            v_current_org_id
    then

        raise exception
            'Ce voyageur n''appartient pas à votre organisation.'
            using errcode = '42501';

    end if;


    if not exists (
        select 1
        from auth.users u
        where u.id = p_user_id
    ) then

        raise exception
            'Utilisateur Auth introuvable.'
            using errcode = 'P0002';

    end if;


    if v_guest.user_id
        is not distinct from
        p_user_id
    then

        return;

    end if;


    if v_guest.user_id is not null then

        raise exception
            'Ce voyageur est déjà lié à un autre utilisateur.'
            using errcode = '23505';

    end if;


    select g.id
    into v_existing_guest_id

    from public.guests g

    where
        g.user_id = p_user_id
        and g.id <> p_guest_id

    limit 1;


    if v_existing_guest_id is not null then

        raise exception
            'Cet utilisateur Auth est déjà lié à un autre voyageur.'
            using errcode = '23505';

    end if;


    update public.guests

    set
        user_id =
            p_user_id,

        updated_at =
            now()

    where id =
        p_guest_id;

end;

$function$;


-- ============================================================
-- 4. unlink_guest_user()
-- ============================================================

create or replace function public.unlink_guest_user(
    p_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

    v_current_user_id uuid;
    v_current_org_id uuid;

    v_guest public.guests%rowtype;

begin

    v_current_user_id :=
        auth.uid();


    if v_current_user_id is null then
        raise exception
            'Authentification requise.'
            using errcode = '42501';
    end if;


    if not public.is_staff(
        v_current_user_id
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


    if p_guest_id is null then
        raise exception
            'Voyageur obligatoire.'
            using errcode = '22023';
    end if;


    select g.*
    into v_guest

    from public.guests g

    where g.id =
        p_guest_id

    for update;


    if not found then
        raise exception
            'Voyageur introuvable.'
            using errcode = 'P0002';
    end if;


    if v_guest.organization_id is null
       or v_guest.organization_id
            is distinct from
            v_current_org_id
    then

        raise exception
            'Ce voyageur n''appartient pas à votre organisation.'
            using errcode = '42501';

    end if;


    if v_guest.user_id is null then
        return;
    end if;


    update public.guests

    set
        user_id =
            null,

        updated_at =
            now()

    where id =
        p_guest_id;

end;

$function$;


-- ============================================================
-- 5. PRIVILEGES
-- ============================================================

revoke all
on function public.is_guest_of(uuid)
from public, anon;

revoke all
on function public.my_guest_id()
from public, anon;

revoke all
on function public.link_guest_user(uuid, uuid)
from public, anon;

revoke all
on function public.unlink_guest_user(uuid)
from public, anon;


grant execute
on function public.is_guest_of(uuid)
to authenticated, service_role;

grant execute
on function public.my_guest_id()
to authenticated, service_role;

grant execute
on function public.link_guest_user(uuid, uuid)
to authenticated, service_role;

grant execute
on function public.unlink_guest_user(uuid)
to authenticated, service_role;


-- ============================================================
-- 6. DOCUMENTATION
-- ============================================================

comment on function public.is_guest_of(uuid)
is
'Returns true when the requested guest is linked to auth.uid() through guests.user_id.';


comment on function public.my_guest_id()
is
'Returns the guest id linked to the currently authenticated user.';


comment on function public.link_guest_user(uuid, uuid)
is
'Staff-only operation linking a guest of the current organization to an existing auth.users account.';


comment on function public.unlink_guest_user(uuid)
is
'Staff-only operation removing the auth.users link from a guest of the current organization.';


commit;
