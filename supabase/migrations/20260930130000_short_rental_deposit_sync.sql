-- ============================================================
-- AMIMMO
-- CAUTION COURTE DUREE - V1-B1
-- Synchronisation booking -> caution métier
-- + reprise contrôlée des réservations actives existantes
-- ============================================================

begin;


-- ============================================================
-- 1. FONCTION INTERNE DE SYNCHRONISATION
-- ============================================================
--
-- Une caution métier est créée lorsqu'une réservation ayant
-- une caution contractuelle devient :
--
--   confirmed
--   in_progress
--
-- bookings.deposit reste le snapshot contractuel.
--
-- short_rental_deposits représente ensuite le cycle métier
-- réel de cette caution.
--
-- Tant qu'aucun mouvement financier n'existe, le snapshot
-- peut encore être resynchronisé.
--
-- Dès qu'une partie de la caution a été encaissée, restituée
-- ou retenue, les éléments financiers structurants deviennent
-- immuables.
-- ============================================================

create or replace function
public.sync_short_rental_deposit_from_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_deposit
        public.short_rental_deposits%rowtype;

    v_has_financial_activity boolean := false;

begin

    -- ========================================================
    -- 1. RECHERCHER UNE CAUTION EXISTANTE
    -- ========================================================

    select d.*
    into v_deposit

    from public.short_rental_deposits d

    where d.booking_id = new.id

    for update;


    -- ========================================================
    -- 2. DETECTER UNE ACTIVITE FINANCIERE EXISTANTE
    -- ========================================================

    if found then

        v_has_financial_activity :=

            coalesce(
                v_deposit.collected_amount,
                0
            ) > 0

            or

            coalesce(
                v_deposit.released_amount,
                0
            ) > 0

            or

            coalesce(
                v_deposit.withheld_amount,
                0
            ) > 0;

    end if;


    -- ========================================================
    -- 3. PROTECTION APRES ACTIVITE FINANCIERE
    -- ========================================================
    --
    -- Dès qu'un mouvement financier a eu lieu, les éléments
    -- structurants de la caution ne peuvent plus être modifiés
    -- silencieusement.
    --
    -- Ce contrôle est effectué AVANT celui du statut afin
    -- d'empêcher qu'une annulation ou une clôture de réservation
    -- soit utilisée pour modifier simultanément :
    --
    --   - le montant de caution,
    --   - la devise,
    --   - le bien,
    --   - l'organisation.
    -- ========================================================

    if v_deposit.id is not null
       and v_has_financial_activity
    then

        if v_deposit.expected_amount
           is distinct from
           new.deposit
        then

            raise exception
                'Impossible de modifier la caution contractuelle après le début des mouvements financiers';

        end if;


        if v_deposit.currency
           is distinct from
           new.currency
        then

            raise exception
                'Impossible de modifier la devise de la caution après le début des mouvements financiers';

        end if;


        if v_deposit.property_id
           is distinct from
           new.property_id
        then

            raise exception
                'Impossible de changer le bien associé à une caution ayant déjà des mouvements financiers';

        end if;


        if v_deposit.organization_id
           is distinct from
           new.organization_id
        then

            raise exception
                'Impossible de changer l''organisation associée à une caution ayant déjà des mouvements financiers';

        end if;

    end if;


    -- ========================================================
    -- 4. RESERVATION TERMINEE OU ANNULEE
    -- ========================================================
    --
    -- Cas sans activité financière :
    --
    -- une caution simplement attendue est clôturée sans générer
    -- de mouvement financier.
    --
    -- Cas avec activité financière :
    --
    -- aucune clôture automatique n'est effectuée.
    --
    -- La caution devra être :
    --
    --   - restituée,
    --   - retenue,
    --   - ou répartie entre restitution et retenue,
    --
    -- par les RPC métier financières de V1-B.
    -- ========================================================

    if new.status in (
        'cancelled'::public.booking_status,
        'completed'::public.booking_status
    ) then

        if v_deposit.id is not null
           and not v_has_financial_activity
        then

            update public.short_rental_deposits

            set
                status =
                    'cancelled',

                closed_at =
                    coalesce(
                        closed_at,
                        now()
                    ),

                updated_at =
                    now()

            where id =
                v_deposit.id;

        end if;


        return new;

    end if;


    -- ========================================================
    -- 5. AUTRES STATUTS NON ELIGIBLES
    -- ========================================================
    --
    -- request / option / autres états éventuels :
    --
    -- aucune caution métier n'est créée tant que la réservation
    -- n'est pas confirmée.
    -- ========================================================

    if new.status not in (
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
    ) then

        return new;

    end if;


    -- ========================================================
    -- 6. ABSENCE DE CAUTION CONTRACTUELLE
    -- ========================================================

    if coalesce(new.deposit, 0) <= 0 then

        -- ----------------------------------------------------
        -- Aucune caution métier existante
        -- ----------------------------------------------------

        if v_deposit.id is null then

            return new;

        end if;


        -- ----------------------------------------------------
        -- Une activité financière existe
        --
        -- Ce cas est normalement déjà intercepté par le
        -- contrôle d'immuabilité ci-dessus.
        -- ----------------------------------------------------

        if v_has_financial_activity then

            raise exception
                'Impossible de supprimer la caution contractuelle après le début des mouvements financiers';

        end if;


        -- ----------------------------------------------------
        -- Caution jamais encaissée :
        -- fermeture propre de l'objet métier
        -- ----------------------------------------------------

        update public.short_rental_deposits

        set
            expected_amount =
                0,

            status =
                'cancelled',

            closed_at =
                coalesce(
                    closed_at,
                    now()
                ),

            updated_at =
                now()

        where id =
            v_deposit.id;


        return new;

    end if;


    -- ========================================================
    -- 7. DEVISE OBLIGATOIRE
    -- ========================================================

    if nullif(
        trim(
            coalesce(
                new.currency,
                ''
            )
        ),
        ''
    ) is null then

        raise exception
            'Impossible de créer la caution : devise de réservation absente';

    end if;


    -- ========================================================
    -- 8. PREMIERE CREATION
    -- ========================================================

    if v_deposit.id is null then

        insert into public.short_rental_deposits (

            organization_id,

            booking_id,

            property_id,

            expected_amount,

            collected_amount,

            released_amount,

            withheld_amount,

            currency,

            status,

            notes,

            created_by

        )

        values (

            new.organization_id,

            new.id,

            new.property_id,

            new.deposit,

            0,

            0,

            0,

            new.currency,

            'expected',

            'Caution créée automatiquement depuis le snapshot de réservation.',

            auth.uid()

        );


        return new;

    end if;


    -- ========================================================
    -- 9. ACTIVITE FINANCIERE EXISTANTE
    -- ========================================================
    --
    -- Les invariants ont déjà été contrôlés en début de
    -- fonction.
    --
    -- Aucune resynchronisation automatique supplémentaire
    -- n'est autorisée.
    -- ========================================================

    if v_has_financial_activity then

        return new;

    end if;


    -- ========================================================
    -- 10. AUCUN MOUVEMENT FINANCIER
    -- ========================================================
    --
    -- Tant qu'aucune somme n'a été encaissée, la caution métier
    -- peut encore suivre le snapshot contractuel de bookings.
    --
    -- Exemple :
    --
    --   400000 -> 500000
    --
    -- avant encaissement.
    -- ========================================================

    update public.short_rental_deposits

    set
        organization_id =
            new.organization_id,

        property_id =
            new.property_id,

        expected_amount =
            new.deposit,

        currency =
            new.currency,

        status =
            'expected',

        closed_at =
            null,

        updated_at =
            now()

    where id =
        v_deposit.id;


    return new;

end;

$function$;


-- ============================================================
-- 2. TRIGGER BOOKING -> CAUTION
-- ============================================================

drop trigger if exists
    trg_sync_short_rental_deposit_from_booking
on public.bookings;


create trigger
    trg_sync_short_rental_deposit_from_booking

after insert
or update of
    status,
    deposit,
    property_id,
    organization_id,
    currency

on public.bookings

for each row

execute function
    public.sync_short_rental_deposit_from_booking();


-- ============================================================
-- 3. REPRISE DES RESERVATIONS ACTIVES EXISTANTES
-- ============================================================
--
-- Date de bascule V1 caution :
--
--     2026-09-30
--
-- Nous NE reconstituons PAS l'historique des cautions.
--
-- Sont volontairement ignorées :
--
--   completed
--   cancelled
--   request
--   option
--
-- Les réservations confirmed / in_progress dont le séjour
-- continue après la date de bascule reçoivent uniquement une
-- caution métier avec :
--
--   expected_amount = bookings.deposit
--   collected_amount = 0
--   released_amount = 0
--   withheld_amount = 0
--   status = expected
--
-- Aucun encaissement historique n'est supposé.
-- Aucun mouvement comptable n'est créé.
-- Aucun mouvement de trésorerie n'est créé.
-- Aucun mouvement de caution n'est créé.
-- ============================================================

insert into public.short_rental_deposits (

    organization_id,

    booking_id,

    property_id,

    expected_amount,

    collected_amount,

    released_amount,

    withheld_amount,

    currency,

    status,

    collected_at,

    closed_at,

    notes,

    created_by

)

select

    b.organization_id,

    b.id,

    b.property_id,

    b.deposit,

    0,

    0,

    0,

    b.currency,

    'expected',

    null,

    null,

    'Backfill V1-B1 du 2026-09-30 : caution attendue uniquement. Aucun encaissement historique déduit.',

    null

from public.bookings b

where b.status in (
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
    )

  and coalesce(
        b.deposit,
        0
      ) > 0

  and b.check_out >
        date '2026-09-30'

on conflict (
    booking_id
)
do nothing;


-- ============================================================
-- 4. SECURITE DE LA FONCTION INTERNE
-- ============================================================
--
-- Cette fonction est exclusivement destinée au trigger.
--
-- Elle ne doit pas constituer une RPC directement accessible
-- depuis le frontend.
-- ============================================================

revoke all
on function
    public.sync_short_rental_deposit_from_booking()
from public;


revoke all
on function
    public.sync_short_rental_deposit_from_booking()
from anon;


revoke all
on function
    public.sync_short_rental_deposit_from_booking()
from authenticated;


-- ============================================================
-- 5. DOCUMENTATION
-- ============================================================

comment on function
public.sync_short_rental_deposit_from_booking()
is
'Synchronise automatiquement bookings.deposit vers short_rental_deposits lors de la confirmation et pendant une réservation active. Une caution non encaissée peut suivre le snapshot contractuel. Après le premier mouvement financier, le montant, la devise, le bien et l''organisation deviennent immuables. Une réservation terminée ou annulée ne clôture automatiquement la caution que si aucune activité financière n''a eu lieu.';


commit;