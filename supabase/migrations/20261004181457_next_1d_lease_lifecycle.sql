-- ============================================================
-- AMIMMO NEXT-1D-S1A
-- LONG-TERM LEASE LIFECYCLE
-- ============================================================

-- ------------------------------------------------------------
-- Explicit termination metadata
-- ------------------------------------------------------------

alter table public.leases
add column termination_date date null;

alter table public.leases
add column termination_reason text null;

-- A known termination date cannot precede the lease start.
alter table public.leases
add constraint leases_termination_date_check
check (
    termination_date is null
    or termination_date >= start_date
);

-- Termination metadata belongs exclusively to terminated leases.
-- Existing legacy terminated leases may temporarily have no
-- termination_date: future transitions are protected by trigger.
alter table public.leases
add constraint leases_termination_metadata_status_check
check (
    status = 'terminated'
    or (
        termination_date is null
        and termination_reason is null
    )
);

alter table public.leases
add constraint leases_termination_reason_nonblank_check
check (
    termination_reason is null
    or btrim(termination_reason) <> ''
);

-- ------------------------------------------------------------
-- Lease status state machine
-- ------------------------------------------------------------

create or replace function public.guard_lease_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    -- ========================================================
    -- INSERT
    -- ========================================================

    if tg_op = 'INSERT' then
        if new.status <> 'pending' then
            raise exception using
                errcode = '23514',
                message = 'Un nouveau bail doit être créé avec le statut en attente.';
        end if;

        if new.termination_date is not null
           or new.termination_reason is not null
        then
            raise exception using
                errcode = '23514',
                message = 'Un nouveau bail ne peut pas contenir de données de résiliation.';
        end if;

        return new;
    end if;

    -- ========================================================
    -- VALIDATIONS COMMUNES AUX UPDATE
    -- ========================================================

    if new.termination_date is not null
       and new.termination_date > current_date
    then
        raise exception using
            errcode = '23514',
            message = 'La date de résiliation ne peut pas être future.';
    end if;

    -- ========================================================
    -- ETATS TERMINAUX
    -- ========================================================

    if old.status = 'terminated' then
        if new.status <> 'terminated' then
            raise exception using
                errcode = '23514',
                message = 'Un bail résilié ne peut pas changer de statut.';
        end if;

        -- Les métadonnées historiques de résiliation deviennent
        -- immuables après la résiliation.
        if new.termination_date is distinct from old.termination_date
           or new.termination_reason is distinct from old.termination_reason
        then
            raise exception using
                errcode = '23514',
                message = 'Les données de résiliation d''un bail résilié ne peuvent plus être modifiées.';
        end if;

        return new;
    end if;

    if old.status = 'expired' then
        if new.status <> 'expired' then
            raise exception using
                errcode = '23514',
                message = 'Un bail expiré ne peut pas changer de statut.';
        end if;

        if new.end_date is null then
            raise exception using
                errcode = '23514',
                message = 'Un bail expiré doit conserver une date de fin contractuelle.';
        end if;

        if new.end_date > current_date then
            raise exception using
                errcode = '23514',
                message = 'La date de fin d''un bail expiré ne peut pas être future.';
        end if;

        return new;
    end if;

    -- ========================================================
    -- UPDATE SANS CHANGEMENT DE STATUT
    -- ========================================================

    if old.status = new.status then
        return new;
    end if;

    -- ========================================================
    -- PENDING -> ACTIVE
    -- ========================================================

    if old.status = 'pending'
       and new.status = 'active'
    then
        return new;
    end if;

    -- ========================================================
    -- ACTIVE -> EXPIRED
    -- ========================================================

    if old.status = 'active'
       and new.status = 'expired'
    then
        if new.end_date is null then
            raise exception using
                errcode = '23514',
                message = 'Une date de fin contractuelle est obligatoire pour expirer le bail.';
        end if;

        if new.end_date > current_date then
            raise exception using
                errcode = '23514',
                message = 'Un bail ne peut pas être marqué expiré avant sa date de fin.';
        end if;

        return new;
    end if;

    -- ========================================================
    -- ACTIVE -> TERMINATED
    -- ========================================================

    if old.status = 'active'
       and new.status = 'terminated'
    then
        if new.termination_date is null then
            raise exception using
                errcode = '23514',
                message = 'La date effective de résiliation est obligatoire.';
        end if;

        return new;
    end if;

    -- ========================================================
    -- TOUTE AUTRE TRANSITION EST INTERDITE
    -- ========================================================

    raise exception using
        errcode = '23514',
        message = format(
            'Transition de statut de bail interdite : %s -> %s.',
            old.status,
            new.status
        );
end;
$$;

drop trigger if exists trg_guard_lease_insert_status
on public.leases;

create trigger trg_guard_lease_insert_status
before insert
on public.leases
for each row
execute function public.guard_lease_status_transition();

drop trigger if exists trg_guard_lease_status_transition
on public.leases;

create trigger trg_guard_lease_status_transition
before update of
    status,
    termination_date,
    termination_reason,
    end_date
on public.leases
for each row
execute function public.guard_lease_status_transition();

revoke execute on function public.guard_lease_status_transition()
from public, anon, authenticated;
