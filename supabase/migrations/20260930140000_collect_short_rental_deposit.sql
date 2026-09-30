-- ============================================================
-- AMIMMO
-- CAUTION COURTE DUREE - V1-B2
-- Encaissement atomique d'une caution
-- ============================================================

begin;


-- ============================================================
-- 1. IDEMPOTENCE DES REFERENCES EXTERNES
-- ============================================================
--
-- Une même référence externe ne peut être enregistrée deux
-- fois pour une même caution.
--
-- Exemple :
--
--   reçu caisse
--   référence bancaire
--   référence Mobile Money
--
-- Cela protège notamment contre les doubles clics et les
-- répétitions d'une requête réseau.
-- ============================================================

create unique index if not exists
    uq_short_rental_deposit_movements_external_reference
on public.short_rental_deposit_movements (
    deposit_id,
    external_reference
)
where external_reference is not null;


-- ============================================================
-- 2. RPC D'ENCAISSEMENT DE CAUTION
-- ============================================================

create or replace function
public.collect_short_rental_deposit(

    p_booking_id uuid,

    p_amount numeric,

    p_payment_method text,

    p_collected_at timestamptz default now(),

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

    collected_amount numeric,

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

    v_effective_collected_at timestamptz;

    v_new_collected numeric;

    v_remaining numeric;

    v_new_status text;

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
            'Le montant de caution doit être supérieur à zéro';

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
            'Moyen de paiement non pris en charge pour la caution : %',
            v_payment_method;

    end if;


    v_effective_collected_at :=
        coalesce(
            p_collected_at,
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
    -- 4. STATUT DE RESERVATION
    -- ========================================================
    --
    -- L'encaissement est possible uniquement lorsque la
    -- réservation est confirmée ou en cours.
    -- ========================================================

    if v_booking.status not in (
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
    ) then

        raise exception
            'Impossible d''encaisser une caution pour une réservation au statut %',
            v_booking.status;

    end if;


    -- ========================================================
    -- 5. VERROUILLER LA CAUTION
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
    -- 6. COHERENCE RESERVATION / CAUTION
    -- ========================================================

    if v_deposit.expected_amount
       is distinct from
       v_booking.deposit
    then

        raise exception
            'Incohérence entre la caution contractuelle et la caution métier';

    end if;


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
    -- 7. IDEMPOTENCE
    -- ========================================================
    --
    -- Si une référence externe est fournie et a déjà été
    -- traitée pour cette caution, on retourne le mouvement
    -- existant au lieu de créer un deuxième encaissement.
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
                   <> 'collection'

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
                v_deposit.collected_amount,
                greatest(
                    v_deposit.expected_amount
                    - v_deposit.collected_amount,
                    0
                ),
                true;


            return;

        end if;

    end if;


    -- ========================================================
    -- 8. ETAT DE LA CAUTION
    -- ========================================================

    if v_deposit.status in (
        'cancelled',
        'released',
        'fully_withheld'
    ) then

        raise exception
            'La caution ne peut plus recevoir d''encaissement. Statut actuel : %',
            v_deposit.status;

    end if;


    -- Une caution ayant commencé à être restituée ou retenue
    -- ne peut plus recevoir de nouvel encaissement.

    if coalesce(
        v_deposit.released_amount,
        0
    ) > 0
    or coalesce(
        v_deposit.withheld_amount,
        0
    ) > 0
    then

        raise exception
            'Impossible d''encaisser davantage une caution déjà en phase de résolution';

    end if;


    -- ========================================================
    -- 9. SOLDE ENCORE ENCAISSABLE
    -- ========================================================

    v_remaining :=
        greatest(
            v_deposit.expected_amount
            - v_deposit.collected_amount,
            0
        );


    if v_remaining <= 0 then

        raise exception
            'La caution est déjà intégralement encaissée';

    end if;


    if p_amount > v_remaining then

        raise exception
            'Le montant de caution (%) dépasse le montant restant à encaisser (%)',
            p_amount,
            v_remaining;

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
            'Aucun compte de trésorerie n''est disponible pour le moyen de paiement %',
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
    -- 11. COMPTE COMPTABLE 165100
    -- ========================================================

    select aa.id
    into v_deposit_account_id

    from public.accounting_accounts aa

    where aa.code = '165100'

      and aa.account_type =
            'liability'

      and aa.active = true

    limit 1;


    if v_deposit_account_id is null then

        raise exception
            'Compte comptable de caution 165100 introuvable ou inactif';

    end if;


    -- ========================================================
    -- 12. JOURNAL COMPTABLE
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
            'Journal comptable introuvable pour le moyen de paiement %',
            v_payment_method;

    end if;


    -- ========================================================
    -- 13. REFERENCES INTERNES
    -- ========================================================

    v_deposit_reference :=
        'DEP-COL-'
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
        'EC-DEP-COL-'
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
        'TRE-DEP-COL-'
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
    -- 14. ECRITURE COMPTABLE
    -- ========================================================
    --
    -- Encaissement de caution :
    --
    --     Dr Trésorerie
    --     Cr 165100
    --
    -- Aucun compte de revenu n'est utilisé.
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

        v_effective_collected_at,

        'Encaissement caution - '
            || v_booking.reference,

        'posted',

        v_deposit.currency,

        concat(
            'Caution réservation ',
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
    -- 15. LIGNE DEBIT TRESORERIE
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

        'Caution reçue - '
            || v_booking.reference,

        p_amount,

        0

    );


    -- ========================================================
    -- 16. LIGNE CREDIT 165100
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

        'Dette de caution voyageur - '
            || v_booking.reference,

        0,

        p_amount

    );


    -- ========================================================
    -- 17. MOUVEMENT DE TRESORERIE
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

        'deposit'::public.treasury_movement_type,

        null,

        v_treasury_account_id,

        p_amount,

        v_deposit.currency,

        v_effective_collected_at,

        'Encaissement caution - '
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
    -- 18. JOURNAL METIER DE CAUTION
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

        'collection',

        p_amount,

        v_deposit.currency,

        v_payment_method::public.payment_method,

        v_treasury_account_id,

        v_treasury_movement_id,

        v_accounting_entry_id,

        null,

        v_external_reference,

        'Encaissement de la caution',

        coalesce(
            p_notes,
            ''
        ),

        v_effective_collected_at,

        auth.uid()

    )

    returning id
    into v_deposit_movement_id;


    -- ========================================================
    -- 19. NOUVEAU SOLDE DE CAUTION
    -- ========================================================

    v_new_collected :=
        v_deposit.collected_amount
        + p_amount;


    if v_new_collected
       = v_deposit.expected_amount
    then

        v_new_status :=
            'held';

    else

        v_new_status :=
            'partially_collected';

    end if;


    -- ========================================================
    -- 20. MISE A JOUR DE LA CAUTION
    -- ========================================================

    update public.short_rental_deposits

    set
        collected_amount =
            v_new_collected,

        status =
            v_new_status,

        collected_at =
            coalesce(
                collected_at,
                v_effective_collected_at
            ),

        closed_at =
            null,

        updated_at =
            now()

    where id =
        v_deposit.id;


    v_remaining :=
        greatest(
            v_deposit.expected_amount
            - v_new_collected,
            0
        );


    -- ========================================================
    -- 21. RESULTAT
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
        v_new_collected,
        v_remaining,
        false;


end;

$function$;


-- ============================================================
-- 3. SECURITE RPC
-- ============================================================

revoke all
on function
public.collect_short_rental_deposit(
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
public.collect_short_rental_deposit(
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
public.collect_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
to authenticated;


-- ============================================================
-- 4. DOCUMENTATION
-- ============================================================

comment on function
public.collect_short_rental_deposit(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
)
is
'Encaisse atomiquement tout ou partie d''une caution courte durée. Génère l''écriture Dr trésorerie / Cr 165100, le mouvement de trésorerie et le mouvement métier de caution. La caution reste hors payments et hors facture de séjour. Une référence externe facultative fournit une protection d''idempotence par caution.';


commit;