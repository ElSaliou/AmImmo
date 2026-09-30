-- ============================================================
-- AMIMMO
-- CAUTION COURTE DUREE - V1-B4
-- Retenue partielle ou totale après état des lieux de sortie
-- ============================================================

begin;


-- ============================================================
-- 1. COMPTE DE DETTE PROPRIETAIRE SPECIFIQUE AUX DEGRADATIONS
-- ============================================================
--
-- La caution encaissée est initialement portée au crédit
-- du compte :
--
--     165100 - Dépôts de garantie reçus - voyageurs
--
-- Lorsqu'une retenue définitive est justifiée après l'état
-- des lieux de sortie, le montant n'est plus dû au voyageur.
--
-- Il devient une dette envers le propriétaire :
--
--     Dr 165100
--     Cr 467110
--
-- Aucun mouvement de trésorerie n'est créé :
-- l'argent a déjà été encaissé lors de la collecte de caution.
-- ============================================================

do $$
begin

    if exists (
        select 1
        from public.accounting_accounts
        where code = '467110'
    ) then

        if not exists (
            select 1
            from public.accounting_accounts
            where code = '467110'
              and account_type = 'liability'
              and active = true
        ) then

            raise exception
                'Le compte 467110 existe déjà mais n''est pas un compte liability actif';

        end if;

    else

        insert into public.accounting_accounts (
            code,
            name,
            account_type,
            active
        )
        values (
            '467110',
            'Propriétaires - indemnités de dégradation à reverser',
            'liability',
            true
        );

    end if;

end
$$;


-- ============================================================
-- 2. SNAPSHOT DU PROPRIETAIRE BENEFICIAIRE
-- ============================================================
--
-- beneficiary_owner_id conserve l'identité du propriétaire
-- bénéficiaire AU MOMENT de la retenue.
--
-- Cela évite qu'un changement ultérieur de propriétaire du
-- bien ne modifie l'interprétation historique de l'opération.
--
-- ON DELETE RESTRICT :
-- un propriétaire référencé par une retenue historique ne
-- peut pas être supprimé physiquement.
-- ============================================================

alter table public.short_rental_deposit_movements
add column if not exists beneficiary_owner_id uuid;


do $$
begin

    if not exists (
        select 1
        from pg_constraint
        where conname =
            'short_rental_deposit_movements_beneficiary_owner_fkey'
          and conrelid =
            'public.short_rental_deposit_movements'::regclass
    ) then

        alter table public.short_rental_deposit_movements

        add constraint
            short_rental_deposit_movements_beneficiary_owner_fkey

        foreign key (
            beneficiary_owner_id
        )

        references public.owners(id)

        on delete restrict;

    end if;

end
$$;


create index if not exists
    idx_short_rental_deposit_movements_beneficiary_owner
on public.short_rental_deposit_movements (
    beneficiary_owner_id
)
where beneficiary_owner_id is not null;


comment on column
public.short_rental_deposit_movements.beneficiary_owner_id
is
'Propriétaire bénéficiaire d''une retenue de caution au moment de l''opération. Snapshot historique indépendant d''un changement ultérieur de propriétaire du bien.';


-- ============================================================
-- 3. RPC RETENUE DE CAUTION
-- ============================================================

create or replace function
public.withhold_short_rental_deposit(

    p_booking_id uuid,

    p_amount numeric,

    p_inspection_id uuid,

    p_reason text,

    p_withheld_at timestamptz default now(),

    p_reference text default null,

    p_notes text default ''

)
returns table (

    deposit_id uuid,

    movement_id uuid,

    accounting_entry_id uuid,

    movement_reference text,

    amount numeric,

    currency text,

    beneficiary_owner_id uuid,

    deposit_status text,

    withheld_amount numeric,

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

    v_inspection
        public.inspections%rowtype;

    v_existing_movement
        public.short_rental_deposit_movements%rowtype;

    v_owner_id uuid;

    v_deposit_account_id uuid;

    v_owner_damage_account_id uuid;

    v_journal_id uuid;

    v_accounting_entry_id uuid;

    v_deposit_movement_id uuid;

    v_accounting_reference text;

    v_movement_reference text;

    v_external_reference text;

    v_reason text;

    v_effective_withheld_at timestamptz;

    v_available_amount numeric := 0;

    v_new_withheld numeric := 0;

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


    if p_inspection_id is null then

        raise exception
            'État des lieux de sortie obligatoire';

    end if;


    if coalesce(
        p_amount,
        0
    ) <= 0
    then

        raise exception
            'Le montant retenu doit être supérieur à zéro';

    end if;


    v_reason :=
        nullif(
            trim(
                coalesce(
                    p_reason,
                    ''
                )
            ),
            ''
        );


    if v_reason is null then

        raise exception
            'Le motif de retenue est obligatoire';

    end if;


    v_effective_withheld_at :=
        coalesce(
            p_withheld_at,
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

    where b.id =
        p_booking_id

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

    where d.booking_id =
        v_booking.id

    for update;


    if not found then

        raise exception
            'Aucune caution métier n''est associée à cette réservation';

    end if;


    -- ========================================================
    -- 5. IDEMPOTENCE
    -- ========================================================
    --
    -- IMPORTANT :
    --
    -- Ce contrôle intervient AVANT la récupération du
    -- propriétaire actuel.
    --
    -- Une retenue déjà exécutée doit pouvoir être rejouée
    -- avec exactement la même référence même si le bien a
    -- changé de propriétaire depuis l'opération originale.
    --
    -- Le beneficiary_owner_id historique du mouvement existant
    -- est donc retourné tel quel.
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
                   <> 'withhold'

               or v_existing_movement.amount
                   <> p_amount

               or v_existing_movement.inspection_id
                   is distinct from
                   p_inspection_id

               or nullif(
                    trim(
                        coalesce(
                            v_existing_movement.reason,
                            ''
                        )
                    ),
                    ''
                  )
                  is distinct from
                  v_reason
            then

                raise exception
                    'La référence externe % existe déjà avec des caractéristiques différentes',
                    v_external_reference;

            end if;


            return query

            select
                v_deposit.id,

                v_existing_movement.id,

                v_existing_movement.accounting_entry_id,

                v_existing_movement.reference,

                v_existing_movement.amount,

                v_existing_movement.currency,

                v_existing_movement.beneficiary_owner_id,

                v_deposit.status,

                v_deposit.withheld_amount,

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
    -- 6. PROPRIETAIRE BENEFICIAIRE ACTUEL
    -- ========================================================
    --
    -- Cette lecture intervient uniquement pour une NOUVELLE
    -- retenue.
    --
    -- Le propriétaire trouvé ici sera historisé dans
    -- beneficiary_owner_id.
    -- ========================================================

    select p.owner_id
    into v_owner_id

    from public.properties p

    where p.id =
        v_booking.property_id

    for share;


    if v_owner_id is null then

        raise exception
            'Le bien ne possède aucun propriétaire bénéficiaire';

    end if;


    if not exists (
        select 1
        from public.owners o
        where o.id =
            v_owner_id
    ) then

        raise exception
            'Propriétaire bénéficiaire introuvable';

    end if;


    -- ========================================================
    -- 7. WORKFLOW DE LA RESERVATION
    -- ========================================================
    --
    -- Une retenue pour dégradation ne peut être décidée
    -- qu'après la fin effective du séjour.
    -- ========================================================

    if v_booking.status
       <> 'completed'::public.booking_status
    then

        raise exception
            'Une retenue de caution nécessite une réservation completed ; statut actuel : %',
            v_booking.status;

    end if;


    if v_booking.checked_out_at is null then

        raise exception
            'Une retenue de caution nécessite un check-out enregistré';

    end if;


    -- ========================================================
    -- 8. ETAT DES LIEUX DE SORTIE
    -- ========================================================
    --
    -- L'état des lieux :
    --
    --   - doit exister,
    --   - doit appartenir à la même réservation,
    --   - doit être de type checkout.
    -- ========================================================

    select i.*
    into v_inspection

    from public.inspections i

    where i.id =
        p_inspection_id

    for share;


    if not found then

        raise exception
            'État des lieux introuvable';

    end if;


    if v_inspection.booking_id
       is distinct from
       v_booking.id
    then

        raise exception
            'L''état des lieux ne correspond pas à cette réservation';

    end if;


    if v_inspection.kind
       <> 'checkout'::public.inspection_kind
    then

        raise exception
            'La retenue nécessite un état des lieux de sortie';

    end if;


    -- ========================================================
    -- 9. COHERENCE RESERVATION / CAUTION
    -- ========================================================

    if v_deposit.property_id
       is distinct from
       v_booking.property_id
    then

        raise exception
            'Incohérence de bien entre réservation et caution';

    end if;


    if v_deposit.currency
       is distinct from
       v_booking.currency
    then

        raise exception
            'Incohérence de devise entre réservation et caution';

    end if;


    if v_deposit.expected_amount
       is distinct from
       v_booking.deposit
    then

        raise exception
            'Incohérence entre la caution contractuelle et la caution métier';

    end if;


    -- ========================================================
    -- 10. MONTANT ENCORE DETENU
    -- ========================================================
    --
    -- Disponible =
    --
    --     collected_amount
    --     - released_amount
    --     - withheld_amount
    --
    -- Une même caution ne peut donc jamais être résolue
    -- au-delà de ce qui a réellement été encaissé.
    -- ========================================================

    if coalesce(
        v_deposit.collected_amount,
        0
    ) <= 0
    then

        raise exception
            'Aucune caution encaissée n''est disponible';

    end if;


    v_available_amount :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_deposit.withheld_amount,
            0
        );


    if v_available_amount <= 0 then

        raise exception
            'Aucun montant de caution n''est encore disponible';

    end if;


    if p_amount >
       v_available_amount
    then

        raise exception
            'Le montant retenu (%) dépasse la caution encore disponible (%)',
            p_amount,
            v_available_amount;

    end if;


    -- ========================================================
    -- 11. COMPTE COMPTABLE 165100
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
            'Compte 165100 introuvable ou inactif';

    end if;


    -- ========================================================
    -- 12. COMPTE COMPTABLE 467110
    -- ========================================================

    select aa.id
    into v_owner_damage_account_id

    from public.accounting_accounts aa

    where aa.code =
            '467110'

      and aa.account_type =
            'liability'

      and aa.active = true

    limit 1;


    if v_owner_damage_account_id is null then

        raise exception
            'Compte 467110 introuvable ou inactif';

    end if;


    -- ========================================================
    -- 13. JOURNAL COMPTABLE
    -- ========================================================
    --
    -- La retenue ne correspond pas à un mouvement bancaire
    -- ou de caisse.
    --
    -- Il s'agit d'un reclassement comptable :
    --
    --     165100 -> 467110
    --
    -- Journal OD.
    -- ========================================================

    select aj.id
    into v_journal_id

    from public.accounting_journals aj

    where aj.code =
            'OD'

      and aj.active = true

    limit 1;


    if v_journal_id is null then

        raise exception
            'Journal OD introuvable';

    end if;


    -- ========================================================
    -- 14. REFERENCES INTERNES
    -- ========================================================

    v_movement_reference :=
        'DEP-WH-'
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
        'EC-DEP-WH-'
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
    -- Retenue de caution :
    --
    --     Dr 165100
    --     Cr 467110
    --
    -- AUCUN mouvement de trésorerie.
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

        v_effective_withheld_at,

        'Retenue caution - '
            || v_booking.reference,

        'posted',

        v_deposit.currency,

        concat(
            'Retenue caution réservation ',
            v_booking.reference,

            ' / Propriétaire ',
            v_owner_id::text,

            ' / Motif : ',
            v_reason,

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

        'Retenue caution voyageur - '
            || v_booking.reference,

        p_amount,

        0

    );


    -- ========================================================
    -- 17. CREDIT 467110
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

        v_owner_damage_account_id,

        'Indemnité dégradation propriétaire - '
            || v_booking.reference,

        0,

        p_amount

    );


    -- ========================================================
    -- 18. MOUVEMENT METIER DE CAUTION
    -- ========================================================
    --
    -- Aucun payment_method :
    -- aucune entrée/sortie de trésorerie.
    --
    -- Aucun treasury_account_id.
    --
    -- Aucun treasury_movement_id.
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

        beneficiary_owner_id,

        external_reference,

        reason,

        notes,

        occurred_at,

        created_by

    )

    values (

        v_deposit.id,

        v_movement_reference,

        'withhold',

        p_amount,

        v_deposit.currency,

        null,

        null,

        null,

        v_accounting_entry_id,

        p_inspection_id,

        v_owner_id,

        v_external_reference,

        v_reason,

        coalesce(
            p_notes,
            ''
        ),

        v_effective_withheld_at,

        auth.uid()

    )

    returning id
    into v_deposit_movement_id;


    -- ========================================================
    -- 19. RECALCUL DE LA CAUTION
    -- ========================================================

    v_new_withheld :=
        v_deposit.withheld_amount
        + p_amount;


    v_remaining :=
        greatest(
            v_deposit.collected_amount
            - v_deposit.released_amount
            - v_new_withheld,
            0
        );


    -- ========================================================
    -- 20. CALCUL DU NOUVEAU STATUT
    -- ========================================================
    --
    -- CAS 1 :
    --
    -- Toute la caution encaissée est retenue,
    -- aucune restitution antérieure :
    --
    --     fully_withheld
    --
    -- CAS 2 :
    --
    -- Retenue partielle ou résolution mixte :
    --
    --     partially_withheld
    --
    -- Lorsque remaining = 0 :
    -- closed_at est renseigné.
    -- ========================================================

    if v_remaining = 0 then

        if v_deposit.released_amount = 0
           and v_new_withheld =
               v_deposit.collected_amount
        then

            v_new_status :=
                'fully_withheld';

        else

            v_new_status :=
                'partially_withheld';

        end if;


        v_new_closed_at :=
            v_effective_withheld_at;

    else

        v_new_status :=
            'partially_withheld';

        v_new_closed_at :=
            null;

    end if;


    -- ========================================================
    -- 21. MISE A JOUR DE LA CAUTION
    -- ========================================================

    update public.short_rental_deposits

    set
        withheld_amount =
            v_new_withheld,

        status =
            v_new_status,

        closed_at =
            v_new_closed_at,

        updated_at =
            now()

    where id =
        v_deposit.id;


    -- ========================================================
    -- 22. RESULTAT
    -- ========================================================

    return query

    select
        v_deposit.id,

        v_deposit_movement_id,

        v_accounting_entry_id,

        v_movement_reference,

        p_amount,

        v_deposit.currency,

        v_owner_id,

        v_new_status,

        v_new_withheld,

        v_remaining,

        false;


end;

$function$;


-- ============================================================
-- 4. SECURITE DE LA RPC
-- ============================================================

revoke all
on function
public.withhold_short_rental_deposit(
    uuid,
    numeric,
    uuid,
    text,
    timestamptz,
    text,
    text
)
from public;


revoke all
on function
public.withhold_short_rental_deposit(
    uuid,
    numeric,
    uuid,
    text,
    timestamptz,
    text,
    text
)
from anon;


grant execute
on function
public.withhold_short_rental_deposit(
    uuid,
    numeric,
    uuid,
    text,
    timestamptz,
    text,
    text
)
to authenticated;


-- ============================================================
-- 5. DOCUMENTATION
-- ============================================================

comment on function
public.withhold_short_rental_deposit(
    uuid,
    numeric,
    uuid,
    text,
    timestamptz,
    text,
    text
)
is
'Retient tout ou partie d''une caution courte durée après check-out et état des lieux checkout. Reclasse la dette voyageur 165100 vers la dette propriétaire 467110 sans mouvement de trésorerie. Motif et état des lieux obligatoires, bénéficiaire propriétaire historisé, opération idempotente par référence externe.';


commit;