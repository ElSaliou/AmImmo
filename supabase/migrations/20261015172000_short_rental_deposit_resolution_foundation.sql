begin;

-- ============================================================
-- F2.2D-2A
-- SHORT-RENTAL DEPOSIT RESOLUTION FOUNDATION
--
-- Purpose:
--   - keep short_rental_deposits / movements as the financial truth;
--   - add a decision layer linked to one finalized checkout inspection;
--   - detail deductions by inspection finding;
--   - keep all application writes behind SECURITY DEFINER RPCs;
--   - do NOT execute release / withhold movements yet.
-- ============================================================


-- ============================================================
-- 1. STRICT PRECONDITIONS
-- ============================================================

do $preconditions$
declare
    v_count bigint;
begin
    if to_regclass('public.short_rental_deposit_resolutions') is not null then
        raise exception
            'F2.2D-2A refused: public.short_rental_deposit_resolutions already exists.'
            using errcode = '42P07';
    end if;

    if to_regclass('public.short_rental_deposit_deductions') is not null then
        raise exception
            'F2.2D-2A refused: public.short_rental_deposit_deductions already exists.'
            using errcode = '42P07';
    end if;

    if to_regclass('public.short_rental_deposits') is null
       or to_regclass('public.short_rental_deposit_movements') is null
       or to_regclass('public.inspections') is null
       or to_regclass('public.inspection_findings') is null
    then
        raise exception
            'F2.2D-2A refused: required deposit / inspection tables are missing.'
            using errcode = '42P01';
    end if;

    select count(*)
    into v_count
    from public.short_rental_deposit_movements m
    where m.movement_type = 'withhold'
      and m.inspection_id is null;

    if v_count <> 0 then
        raise exception
            'F2.2D-2A refused: % existing withhold movement(s) have no inspection.',
            v_count
            using errcode = '23514';
    end if;

    select count(*)
    into v_count
    from public.short_rental_deposit_movements m
    join public.short_rental_deposits d
      on d.id = m.deposit_id
    join public.inspections i
      on i.id = m.inspection_id
    where m.movement_type = 'withhold'
      and (
            i.kind <> 'checkout'::public.inspection_kind
            or i.booking_id is distinct from d.booking_id
          );

    if v_count <> 0 then
        raise exception
            'F2.2D-2A refused: % existing withhold movement(s) have an invalid checkout inspection.',
            v_count
            using errcode = '23514';
    end if;

    select count(*)
    into v_count
    from public.short_rental_deposit_movements m
    join public.inspections i
      on i.id = m.inspection_id
    where m.movement_type = 'withhold'
      and i.finalized_at is null;

    if v_count <> 0 then
        raise exception
            'F2.2D-2A refused: % existing withhold movement(s) reference a non-finalized inspection.',
            v_count
            using errcode = '23514';
    end if;
end;
$preconditions$;


-- ============================================================
-- 2. RESOLUTION HEADER
-- ============================================================

create table public.short_rental_deposit_resolutions (
    id uuid primary key
        default gen_random_uuid(),

    organization_id uuid not null,

    deposit_id uuid not null,

    booking_id uuid not null,

    inspection_id uuid not null,

    currency text not null,

    status text not null
        default 'draft',

    available_amount_snapshot numeric not null,

    deduction_amount numeric not null
        default 0,

    release_amount numeric not null
        default 0,

    decision_notes text not null
        default '',

    approved_at timestamptz null,

    approved_by uuid null,

    execution_started_at timestamptz null,

    executed_at timestamptz null,

    executed_by uuid null,

    withhold_movement_id uuid null,

    release_movement_id uuid null,

    cancelled_at timestamptz null,

    cancelled_by uuid null,

    cancellation_reason text not null
        default '',

    created_by uuid null,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint short_rental_deposit_resolutions_organization_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_deposit_fkey
        foreign key (deposit_id)
        references public.short_rental_deposits(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_booking_fkey
        foreign key (booking_id)
        references public.bookings(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_inspection_fkey
        foreign key (inspection_id)
        references public.inspections(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_withhold_movement_fkey
        foreign key (withhold_movement_id)
        references public.short_rental_deposit_movements(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_release_movement_fkey
        foreign key (release_movement_id)
        references public.short_rental_deposit_movements(id)
        on delete restrict,

    constraint short_rental_deposit_resolutions_status_check
        check (
            status in (
                'draft',
                'approved',
                'processing',
                'completed',
                'cancelled'
            )
        ),

    constraint short_rental_deposit_resolutions_available_amount_check
        check (
            available_amount_snapshot > 0
        ),

    constraint short_rental_deposit_resolutions_deduction_amount_check
        check (
            deduction_amount >= 0
        ),

    constraint short_rental_deposit_resolutions_release_amount_check
        check (
            release_amount >= 0
        ),

    constraint short_rental_deposit_resolutions_allocation_check
        check (
            deduction_amount
            + release_amount
            = available_amount_snapshot
        ),

    constraint short_rental_deposit_resolutions_approval_check
        check (
            status not in (
                'approved',
                'processing',
                'completed'
            )
            or (
                approved_at is not null
                and approved_by is not null
            )
        ),

    constraint short_rental_deposit_resolutions_execution_check
        check (
            status <> 'completed'
            or (
                executed_at is not null
                and executed_by is not null
            )
        ),

    constraint short_rental_deposit_resolutions_cancellation_check
        check (
            status <> 'cancelled'
            or (
                cancelled_at is not null
                and cancelled_by is not null
                and length(btrim(cancellation_reason)) > 0
            )
        ),

    constraint uq_short_rental_deposit_resolutions_resolution_org
        unique (id, organization_id),

    constraint uq_short_rental_deposit_resolutions_withhold_movement
        unique (withhold_movement_id),

    constraint uq_short_rental_deposit_resolutions_release_movement
        unique (release_movement_id)
);


create unique index
uq_short_rental_deposit_resolutions_active_deposit
    on public.short_rental_deposit_resolutions (
        deposit_id
    )
    where status <> 'cancelled';


create index idx_short_rental_deposit_resolutions_booking
    on public.short_rental_deposit_resolutions (
        booking_id
    );


create index idx_short_rental_deposit_resolutions_inspection
    on public.short_rental_deposit_resolutions (
        inspection_id
    );


create index idx_short_rental_deposit_resolutions_org_status
    on public.short_rental_deposit_resolutions (
        organization_id,
        status
    );


-- ============================================================
-- 3. DEDUCTION LINES
-- ============================================================

create table public.short_rental_deposit_deductions (
    id uuid primary key
        default gen_random_uuid(),

    resolution_id uuid not null,

    organization_id uuid not null,

    inspection_finding_id uuid not null,

    estimated_cost_snapshot numeric null,

    deduction_amount numeric not null,

    reason text not null,

    created_by uuid null,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint short_rental_deposit_deductions_resolution_org_fkey
        foreign key (
            resolution_id,
            organization_id
        )
        references public.short_rental_deposit_resolutions (
            id,
            organization_id
        )
        on delete cascade,

    constraint short_rental_deposit_deductions_organization_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete restrict,

    constraint short_rental_deposit_deductions_finding_fkey
        foreign key (inspection_finding_id)
        references public.inspection_findings(id)
        on delete restrict,

    constraint short_rental_deposit_deductions_estimated_cost_check
        check (
            estimated_cost_snapshot is null
            or estimated_cost_snapshot >= 0
        ),

    constraint short_rental_deposit_deductions_amount_check
        check (
            deduction_amount > 0
        ),

    constraint short_rental_deposit_deductions_reason_check
        check (
            length(btrim(reason)) > 0
        ),

    constraint uq_short_rental_deposit_deductions_finding
        unique (
            resolution_id,
            inspection_finding_id
        )
);


create index idx_short_rental_deposit_deductions_resolution
    on public.short_rental_deposit_deductions (
        resolution_id
    );


create index idx_short_rental_deposit_deductions_finding
    on public.short_rental_deposit_deductions (
        inspection_finding_id
    );


create index idx_short_rental_deposit_deductions_org
    on public.short_rental_deposit_deductions (
        organization_id
    );


-- ============================================================
-- 4. UPDATED_AT
-- ============================================================

create or replace function
public.touch_short_rental_deposit_resolution_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
    new.updated_at := now();
    return new;
end;
$function$;


create trigger
trg_short_rental_deposit_resolutions_updated_at
before update
on public.short_rental_deposit_resolutions
for each row
execute function
public.touch_short_rental_deposit_resolution_updated_at();


create trigger
trg_short_rental_deposit_deductions_updated_at
before update
on public.short_rental_deposit_deductions
for each row
execute function
public.touch_short_rental_deposit_resolution_updated_at();


-- ============================================================
-- 5. RESOLUTION RELATIONAL INVARIANTS
-- ============================================================

create or replace function
public.enforce_short_rental_deposit_resolution()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_deposit public.short_rental_deposits%rowtype;
    v_inspection public.inspections%rowtype;
    v_available numeric;
begin
    select d.*
    into v_deposit
    from public.short_rental_deposits d
    where d.id = new.deposit_id;

    if not found then
        raise exception
            'Caution introuvable.'
            using errcode = '23503';
    end if;

    select i.*
    into v_inspection
    from public.inspections i
    where i.id = new.inspection_id;

    if not found then
        raise exception
            'État des lieux introuvable.'
            using errcode = '23503';
    end if;

    if v_inspection.kind
        <> 'checkout'::public.inspection_kind
    then
        raise exception
            'La résolution de caution exige un état des lieux de sortie.'
            using errcode = '23514';
    end if;

    if v_inspection.finalized_at is null then
        raise exception
            'La résolution de caution exige un état des lieux de sortie finalisé.'
            using errcode = '23514';
    end if;

    if v_inspection.booking_id
        is distinct from
        v_deposit.booking_id
    then
        raise exception
            'La caution et l''état des lieux doivent appartenir à la même réservation.'
            using errcode = '23514';
    end if;

    if v_inspection.organization_id
        is distinct from
        v_deposit.organization_id
    then
        raise exception
            'La caution et l''état des lieux doivent appartenir à la même organisation.'
            using errcode = '23514';
    end if;

    v_available :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );

    if tg_op = 'INSERT' then
        if v_available <= 0 then
            raise exception
                'Aucun montant de caution n''est disponible à résoudre.'
                using errcode = '23514';
        end if;

        new.organization_id :=
            v_deposit.organization_id;

        new.booking_id :=
            v_deposit.booking_id;

        new.currency :=
            v_deposit.currency;

        new.available_amount_snapshot :=
            v_available;

        new.deduction_amount := 0;

        new.release_amount :=
            v_available;

        new.status := 'draft';

        new.approved_at := null;
        new.approved_by := null;

        new.execution_started_at := null;
        new.executed_at := null;
        new.executed_by := null;

        new.withhold_movement_id := null;
        new.release_movement_id := null;

        new.cancelled_at := null;
        new.cancelled_by := null;
        new.cancellation_reason := '';

        return new;
    end if;

    if new.organization_id
        is distinct from
        old.organization_id
       or new.deposit_id
        is distinct from
        old.deposit_id
       or new.booking_id
        is distinct from
        old.booking_id
       or new.inspection_id
        is distinct from
        old.inspection_id
       or new.currency
        is distinct from
        old.currency
       or new.available_amount_snapshot
        is distinct from
        old.available_amount_snapshot
    then
        raise exception
            'Le rattachement et le snapshot financier d''une résolution sont immuables.'
            using errcode = '23514';
    end if;

    if old.status = 'draft'
       and new.status not in (
            'draft',
            'approved',
            'cancelled'
       )
    then
        raise exception
            'Transition de statut de résolution invalide.'
            using errcode = '23514';
    end if;

    if old.status = 'approved'
       and new.status not in (
            'approved',
            'processing',
            'cancelled'
       )
    then
        raise exception
            'Transition de statut de résolution invalide.'
            using errcode = '23514';
    end if;

    if old.status = 'processing'
       and new.status not in (
            'processing',
            'completed'
       )
    then
        raise exception
            'Transition de statut de résolution invalide.'
            using errcode = '23514';
    end if;

    if old.status in (
        'completed',
        'cancelled'
    )
       and new.status
        is distinct from
        old.status
    then
        raise exception
            'Une résolution terminée ou annulée ne peut plus changer de statut.'
            using errcode = '23514';
    end if;

    return new;
end;
$function$;


create trigger
trg_enforce_short_rental_deposit_resolution
before insert
or update
on public.short_rental_deposit_resolutions
for each row
execute function
public.enforce_short_rental_deposit_resolution();


-- ============================================================
-- 6. DEDUCTION RELATIONAL / FINANCIAL INVARIANTS
-- ============================================================

create or replace function
public.enforce_short_rental_deposit_deduction()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_finding public.inspection_findings%rowtype;
    v_other_total numeric := 0;
begin
    if tg_op = 'DELETE' then
        select r.*
        into v_resolution
        from public.short_rental_deposit_resolutions r
        where r.id = old.resolution_id
        for update;

        if not found then
            raise exception
                'Résolution de caution introuvable.'
                using errcode = '23503';
        end if;

        if v_resolution.status <> 'draft' then
            raise exception
                'Les retenues détaillées ne sont modifiables qu''à l''état brouillon.'
                using errcode = '23514';
        end if;

        return old;
    end if;

    if tg_op = 'UPDATE'
       and (
            new.resolution_id
                is distinct from
                old.resolution_id
            or new.inspection_finding_id
                is distinct from
                old.inspection_finding_id
       )
    then
        raise exception
            'Le rattachement d''une ligne de retenue est immuable.'
            using errcode = '23514';
    end if;

    select r.*
    into v_resolution
    from public.short_rental_deposit_resolutions r
    where r.id = new.resolution_id
    for update;

    if not found then
        raise exception
            'Résolution de caution introuvable.'
            using errcode = '23503';
    end if;

    if v_resolution.status <> 'draft' then
        raise exception
            'Les retenues détaillées ne sont modifiables qu''à l''état brouillon.'
            using errcode = '23514';
    end if;

    select f.*
    into v_finding
    from public.inspection_findings f
    where f.id = new.inspection_finding_id;

    if not found then
        raise exception
            'Constat d''état des lieux introuvable.'
            using errcode = '23503';
    end if;

    if v_finding.inspection_id
        is distinct from
        v_resolution.inspection_id
    then
        raise exception
            'Le constat doit appartenir à l''état des lieux de la résolution.'
            using errcode = '23514';
    end if;

    if coalesce(new.deduction_amount, 0) <= 0 then
        raise exception
            'Le montant de retenue doit être strictement positif.'
            using errcode = '22023';
    end if;

    new.reason :=
        btrim(
            coalesce(
                new.reason,
                ''
            )
        );

    if new.reason = '' then
        raise exception
            'Un motif de retenue est obligatoire.'
            using errcode = '22023';
    end if;

    new.organization_id :=
        v_resolution.organization_id;

    if tg_op = 'INSERT' then
        new.estimated_cost_snapshot :=
            v_finding.estimated_cost;
    else
        new.estimated_cost_snapshot :=
            old.estimated_cost_snapshot;
    end if;

    select coalesce(
        sum(d.deduction_amount),
        0
    )
    into v_other_total
    from public.short_rental_deposit_deductions d
    where d.resolution_id =
            v_resolution.id
      and (
            tg_op = 'INSERT'
            or d.id <> old.id
      );

    if v_other_total
       + new.deduction_amount
       > v_resolution.available_amount_snapshot
    then
        raise exception
            'Le total des retenues dépasse la caution disponible (%).',
            v_resolution.available_amount_snapshot
            using errcode = '23514';
    end if;

    return new;
end;
$function$;


create trigger
trg_enforce_short_rental_deposit_deduction
before insert
or update
or delete
on public.short_rental_deposit_deductions
for each row
execute function
public.enforce_short_rental_deposit_deduction();


-- ============================================================
-- 7. AUTOMATIC RESOLUTION TOTALS
-- ============================================================

create or replace function
public.recalculate_short_rental_deposit_resolution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_resolution_id uuid;
    v_total numeric := 0;
begin
    v_resolution_id :=
        case
            when tg_op = 'DELETE'
                then old.resolution_id
            else new.resolution_id
        end;

    select coalesce(
        sum(d.deduction_amount),
        0
    )
    into v_total
    from public.short_rental_deposit_deductions d
    where d.resolution_id =
        v_resolution_id;

    update public.short_rental_deposit_resolutions r
    set
        deduction_amount =
            v_total,

        release_amount =
            r.available_amount_snapshot
            - v_total

    where r.id =
        v_resolution_id;

    return null;
end;
$function$;


create trigger
trg_recalculate_short_rental_deposit_resolution
after insert
or update
or delete
on public.short_rental_deposit_deductions
for each row
execute function
public.recalculate_short_rental_deposit_resolution();


-- ============================================================
-- 8. RLS — READ ONLY FROM CLIENT
-- ============================================================

alter table public.short_rental_deposit_resolutions
    enable row level security;

alter table public.short_rental_deposit_deductions
    enable row level security;


create policy
"Staff read short rental deposit resolutions"
on public.short_rental_deposit_resolutions
for select
to authenticated
using (
    public.is_staff(auth.uid())
    and organization_id =
        public.current_org_id()
);


create policy
"Staff read short rental deposit deductions"
on public.short_rental_deposit_deductions
for select
to authenticated
using (
    public.is_staff(auth.uid())
    and organization_id =
        public.current_org_id()
);


revoke insert, update, delete
on public.short_rental_deposit_resolutions
from authenticated, anon;

revoke insert, update, delete
on public.short_rental_deposit_deductions
from authenticated, anon;

grant select
on public.short_rental_deposit_resolutions
to authenticated;

grant select
on public.short_rental_deposit_deductions
to authenticated;


-- ============================================================
-- 9. RPC — PREPARE / GET RESOLUTION
-- ============================================================

create or replace function
public.prepare_short_rental_deposit_resolution(
    p_booking_id uuid
)
returns public.short_rental_deposit_resolutions
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_deposit public.short_rental_deposits%rowtype;
    v_inspection public.inspections%rowtype;
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_available numeric;
begin
    v_user_id := auth.uid();

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

    if p_booking_id is null then
        raise exception
            'Identifiant de réservation obligatoire.'
            using errcode = '22023';
    end if;

    select d.*
    into v_deposit
    from public.short_rental_deposits d
    where d.booking_id =
        p_booking_id
      and d.organization_id =
        v_org_id
    for update;

    if not found then
        raise exception
            'Aucune caution de cette organisation n''est rattachée à cette réservation.'
            using errcode = '23503';
    end if;

    select r.*
    into v_resolution
    from public.short_rental_deposit_resolutions r
    where r.deposit_id =
            v_deposit.id
      and r.status <>
            'cancelled'
    order by r.created_at desc
    limit 1;

    if found then
        return v_resolution;
    end if;

    select i.*
    into v_inspection
    from public.inspections i
    where i.booking_id =
            p_booking_id
      and i.organization_id =
            v_org_id
      and i.kind =
            'checkout'::public.inspection_kind;

    if not found then
        raise exception
            'Aucun état des lieux de sortie n''est rattaché à cette réservation.'
            using errcode = '23503';
    end if;

    if v_inspection.finalized_at is null then
        raise exception
            'L''état des lieux de sortie doit être finalisé avant la décision sur la caution.'
            using errcode = '23514';
    end if;

    v_available :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );

    if v_available <= 0 then
        raise exception
            'Aucun montant de caution n''est disponible à résoudre.'
            using errcode = '23514';
    end if;

    insert into public.short_rental_deposit_resolutions (
        deposit_id,
        inspection_id,
        created_by
    )
    values (
        v_deposit.id,
        v_inspection.id,
        v_user_id
    )
    returning *
    into v_resolution;

    return v_resolution;
end;
$function$;


-- ============================================================
-- 10. RPC — ADD / UPDATE ONE DEDUCTION
-- ============================================================

create or replace function
public.upsert_short_rental_deposit_deduction(
    p_resolution_id uuid,
    p_finding_id uuid,
    p_amount numeric,
    p_reason text
)
returns public.short_rental_deposit_deductions
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_deduction public.short_rental_deposit_deductions%rowtype;
begin
    v_user_id := auth.uid();

    if v_user_id is null
       or not public.is_staff(v_user_id)
    then
        raise exception
            'Accès refusé.'
            using errcode = '42501';
    end if;

    v_org_id :=
        public.current_org_id();

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

    if v_resolution.status <> 'draft' then
        raise exception
            'La résolution n''est plus modifiable.'
            using errcode = '23514';
    end if;

    insert into public.short_rental_deposit_deductions (
        resolution_id,
        inspection_finding_id,
        deduction_amount,
        reason,
        created_by
    )
    values (
        p_resolution_id,
        p_finding_id,
        p_amount,
        p_reason,
        v_user_id
    )
    on conflict (
        resolution_id,
        inspection_finding_id
    )
    do update
    set
        deduction_amount =
            excluded.deduction_amount,

        reason =
            excluded.reason

    returning *
    into v_deduction;

    return v_deduction;
end;
$function$;


-- ============================================================
-- 11. RPC — DELETE ONE DEDUCTION
-- ============================================================

create or replace function
public.delete_short_rental_deposit_deduction(
    p_resolution_id uuid,
    p_finding_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_deleted_count integer := 0;
begin
    v_user_id := auth.uid();

    if v_user_id is null
       or not public.is_staff(v_user_id)
    then
        raise exception
            'Accès refusé.'
            using errcode = '42501';
    end if;

    v_org_id :=
        public.current_org_id();

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

    if v_resolution.status <> 'draft' then
        raise exception
            'La résolution n''est plus modifiable.'
            using errcode = '23514';
    end if;

    delete from public.short_rental_deposit_deductions d
    where d.resolution_id =
            p_resolution_id
      and d.inspection_finding_id =
            p_finding_id;

    get diagnostics
        v_deleted_count =
            row_count;

    return v_deleted_count > 0;
end;
$function$;


-- ============================================================
-- 12. RPC — APPROVE RESOLUTION
-- ============================================================

create or replace function
public.approve_short_rental_deposit_resolution(
    p_resolution_id uuid,
    p_notes text default ''
)
returns public.short_rental_deposit_resolutions
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_deposit public.short_rental_deposits%rowtype;
    v_inspection public.inspections%rowtype;
    v_available numeric;
    v_detail_total numeric;
begin
    v_user_id := auth.uid();

    if v_user_id is null
       or not public.is_staff(v_user_id)
    then
        raise exception
            'Accès refusé.'
            using errcode = '42501';
    end if;

    v_org_id :=
        public.current_org_id();

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

    if v_resolution.status <> 'draft' then
        raise exception
            'Seule une résolution brouillon peut être approuvée.'
            using errcode = '23514';
    end if;

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

    select i.*
    into v_inspection
    from public.inspections i
    where i.id =
        v_resolution.inspection_id;

    if not found
       or v_inspection.kind
            <> 'checkout'::public.inspection_kind
       or v_inspection.finalized_at is null
       or v_inspection.booking_id
            is distinct from
            v_resolution.booking_id
       or v_inspection.organization_id
            is distinct from
            v_resolution.organization_id
    then
        raise exception
            'L''état des lieux finalisé de sortie n''est plus valide pour cette résolution.'
            using errcode = '23514';
    end if;

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
            'La caution disponible a changé depuis la préparation de la résolution. Annulez cette résolution puis préparez-en une nouvelle.'
            using errcode = '40001';
    end if;

    select coalesce(
        sum(d.deduction_amount),
        0
    )
    into v_detail_total
    from public.short_rental_deposit_deductions d
    where d.resolution_id =
        v_resolution.id;

    if v_detail_total
        is distinct from
        v_resolution.deduction_amount
    then
        raise exception
            'Le détail des retenues et le total de la résolution sont incohérents.'
            using errcode = '23514';
    end if;

    if v_detail_total >
        v_available
    then
        raise exception
            'Le total des retenues dépasse la caution disponible.'
            using errcode = '23514';
    end if;

    update public.short_rental_deposit_resolutions
    set
        status =
            'approved',

        decision_notes =
            btrim(
                coalesce(
                    p_notes,
                    ''
                )
            ),

        approved_at =
            now(),

        approved_by =
            v_user_id

    where id =
        v_resolution.id

    returning *
    into v_resolution;

    return v_resolution;
end;
$function$;


-- ============================================================
-- 13. RPC — CANCEL RESOLUTION BEFORE EXECUTION
-- ============================================================

create or replace function
public.cancel_short_rental_deposit_resolution(
    p_resolution_id uuid,
    p_reason text
)
returns public.short_rental_deposit_resolutions
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_resolution public.short_rental_deposit_resolutions%rowtype;
    v_reason text;
begin
    v_user_id := auth.uid();

    if v_user_id is null
       or not public.is_staff(v_user_id)
    then
        raise exception
            'Accès refusé.'
            using errcode = '42501';
    end if;

    v_org_id :=
        public.current_org_id();

    v_reason :=
        btrim(
            coalesce(
                p_reason,
                ''
            )
        );

    if v_reason = '' then
        raise exception
            'Le motif d''annulation est obligatoire.'
            using errcode = '22023';
    end if;

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

    if v_resolution.status not in (
        'draft',
        'approved'
    )
    then
        raise exception
            'Cette résolution ne peut plus être annulée.'
            using errcode = '23514';
    end if;

    update public.short_rental_deposit_resolutions
    set
        status =
            'cancelled',

        cancelled_at =
            now(),

        cancelled_by =
            v_user_id,

        cancellation_reason =
            v_reason

    where id =
        v_resolution.id

    returning *
    into v_resolution;

    return v_resolution;
end;
$function$;


-- ============================================================
-- 14. RPC PRIVILEGES
-- ============================================================

revoke all
on function
public.prepare_short_rental_deposit_resolution(uuid)
from public, anon;

revoke all
on function
public.upsert_short_rental_deposit_deduction(
    uuid,
    uuid,
    numeric,
    text
)
from public, anon;

revoke all
on function
public.delete_short_rental_deposit_deduction(
    uuid,
    uuid
)
from public, anon;

revoke all
on function
public.approve_short_rental_deposit_resolution(
    uuid,
    text
)
from public, anon;

revoke all
on function
public.cancel_short_rental_deposit_resolution(
    uuid,
    text
)
from public, anon;


grant execute
on function
public.prepare_short_rental_deposit_resolution(uuid)
to authenticated;

grant execute
on function
public.upsert_short_rental_deposit_deduction(
    uuid,
    uuid,
    numeric,
    text
)
to authenticated;

grant execute
on function
public.delete_short_rental_deposit_deduction(
    uuid,
    uuid
)
to authenticated;

grant execute
on function
public.approve_short_rental_deposit_resolution(
    uuid,
    text
)
to authenticated;

grant execute
on function
public.cancel_short_rental_deposit_resolution(
    uuid,
    text
)
to authenticated;


-- ============================================================
-- 15. DOCUMENTATION
-- ============================================================

comment on table
public.short_rental_deposit_resolutions
is
'Decision layer for a short-rental security deposit after a finalized checkout inspection. Financial truth remains in short_rental_deposits and short_rental_deposit_movements.';


comment on table
public.short_rental_deposit_deductions
is
'Detailed planned deposit deductions linked to findings from the finalized checkout inspection.';


comment on column
public.short_rental_deposit_resolutions.available_amount_snapshot
is
'Available deposit amount at resolution preparation time: collected - released - withheld. Approval fails if the live available amount has changed.';


comment on column
public.short_rental_deposit_resolutions.deduction_amount
is
'Planned total to withhold. Automatically recalculated from short_rental_deposit_deductions.';


comment on column
public.short_rental_deposit_resolutions.release_amount
is
'Planned amount to return to the guest. Automatically equals available_amount_snapshot - deduction_amount.';


comment on column
public.short_rental_deposit_deductions.estimated_cost_snapshot
is
'Snapshot of inspection_findings.estimated_cost when the deduction line is created. It is evidence/context, not the accounting amount.';


comment on function
public.prepare_short_rental_deposit_resolution(uuid)
is
'Creates or returns the unique deposit resolution for a booking. Requires staff access, same organization, available held funds, and a finalized checkout inspection.';


comment on function
public.upsert_short_rental_deposit_deduction(
    uuid,
    uuid,
    numeric,
    text
)
is
'Adds or updates a planned deduction for one finding while the resolution is draft. The decided amount is independent from the finding estimated cost.';


comment on function
public.approve_short_rental_deposit_resolution(
    uuid,
    text
)
is
'Approves a draft resolution after revalidating checkout finalization, organization, booking binding, detailed totals and the current available deposit amount. Does not execute financial movements.';


comment on function
public.cancel_short_rental_deposit_resolution(
    uuid,
    text
)
is
'Cancels a draft or approved deposit resolution before financial execution.';


commit;
