begin;

-- ============================================================
-- F2.2D-2B
-- ATOMIC EXECUTION OF AN APPROVED DEPOSIT RESOLUTION
--
-- Existing financial engines remain authoritative:
--   - withhold_short_rental_deposit(...)
--   - release_short_rental_deposit(...)
--
-- This migration only adds the orchestration RPC.
-- ============================================================


-- ============================================================
-- 1. STRICT PRECONDITIONS
-- ============================================================

do $preconditions$
begin
    if to_regclass(
        'public.short_rental_deposit_resolutions'
    ) is null then
        raise exception
            'F2.2D-2B refused: short_rental_deposit_resolutions is missing.'
            using errcode = '42P01';
    end if;

    if to_regclass(
        'public.short_rental_deposit_deductions'
    ) is null then
        raise exception
            'F2.2D-2B refused: short_rental_deposit_deductions is missing.'
            using errcode = '42P01';
    end if;

    if to_regprocedure(
        'public.withhold_short_rental_deposit(uuid,numeric,uuid,text,timestamp with time zone,text,text)'
    ) is null then
        raise exception
            'F2.2D-2B refused: withhold_short_rental_deposit contract is missing.'
            using errcode = '42883';
    end if;

    if to_regprocedure(
        'public.release_short_rental_deposit(uuid,numeric,text,timestamp with time zone,text,text)'
    ) is null then
        raise exception
            'F2.2D-2B refused: release_short_rental_deposit contract is missing.'
            using errcode = '42883';
    end if;

    if to_regprocedure(
        'public.execute_short_rental_deposit_resolution(uuid,text,timestamp with time zone,text)'
    ) is not null then
        raise exception
            'F2.2D-2B refused: execute_short_rental_deposit_resolution already exists.'
            using errcode = '42723';
    end if;
end;
$preconditions$;


-- ============================================================
-- 2. EXECUTION RPC
-- ============================================================

create function
public.execute_short_rental_deposit_resolution(
    p_resolution_id uuid,
    p_release_payment_method text default null,
    p_executed_at timestamptz default now(),
    p_notes text default ''
)
returns table (
    resolution_id uuid,
    resolution_status text,
    withhold_movement_id uuid,
    release_movement_id uuid,
    deduction_amount numeric,
    release_amount numeric,
    remaining_amount numeric,
    reused boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;

    v_resolution
        public.short_rental_deposit_resolutions%rowtype;

    v_booking
        public.bookings%rowtype;

    v_deposit
        public.short_rental_deposits%rowtype;

    v_inspection
        public.inspections%rowtype;

    v_available numeric := 0;
    v_detail_total numeric := 0;
    v_final_remaining numeric := 0;

    v_release_payment_method text;
    v_effective_at timestamptz;
    v_notes text;
    v_withhold_reason text;

    v_withhold_external_reference text;
    v_release_external_reference text;

    v_withhold_movement_id uuid;
    v_release_movement_id uuid;

    v_engine_remaining numeric;
begin

    -- ========================================================
    -- 1. AUTHENTICATION / ORGANIZATION
    -- ========================================================

    v_user_id :=
        auth.uid();

    if v_user_id is null
       or not public.is_staff(v_user_id)
    then
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

    if p_resolution_id is null then
        raise exception
            'Identifiant de résolution obligatoire.'
            using errcode = '22023';
    end if;

    v_effective_at :=
        coalesce(
            p_executed_at,
            now()
        );

    v_notes :=
        btrim(
            coalesce(
                p_notes,
                ''
            )
        );


    -- ========================================================
    -- 2. LOCK RESOLUTION
    -- ========================================================

    select r.*
    into v_resolution
    from public.short_rental_deposit_resolutions r
    where r.id =
            p_resolution_id
      and r.organization_id =
            v_org_id
    for update;

    if not found then
        raise exception
            'Résolution de caution introuvable.'
            using errcode = '23503';
    end if;


    -- ========================================================
    -- 3. TERMINAL IDEMPOTENCE
    -- ========================================================

    if v_resolution.status = 'completed' then

        select d.*
        into v_deposit
        from public.short_rental_deposits d
        where d.id =
            v_resolution.deposit_id
        for update;

        if not found then
            raise exception
                'Caution introuvable.'
                using errcode = '23503';
        end if;

        v_final_remaining :=
            greatest(
                v_deposit.collected_amount
                - v_deposit.released_amount
                - v_deposit.withheld_amount,
                0
            );

        if v_final_remaining <> 0 then
            raise exception
                'Résolution terminée incohérente : un solde de caution subsiste (%).',
                v_final_remaining
                using errcode = '23514';
        end if;

        if v_resolution.deduction_amount > 0
           and v_resolution.withhold_movement_id is null
        then
            raise exception
                'Résolution terminée incohérente : mouvement de retenue absent.'
                using errcode = '23514';
        end if;

        if v_resolution.release_amount > 0
           and v_resolution.release_movement_id is null
        then
            raise exception
                'Résolution terminée incohérente : mouvement de restitution absent.'
                using errcode = '23514';
        end if;

        return query
        select
            v_resolution.id,
            v_resolution.status,
            v_resolution.withhold_movement_id,
            v_resolution.release_movement_id,
            v_resolution.deduction_amount,
            v_resolution.release_amount,
            v_final_remaining,
            true;

        return;
    end if;


    -- ========================================================
    -- 4. ONLY APPROVED RESOLUTIONS CAN EXECUTE
    -- ========================================================

    if v_resolution.status = 'processing' then
        raise exception
            'Résolution bloquée en processing : état persistant inattendu.'
            using errcode = '55000';
    end if;

    if v_resolution.status <> 'approved' then
        raise exception
            'Seule une résolution approuvée peut être exécutée ; statut actuel : %.',
            v_resolution.status
            using errcode = '23514';
    end if;


    -- ========================================================
    -- 5. LOCK BOOKING, THEN DEPOSIT
    --    Same lock order as existing financial engines.
    -- ========================================================

    select b.*
    into v_booking
    from public.bookings b
    where b.id =
            v_resolution.booking_id
      and b.organization_id =
            v_resolution.organization_id
    for update;

    if not found then
        raise exception
            'Réservation introuvable dans l''organisation de la résolution.'
            using errcode = '23503';
    end if;

    if v_booking.status
        <> 'completed'::public.booking_status
    then
        raise exception
            'L''exécution d''une résolution de caution exige une réservation completed ; statut actuel : %.',
            v_booking.status
            using errcode = '23514';
    end if;

    if v_booking.checked_out_at is null then
        raise exception
            'L''exécution d''une résolution de caution exige un check-out enregistré.'
            using errcode = '23514';
    end if;


    select d.*
    into v_deposit
    from public.short_rental_deposits d
    where d.id =
            v_resolution.deposit_id
      and d.booking_id =
            v_resolution.booking_id
      and d.organization_id =
            v_resolution.organization_id
    for update;

    if not found then
        raise exception
            'Caution introuvable ou incohérente avec la résolution.'
            using errcode = '23503';
    end if;


    -- ========================================================
    -- 6. REVALIDATE FINALIZED CHECKOUT
    -- ========================================================

    select i.*
    into v_inspection
    from public.inspections i
    where i.id =
            v_resolution.inspection_id
      and i.booking_id =
            v_resolution.booking_id
      and i.organization_id =
            v_resolution.organization_id
    for share;

    if not found then
        raise exception
            'État des lieux de sortie introuvable ou incohérent.'
            using errcode = '23503';
    end if;

    if v_inspection.kind
        <> 'checkout'::public.inspection_kind
    then
        raise exception
            'La résolution doit rester rattachée à un état des lieux de sortie.'
            using errcode = '23514';
    end if;

    if v_inspection.finalized_at is null then
        raise exception
            'L''état des lieux de sortie doit être finalisé avant l''exécution financière.'
            using errcode = '23514';
    end if;


    -- ========================================================
    -- 7. REVALIDATE FINANCIAL SNAPSHOT
    -- ========================================================

    v_available :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );

    if v_available
        is distinct from
        v_resolution.available_amount_snapshot
    then
        raise exception
            'La caution disponible (%) diffère du snapshot approuvé (%). Annulez cette résolution puis préparez-en une nouvelle.',
            v_available,
            v_resolution.available_amount_snapshot
            using errcode = '40001';
    end if;

    if v_resolution.deduction_amount < 0
       or v_resolution.release_amount < 0
       or (
            v_resolution.deduction_amount
            + v_resolution.release_amount
          )
          is distinct from
          v_resolution.available_amount_snapshot
    then
        raise exception
            'Allocation financière de la résolution invalide.'
            using errcode = '23514';
    end if;


    -- ========================================================
    -- 8. REVALIDATE DEDUCTION DETAIL
    -- ========================================================

    select coalesce(
        sum(d.deduction_amount),
        0
    )
    into v_detail_total
    from public.short_rental_deposit_deductions d
    where d.resolution_id =
            v_resolution.id
      and d.organization_id =
            v_resolution.organization_id;

    if v_detail_total
        is distinct from
        v_resolution.deduction_amount
    then
        raise exception
            'Le détail des retenues (%) diffère du total approuvé (%).',
            v_detail_total,
            v_resolution.deduction_amount
            using errcode = '23514';
    end if;


    -- ========================================================
    -- 9. RELEASE PAYMENT METHOD
    -- ========================================================

    if v_resolution.release_amount > 0 then

        v_release_payment_method :=
            lower(
                btrim(
                    coalesce(
                        p_release_payment_method,
                        ''
                    )
                )
            );

        if v_release_payment_method = '' then
            raise exception
                'Le moyen de restitution est obligatoire lorsque release_amount > 0.'
                using errcode = '22023';
        end if;

    else
        v_release_payment_method := null;
    end if;


    -- ========================================================
    -- 10. DETERMINISTIC IDEMPOTENCE REFERENCES
    -- ========================================================

    v_withhold_external_reference :=
        'DEP-RES-WH-'
        || v_resolution.id::text;

    v_release_external_reference :=
        'DEP-RES-REL-'
        || v_resolution.id::text;


    -- ========================================================
    -- 11. DETERMINISTIC WITHHOLD REASON
    -- ========================================================

    if v_resolution.deduction_amount > 0 then

        select
            'Résolution de caution '
            || v_resolution.id::text
            || ' : '
            || string_agg(
                btrim(d.reason),
                ' | '
                order by d.id
            )
        into v_withhold_reason
        from public.short_rental_deposit_deductions d
        where d.resolution_id =
                v_resolution.id
          and d.organization_id =
                v_resolution.organization_id;

        if nullif(
            btrim(
                coalesce(
                    v_withhold_reason,
                    ''
                )
            ),
            ''
        ) is null
        then
            raise exception
                'Motif détaillé de retenue introuvable.'
                using errcode = '23514';
        end if;

    else
        v_withhold_reason := null;
    end if;


    -- ========================================================
    -- 12. MARK PROCESSING
    --
    -- Any later exception rolls this update back because the
    -- whole RPC runs in the caller transaction.
    -- ========================================================

    update public.short_rental_deposit_resolutions
    set
        status =
            'processing',

        execution_started_at =
            now()

    where id =
        v_resolution.id

    returning *
    into v_resolution;


    -- ========================================================
    -- 13. WITHHOLD APPROVED AMOUNT
    -- ========================================================

    if v_resolution.deduction_amount > 0 then

        select
            x.movement_id,
            x.remaining_amount
        into
            v_withhold_movement_id,
            v_engine_remaining
        from public.withhold_short_rental_deposit(
            p_booking_id =>
                v_resolution.booking_id,

            p_amount =>
                v_resolution.deduction_amount,

            p_inspection_id =>
                v_resolution.inspection_id,

            p_reason =>
                v_withhold_reason,

            p_withheld_at =>
                v_effective_at,

            p_reference =>
                v_withhold_external_reference,

            p_notes =>
                concat(
                    'Exécution résolution ',
                    v_resolution.id::text,
                    case
                        when v_notes <> ''
                            then ' / ' || v_notes
                        else ''
                    end
                )
        ) x;

        if not found
           or v_withhold_movement_id is null
        then
            raise exception
                'Le moteur de retenue n''a retourné aucun mouvement.'
                using errcode = '55000';
        end if;

        if not exists (
            select 1
            from public.short_rental_deposit_movements m
            where m.id =
                    v_withhold_movement_id
              and m.deposit_id =
                    v_resolution.deposit_id
              and m.movement_type =
                    'withhold'
              and m.amount =
                    v_resolution.deduction_amount
              and m.inspection_id =
                    v_resolution.inspection_id
              and m.external_reference =
                    v_withhold_external_reference
        ) then
            raise exception
                'Mouvement de retenue retourné incohérent avec la résolution.'
                using errcode = '23514';
        end if;

    else
        v_withhold_movement_id := null;
    end if;


    -- ========================================================
    -- 14. RELEASE APPROVED REMAINDER
    -- ========================================================

    if v_resolution.release_amount > 0 then

        select
            x.movement_id,
            x.remaining_amount
        into
            v_release_movement_id,
            v_engine_remaining
        from public.release_short_rental_deposit(
            p_booking_id =>
                v_resolution.booking_id,

            p_amount =>
                v_resolution.release_amount,

            p_payment_method =>
                v_release_payment_method,

            p_released_at =>
                v_effective_at,

            p_reference =>
                v_release_external_reference,

            p_notes =>
                concat(
                    'Exécution résolution ',
                    v_resolution.id::text,
                    case
                        when v_notes <> ''
                            then ' / ' || v_notes
                        else ''
                    end
                )
        ) x;

        if not found
           or v_release_movement_id is null
        then
            raise exception
                'Le moteur de restitution n''a retourné aucun mouvement.'
                using errcode = '55000';
        end if;

        if not exists (
            select 1
            from public.short_rental_deposit_movements m
            where m.id =
                    v_release_movement_id
              and m.deposit_id =
                    v_resolution.deposit_id
              and m.movement_type =
                    'release'
              and m.amount =
                    v_resolution.release_amount
              and m.external_reference =
                    v_release_external_reference
        ) then
            raise exception
                'Mouvement de restitution retourné incohérent avec la résolution.'
                using errcode = '23514';
        end if;

    else
        v_release_movement_id := null;
    end if;


    -- ========================================================
    -- 15. FINAL FINANCIAL RECONCILIATION
    -- ========================================================

    select d.*
    into v_deposit
    from public.short_rental_deposits d
    where d.id =
        v_resolution.deposit_id
    for update;

    v_final_remaining :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );

    if v_final_remaining <> 0 then
        raise exception
            'Exécution incomplète : un solde de caution subsiste (%).',
            v_final_remaining
            using errcode = '23514';
    end if;


    -- ========================================================
    -- 16. COMPLETE RESOLUTION
    -- ========================================================

    update public.short_rental_deposit_resolutions
    set
        status =
            'completed',

        executed_at =
            v_effective_at,

        executed_by =
            v_user_id,

        withhold_movement_id =
            v_withhold_movement_id,

        release_movement_id =
            v_release_movement_id

    where id =
        v_resolution.id

    returning *
    into v_resolution;


    -- ========================================================
    -- 17. RESULT
    -- ========================================================

    return query
    select
        v_resolution.id,
        v_resolution.status,
        v_resolution.withhold_movement_id,
        v_resolution.release_movement_id,
        v_resolution.deduction_amount,
        v_resolution.release_amount,
        v_final_remaining,
        false;

end;
$function$;


-- ============================================================
-- 3. PRIVILEGES
-- ============================================================

revoke all
on function
public.execute_short_rental_deposit_resolution(
    uuid,
    text,
    timestamp with time zone,
    text
)
from public, anon;


grant execute
on function
public.execute_short_rental_deposit_resolution(
    uuid,
    text,
    timestamp with time zone,
    text
)
to authenticated;


-- ============================================================
-- 4. DOCUMENTATION
-- ============================================================

comment on function
public.execute_short_rental_deposit_resolution(
    uuid,
    text,
    timestamp with time zone,
    text
)
is
'Atomically executes an approved short-rental deposit resolution. Revalidates the finalized checkout, booking/deposit/org bindings, approved snapshot and deduction detail; then delegates to the existing withhold/release financial engines using deterministic idempotency references. A failure in either financial engine rolls back the whole orchestration transaction.';


commit;
