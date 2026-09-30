-- ============================================================
-- AMIMMO
-- CAUTION COURTE DUREE - V1-B3
-- Restitution atomique de tout ou partie d'une caution
-- ============================================================

begin;


-- ============================================================
-- 1. RPC DE RESTITUTION DE CAUTION
-- ============================================================

create or replace function
public.release_short_rental_deposit(

    p_booking_id uuid,

    p_amount numeric,

    p_payment_method text,

    p_released_at timestamptz default now(),

    p_reference text default null,

    p_notes text default ''

)
returns table (

    deposit_id uuid,

    movement_id uuid,

    treasury_movement_id uuid,

    accounting_entry_id uuid,

    movement_reference text,

    amount numeric,

    currency text,

    deposit_status text,

    released_amount numeric,

    remaining_amount numeric,

    reused boolean

)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_booking
        public.bookings%rowtype;

    v_deposit
        public.short_rental_deposits%rowtype;

    v_existing_movement
        public.short_rental_deposit_movements%rowtype;

    v_treasury
        public.treasury_accounts%rowtype;

    v_treasury_account_id uuid;

    v_treasury_accounting_id uuid;

    v_deposit_account_id uuid;

    v_journal_id uuid;

    v_accounting_entry_id uuid;

    v_treasury_movement_id uuid;

    v_deposit_movement_id uuid;

    v_accounting_reference text;

    v_treasury_reference text;

    v_deposit_reference text;

    v_external_reference text;

    v_payment_method text;

    v_effective_released_at timestamptz;

    v_treasury_balance numeric := 0;

    v_available_amount numeric := 0;

    v_new_released numeric := 0;

    v_remaining numeric := 0;

    v_new_status text;

    v_new_closed_at timestamptz;

begin

    -- ========================================================
    -- 1. AUTHENTIFICATION / AUTORISATION
    -- ========================================================

    if auth.uid() is null then

        raise exception
            'Authentification requise';

    end if;


    if not public.is_staff(auth.uid()) then

        raise exception
            'Accès refusé';

    end if;


    -- ========================================================
    -- 2. VALIDATION DES PARAMETRES
    -- ========================================================

    if p_booking_id is null then

        raise exception
            'Réservation obligatoire';

    end if;


    if coalesce(p_amount, 0) <= 0 then

        raise exception
            'Le montant à restituer doit être supérieur à zéro';

    end if;


    v_payment_method :=
        lower(
            trim(
                coalesce(
                    p_payment_method,
                    ''
                )
            )
        );


    if v_payment_method not in (
        'cash',
        'transfer',
        'mobile_money',
        'card',
        'cheque'
    ) then

        raise exception
            'Moyen de restitution non pris en charge : %',
            v_payment_method;

    end if;


    v_effective_released_at :=
        coalesce(
            p_released_at,
            now()
        );


    v_external_reference :=
        nullif(
            trim(
                coalesce(
                    p_reference,
                    ''
                )
            ),
            ''
        );


    -- ========================================================
    -- 3. VERROUILLER LA RESERVATION
    -- ========================================================

    select b.*
    into v_booking

    from public.bookings b

    where b.id = p_booking_id

    for update;


    if not found then

        raise exception
            'Réservation introuvable';

    end if;


    -- ========================================================
    -- 4. VERROUILLER LA CAUTION
    -- ========================================================

    select d.*
    into v_deposit

    from public.short_rental_deposits d

    where d.booking_id = v_booking.id

    for update;


    if not found then

        raise exception
            'Aucune caution métier n''est associée à cette réservation';

    end if;


    -- ========================================================
    -- 5. IDEMPOTENCE
    -- ========================================================
    --
    -- Le contrôle est effectué AVANT les contrôles de statut.
    --
    -- Une répétition exacte d'une restitution déjà enregistrée
    -- doit pouvoir retourner le mouvement existant sans créer
    -- une deuxième opération.
    -- ========================================================

    if v_external_reference is not null then

        select m.*
        into v_existing_movement

        from public.short_rental_deposit_movements m

        where m.deposit_id =
                v_deposit.id

          and m.external_reference =
                v_external_reference

        limit 1;


        if found then

            if v_existing_movement.movement_type
                   <> 'release'

               or v_existing_movement.amount
                   <> p_amount

               or v_existing_movement.payment_method::text
                   is distinct from
                   v_payment_method
            then

                raise exception
                    'La référence externe % existe déjà avec des caractéristiques différentes',
                    v_external_reference;

            end if;


            return query

            select
                v_deposit.id,
                v_existing_movement.id,
                v_existing_movement.treasury_movement_id,
                v_existing_movement.accounting_entry_id,
                v_existing_movement.reference,
                v_existing_movement.amount,
                v_existing_movement.currency,
                v_deposit.status,
                v_deposit.released_amount,
                greatest(
                    v_deposit.collected_amount
                    - v_deposit.released_amount
                    - v_deposit.withheld_amount,
                    0
                ),
                true;


            return;

        end if;

    end if;


    -- ========================================================
    -- 6. STATUT DE RESERVATION
    -- ========================================================
    --
    -- Restitution autorisée uniquement :
    --
    --   completed
    --       séjour terminé normalement
    --
    --   cancelled
    --       réservation annulée après encaissement éventuel
    --
    -- Une réservation confirmed / in_progress ne peut pas
    -- restituer sa caution.
    -- ========================================================

    if v_booking.status not in (
        'completed'::public.booking_status,
        'cancelled'::public.booking_status
    ) then

        raise exception
            'La caution ne peut être restituée tant que la réservation est au statut %',
            v_booking.status;

    end if;


    -- Une réservation completed doit provenir d'un check-out
    -- effectif.

    if v_booking.status =
            'completed'::public.booking_status

       and v_booking.checked_out_at is null
    then

        raise exception
            'Impossible de restituer la caution : réservation terminée sans check-out enregistré';

    end if;


    -- ========================================================
    -- 7. COHERENCE RESERVATION / CAUTION
    -- ========================================================

    if v_deposit.currency
       is distinct from
       v_booking.currency
    then

        raise exception
            'Incohérence de devise entre la réservation et la caution';

    end if;


    if v_deposit.property_id
       is distinct from
       v_booking.property_id
    then

        raise exception
            'Incohérence de bien entre la réservation et la caution';

    end if;


    -- ========================================================
    -- 8. VERIFIER QU'UNE CAUTION A ETE ENCAISSEE
    -- ========================================================

    if coalesce(
        v_deposit.collected_amount,
        0
    ) <= 0
    then

        raise exception
            'Aucune caution encaissée n''est disponible pour restitution';

    end if;


    -- ========================================================
    -- 9. MONTANT ENCORE DETENU
    -- ========================================================
    --
    -- Disponible =
    --
    -- collected
    -- - released
    -- - withheld
    -- ========================================================

    v_available_amount :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );


    if v_available_amount <= 0 then

        raise exception
            'Aucun montant de caution n''est encore disponible pour restitution';

    end if;


    if p_amount > v_available_amount then

        raise exception
            'Le montant à restituer (%) dépasse la caution encore disponible (%)',
            p_amount,
            v_available_amount;

    end if;


    -- ========================================================
    -- 10. COMPTE DE TRESORERIE
    -- ========================================================

    v_treasury_account_id :=
        public.get_treasury_account_for_payment_method(
            v_payment_method
        );


    if v_treasury_account_id is null then

        raise exception
            'Aucun compte de trésorerie n''est disponible pour le moyen de restitution %',
            v_payment_method;

    end if;


    select ta.*
    into v_treasury

    from public.treasury_accounts ta

    where ta.id =
            v_treasury_account_id

      and ta.active = true

    for update;


    if not found then

        raise exception
            'Compte de trésorerie introuvable ou inactif';

    end if;


    v_treasury_accounting_id :=
        v_treasury.accounting_account_id;


    if v_treasury_accounting_id is null then

        raise exception
            'Le compte de trésorerie ne possède pas de compte comptable associé';

    end if;


    if v_treasury.currency
       is distinct from
       v_deposit.currency
    then

        raise exception
            'Devise incompatible : caution % / trésorerie %',
            v_deposit.currency,
            v_treasury.currency;

    end if;


    -- ========================================================
    -- 11. SOLDE DE TRESORERIE
    -- ========================================================

    select tab.balance
    into v_treasury_balance

    from public.treasury_account_balances tab

    where tab.id =
        v_treasury_account_id;


    v_treasury_balance :=
        coalesce(
            v_treasury_balance,
            0
        );


    if v_treasury_balance < p_amount then

        raise exception
            'Solde insuffisant sur % : disponible % %, restitution demandée % %',
            v_treasury.name,
            v_treasury_balance,
            v_treasury.currency,
            p_amount,
            v_treasury.currency;

    end if;


    -- ========================================================
    -- 12. COMPTE COMPTABLE 165100
    -- ========================================================

    select aa.id
    into v_deposit_account_id

    from public.accounting_accounts aa

    where aa.code =
            '165100'

      and aa.account_type =
            'liability'

      and aa.active = true

    limit 1;


    if v_deposit_account_id is null then

        raise exception
            'Compte comptable de caution 165100 introuvable ou inactif';

    end if;


    -- ========================================================
    -- 13. JOURNAL
    -- ========================================================

    select aj.id
    into v_journal_id

    from public.accounting_journals aj

    where aj.code =

        case

            when v_payment_method = 'cash'
                then 'CA'

            when v_payment_method = 'mobile_money'
                then 'MM'

            when v_payment_method in (
                'transfer',
                'card',
                'cheque'
            )
                then 'BQ'

            else 'OD'

        end

      and aj.active = true

    limit 1;


    if v_journal_id is null then

        raise exception
            'Journal comptable introuvable pour le moyen de restitution %',
            v_payment_method;

    end if;


    -- ========================================================
    -- 14. REFERENCES INTERNES
    -- ========================================================

    v_deposit_reference :=
        'DEP-REL-'
        || to_char(
            clock_timestamp(),
            'YYYYMMDD'
        )
        || '-'
        || upper(
            substr(
                replace(
                    gen_random_uuid()::text,
                    '-',
                    ''
                ),
                1,
                8
            )
        );


    v_accounting_reference :=
        'EC-DEP-REL-'
        || to_char(
            clock_timestamp(),
            'YYYYMMDD'
        )
        || '-'
        || upper(
            substr(
                replace(
                    gen_random_uuid()::text,
                    '-',
                    ''
                ),
                1,
                8
            )
        );


    v_treasury_reference :=
        'TRE-DEP-REL-'
        || to_char(
            clock_timestamp(),
            'YYYYMMDD'
        )
        || '-'
        || upper(
            substr(
                replace(
                    gen_random_uuid()::text,
                    '-',
                    ''
                ),
                1,
                8
            )
        );


    -- ========================================================
    -- 15. ECRITURE COMPTABLE
    -- ========================================================
    --
    -- Restitution de caution :
    --
    --     Dr 165100
    --     Cr Trésorerie
    --
    -- La dette envers le voyageur diminue.
    -- ========================================================

    insert into public.accounting_entries (

        journal_id,

        reference,

        entry_date,

        label,

        status,

        currency,

        notes,

        created_by

    )

    values (

        v_journal_id,

        v_accounting_reference,

        v_effective_released_at,

        'Restitution caution - '
            || v_booking.reference,

        'posted',

        v_deposit.currency,

        concat(
            'Restitution caution réservation ',
            v_booking.reference,

            case
                when v_external_reference is not null
                then
                    ' / Référence externe '
                    || v_external_reference
                else
                    ''
            end,

            case
                when nullif(
                    trim(
                        coalesce(
                            p_notes,
                            ''
                        )
                    ),
                    ''
                ) is not null
                then
                    ' / '
                    || trim(p_notes)
                else
                    ''
            end
        ),

        auth.uid()

    )

    returning id
    into v_accounting_entry_id;


    -- ========================================================
    -- 16. DEBIT 165100
    -- ========================================================

    insert into public.accounting_entry_lines (

        entry_id,

        account_id,

        label,

        debit,

        credit

    )

    values (

        v_accounting_entry_id,

        v_deposit_account_id,

        'Restitution caution voyageur - '
            || v_booking.reference,

        p_amount,

        0

    );


    -- ========================================================
    -- 17. CREDIT TRESORERIE
    -- ========================================================

    insert into public.accounting_entry_lines (

        entry_id,

        account_id,

        label,

        debit,

        credit

    )

    values (

        v_accounting_entry_id,

        v_treasury_accounting_id,

        'Sortie restitution caution - '
            || v_booking.reference,

        0,

        p_amount

    );


    -- ========================================================
    -- 18. MOUVEMENT DE TRESORERIE
    -- ========================================================

    insert into public.treasury_movements (

        reference,

        movement_type,

        source_account_id,

        destination_account_id,

        amount,

        currency,

        movement_date,

        label,

        external_reference,

        notes,

        accounting_entry_id,

        created_by

    )

    values (

        v_treasury_reference,

        'withdrawal'::public.treasury_movement_type,

        v_treasury_account_id,

        null,

        p_amount,

        v_deposit.currency,

        v_effective_released_at,

        'Restitution caution - '
            || v_booking.reference,

        v_external_reference,

        coalesce(
            p_notes,
            ''
        ),

        v_accounting_entry_id,

        auth.uid()

    )

    returning id
    into v_treasury_movement_id;


    -- ========================================================
    -- 19. MOUVEMENT METIER DE CAUTION
    -- ========================================================

    insert into public.short_rental_deposit_movements (

        deposit_id,

        reference,

        movement_type,

        amount,

        currency,

        payment_method,

        treasury_account_id,

        treasury_movement_id,

        accounting_entry_id,

        inspection_id,

        external_reference,

        reason,

        notes,

        occurred_at,

        created_by

    )

    values (

        v_deposit.id,

        v_deposit_reference,

        'release',

        p_amount,

        v_deposit.currency,

        v_payment_method::public.payment_method,

        v_treasury_account_id,

        v_treasury_movement_id,

        v_accounting_entry_id,

        null,

        v_external_reference,

        'Restitution de la caution',

        coalesce(
            p_notes,
            ''
        ),

        v_effective_released_at,

        auth.uid()

    )

    returning id
    into v_deposit_movement_id;


    -- ========================================================
    -- 20. RECALCUL CAUTION
    -- ========================================================

    v_new_released :=
        v_deposit.released_amount
        + p_amount;


    v_remaining :=
        greatest(
            v_deposit.collected_amount
            - v_new_released
            - v_deposit.withheld_amount,
            0
        );


    -- ========================================================
    -- 21. NOUVEAU STATUT
    -- ========================================================

    if v_remaining = 0 then

        if v_deposit.withheld_amount > 0 then

            -- Résolution mixte :
            -- une partie restituée,
            -- une partie retenue.

            v_new_status :=
                'partially_withheld';

        else

            v_new_status :=
                'released';

        end if;


        v_new_closed_at :=
            v_effective_released_at;

    else

        if v_deposit.withheld_amount > 0 then

            v_new_status :=
                'partially_withheld';

        else

            v_new_status :=
                'partially_released';

        end if;


        v_new_closed_at :=
            null;

    end if;


    -- ========================================================
    -- 22. MISE A JOUR DE LA CAUTION
    -- ========================================================

    update public.short_rental_deposits

    set
        released_amount =
            v_new_released,

        status =
            v_new_status,

        closed_at =
            v_new_closed_at,

        updated_at =
            now()

    where id =
        v_deposit.id;


    -- ========================================================
    -- 23. RESULTAT
    -- ========================================================

    return query

    select
        v_deposit.id,
        v_deposit_movement_id,
        v_treasury_movement_id,
        v_accounting_entry_id,
        v_deposit_reference,
        p_amount,
        v_deposit.currency,
        v_new_status,
        v_new_released,
        v_remaining,
        false;


end;

$function$;


-- ============================================================
-- 2. SECURITE RPC
-- ============================================================

revoke all
on function
public.release_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
from public;


revoke all
on function
public.release_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
from anon;


grant execute
on function
public.release_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
to authenticated;


-- ============================================================
-- 3. DOCUMENTATION
-- ============================================================

comment on function
public.release_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
is
'Restitue atomiquement tout ou partie d''une caution courte durée après séjour completed ou réservation cancelled. Génère l''écriture Dr 165100 / Cr trésorerie, le mouvement treasury withdrawal et le mouvement métier release. Vérifie le montant encore détenu, le solde de trésorerie et protège contre les doubles traitements grâce à la référence externe.';


commit;