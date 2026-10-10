-- ============================================================
-- AMIMMO F1.4
-- ATOMIC PROPERTY CONTROL DECISION
-- ============================================================
--
-- Replaces the frontend sequence:
--   SELECT property
--   UPDATE properties
--   INSERT property_status_history
--
-- with one PostgreSQL transaction.
--
-- Supported decisions:
--   maintenance
--   archived
-- ============================================================

create or replace function public.apply_property_control_decision(
    p_property_id uuid,
    p_decision text,
    p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_property public.properties%rowtype;
    v_availability_note text;
    v_history_note text;
    v_reason text;
begin
    -- --------------------------------------------------------
    -- Authentication / authorization
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Authentification requise.';
    end if;

    if not public.is_staff(auth.uid()) then
        raise exception using
            errcode = '42501',
            message = 'Accès refusé.';
    end if;

    -- --------------------------------------------------------
    -- Decision whitelist
    -- --------------------------------------------------------

    if p_decision is null
       or p_decision not in ('maintenance', 'archived')
    then
        raise exception using
            errcode = '22023',
            message = 'Décision de contrôle invalide.';
    end if;

    -- --------------------------------------------------------
    -- Lock property
    -- --------------------------------------------------------

    select *
    into v_property
    from public.properties
    where id = p_property_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Bien introuvable.';
    end if;

    -- --------------------------------------------------------
    -- The dedicated control workflow only starts from an
    -- unavailable property that is explicitly awaiting control.
    -- --------------------------------------------------------

    if v_property.status <> 'unavailable'::public.property_status
       or v_property.control_required is not true
    then
        raise exception using
            errcode = '23514',
            message = 'Ce bien n''est pas actuellement en attente de contrôle.';
    end if;

    -- --------------------------------------------------------
    -- No control decision may bypass an active/pending lease.
    -- guard_property_archive() remains a second line of defence
    -- for archived transitions.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.leases l
        where l.property_id = p_property_id
          and l.status in (
              'active'::public.lease_status,
              'pending'::public.lease_status
          )
    ) then
        raise exception using
            errcode = '23514',
            message = 'Impossible de traiter ce contrôle : un bail actif ou en attente existe encore.';
    end if;

    -- --------------------------------------------------------
    -- Resolve notes and reason while preserving current UI
    -- semantics.
    -- --------------------------------------------------------

    if p_decision = 'maintenance' then
        v_reason := 'maintenance';

        v_availability_note :=
            coalesce(
                nullif(trim(p_note), ''),
                'Travaux ou maintenance requis après contrôle.'
            );

        v_history_note :=
            coalesce(
                nullif(trim(p_note), ''),
                'Contrôle terminé : maintenance requise.'
            );

        update public.properties
        set
            status = 'maintenance',
            published = false,
            control_required = false,
            availability_reason = 'maintenance',
            availability_note = v_availability_note,
            status_changed_at = now(),
            updated_at = now()
        where id = p_property_id;

    else
        v_reason := 'owner_request';

        v_availability_note :=
            coalesce(
                nullif(trim(p_note), ''),
                'Bien retiré de la commercialisation après contrôle.'
            );

        v_history_note :=
            coalesce(
                nullif(trim(p_note), ''),
                'Contrôle terminé : bien archivé.'
            );

        update public.properties
        set
            status = 'archived',
            published = false,
            control_required = false,
            availability_reason = 'owner_request',
            availability_note = v_availability_note,
            status_changed_at = now(),
            updated_at = now()
        where id = p_property_id;
    end if;

    -- --------------------------------------------------------
    -- Status history.
    -- This INSERT is in the same transaction as the property
    -- update: if it fails, the UPDATE is rolled back.
    -- --------------------------------------------------------

    insert into public.property_status_history (
        property_id,
        old_status,
        new_status,
        reason,
        note,
        changed_by
    )
    values (
        p_property_id,
        v_property.status,
        p_decision::public.property_status,
        v_reason,
        v_history_note,
        auth.uid()
    );

    return jsonb_build_object(
        'success', true,
        'property_id', p_property_id,
        'previous_status', v_property.status,
        'new_status', p_decision,
        'control_required', false,
        'published', false
    );
end;
$function$;


revoke execute
on function public.apply_property_control_decision(uuid, text, text)
from public, anon;

grant execute
on function public.apply_property_control_decision(uuid, text, text)
to authenticated, service_role;
