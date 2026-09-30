-- ============================================================
-- AMIMMO
-- CAUTION COURTE DUREE - V1-A
-- Structure métier uniquement
-- ============================================================

begin;


-- ============================================================
-- 1. COMPTE COMPTABLE DE CAUTION
-- ============================================================
--
-- La caution est une dette à restituer au voyageur.
-- Elle ne constitue ni :
--   - un produit,
--   - un règlement de facture de séjour,
--   - une dette envers le propriétaire.
--
-- Encaissement futur :
--   Dr trésorerie
--   Cr 165100
-- ============================================================

do $$
begin

    if exists (
        select 1
        from public.accounting_accounts
        where code = '165100'
    ) then

        if not exists (
            select 1
            from public.accounting_accounts
            where code = '165100'
              and account_type = 'liability'
        ) then

            raise exception
                'Le compte 165100 existe déjà mais son account_type n''est pas liability';

        end if;

    else

        insert into public.accounting_accounts (
            code,
            name,
            account_type,
            active
        )
        values (
            '165100',
            'Dépôts de garantie reçus - voyageurs',
            'liability',
            true
        );

    end if;

end
$$;


-- ============================================================
-- 2. TABLE PRINCIPALE DE CAUTION
-- ============================================================

create table if not exists public.short_rental_deposits (

    id uuid primary key
        default gen_random_uuid(),

    organization_id uuid,

    booking_id uuid not null,

    property_id uuid not null,

    expected_amount numeric not null
        default 0,

    collected_amount numeric not null
        default 0,

    released_amount numeric not null
        default 0,

    withheld_amount numeric not null
        default 0,

    currency text not null
        default 'GNF',

    status text not null
        default 'expected',

    collected_at timestamptz,

    closed_at timestamptz,

    notes text not null
        default '',

    created_by uuid,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),


    constraint short_rental_deposits_booking_fkey
        foreign key (booking_id)
        references public.bookings(id)
        on delete restrict,

    constraint short_rental_deposits_property_fkey
        foreign key (property_id)
        references public.properties(id)
        on delete restrict,

    constraint short_rental_deposits_organization_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete set null,

    constraint short_rental_deposits_created_by_fkey
        foreign key (created_by)
        references auth.users(id)
        on delete set null,


    constraint short_rental_deposits_expected_amount_check
        check (
            expected_amount >= 0
        ),

    constraint short_rental_deposits_collected_amount_check
        check (
            collected_amount >= 0
            and collected_amount <= expected_amount
        ),

    constraint short_rental_deposits_released_amount_check
        check (
            released_amount >= 0
        ),

    constraint short_rental_deposits_withheld_amount_check
        check (
            withheld_amount >= 0
        ),

    constraint short_rental_deposits_resolution_check
        check (
            released_amount
            + withheld_amount
            <= collected_amount
        ),

    constraint short_rental_deposits_status_check
        check (
            status in (
                'expected',
                'partially_collected',
                'held',
                'partially_released',
                'partially_withheld',
                'released',
                'fully_withheld',
                'cancelled'
            )
        )
);


-- ============================================================
-- 3. UNE SEULE CAUTION PAR RESERVATION
-- ============================================================

create unique index if not exists
    uq_short_rental_deposits_booking
on public.short_rental_deposits (
    booking_id
);


-- ============================================================
-- 4. INDEXES
-- ============================================================

create index if not exists
    idx_short_rental_deposits_property
on public.short_rental_deposits (
    property_id
);


create index if not exists
    idx_short_rental_deposits_status
on public.short_rental_deposits (
    status
);


create index if not exists
    idx_short_rental_deposits_created_at
on public.short_rental_deposits (
    created_at desc
);


-- ============================================================
-- 5. HISTORIQUE DES MOUVEMENTS DE CAUTION
-- ============================================================
--
-- Cette table constitue le journal métier et financier
-- de la caution.
--
-- Les mouvements possibles en V1 sont :
--
--   collection
--       Encaissement réel de la caution.
--
--   release
--       Restitution réelle de tout ou partie de la caution.
--
--   withhold
--       Retenue définitive et justifiée sur la caution.
--
-- Aucun UPDATE ou DELETE direct ne doit être réalisé depuis
-- le client.
-- ============================================================

create table if not exists public.short_rental_deposit_movements (

    id uuid primary key
        default gen_random_uuid(),

    deposit_id uuid not null,

    reference text not null,

    movement_type text not null,

    amount numeric not null,

    currency text not null
        default 'GNF',

    payment_method public.payment_method,

    treasury_account_id uuid,

    treasury_movement_id uuid,

    accounting_entry_id uuid,

    inspection_id uuid,

    external_reference text,

    reason text,

    notes text not null
        default '',

    occurred_at timestamptz not null
        default now(),

    created_by uuid,

    created_at timestamptz not null
        default now(),


    constraint short_rental_deposit_movements_deposit_fkey
        foreign key (deposit_id)
        references public.short_rental_deposits(id)
        on delete restrict,

    constraint short_rental_deposit_movements_treasury_account_fkey
        foreign key (treasury_account_id)
        references public.treasury_accounts(id)
        on delete restrict,

    constraint short_rental_deposit_movements_treasury_movement_fkey
        foreign key (treasury_movement_id)
        references public.treasury_movements(id)
        on delete restrict,

    constraint short_rental_deposit_movements_accounting_entry_fkey
        foreign key (accounting_entry_id)
        references public.accounting_entries(id)
        on delete restrict,

    constraint short_rental_deposit_movements_inspection_fkey
        foreign key (inspection_id)
        references public.inspections(id)
        on delete set null,

    constraint short_rental_deposit_movements_amount_check
        check (
            amount > 0
        ),

    constraint short_rental_deposit_movements_type_check
        check (
            movement_type in (
                'collection',
                'release',
                'withhold'
            )
        )
);


-- ============================================================
-- 6. REFERENCES / INDEXES MOUVEMENTS
-- ============================================================

create unique index if not exists
    uq_short_rental_deposit_movements_reference
on public.short_rental_deposit_movements (
    reference
);


create index if not exists
    idx_short_rental_deposit_movements_deposit
on public.short_rental_deposit_movements (
    deposit_id,
    occurred_at
);


create index if not exists
    idx_short_rental_deposit_movements_accounting
on public.short_rental_deposit_movements (
    accounting_entry_id
)
where accounting_entry_id is not null;


create index if not exists
    idx_short_rental_deposit_movements_treasury
on public.short_rental_deposit_movements (
    treasury_movement_id
)
where treasury_movement_id is not null;


create index if not exists
    idx_short_rental_deposit_movements_inspection
on public.short_rental_deposit_movements (
    inspection_id
)
where inspection_id is not null;


-- ============================================================
-- 7. UPDATED_AT
-- ============================================================

drop trigger if exists
    trg_short_rental_deposits_updated_at
on public.short_rental_deposits;

create trigger
    trg_short_rental_deposits_updated_at
before update
on public.short_rental_deposits
for each row
execute function public.set_updated_at();


-- ============================================================
-- 8. RLS
-- ============================================================
--
-- Le client authentifié ne peut modifier directement ni :
--
--   short_rental_deposits
--   short_rental_deposit_movements
--
-- Les mutations seront exclusivement effectuées par les RPC
-- métier SECURITY DEFINER prévues en V1-B.
--
-- Les utilisateurs staff disposent uniquement d'un accès
-- SELECT direct.
--
-- Le journal short_rental_deposit_movements reste ainsi
-- immuable depuis le client.
-- ============================================================

alter table public.short_rental_deposits
enable row level security;

alter table public.short_rental_deposit_movements
enable row level security;


-- ------------------------------------------------------------
-- 8.1 CAUTIONS
-- Lecture staff uniquement
-- ------------------------------------------------------------

drop policy if exists
    "Staff manage short rental deposits"
on public.short_rental_deposits;

drop policy if exists
    "Staff read short rental deposits"
on public.short_rental_deposits;

create policy
    "Staff read short rental deposits"
on public.short_rental_deposits
for select
to authenticated
using (
    public.is_staff(auth.uid())
);


-- ------------------------------------------------------------
-- 8.2 MOUVEMENTS DE CAUTION
-- Lecture staff uniquement
-- ------------------------------------------------------------

drop policy if exists
    "Staff manage short rental deposit movements"
on public.short_rental_deposit_movements;

drop policy if exists
    "Staff read short rental deposit movements"
on public.short_rental_deposit_movements;

create policy
    "Staff read short rental deposit movements"
on public.short_rental_deposit_movements
for select
to authenticated
using (
    public.is_staff(auth.uid())
);


-- ============================================================
-- 9. DOCUMENTATION
-- ============================================================

comment on table public.short_rental_deposits is
'Cycle métier des cautions de location courte durée. La caution reste indépendante de la facture du séjour.';


comment on column public.short_rental_deposits.organization_id is
'Organisation propriétaire du contexte métier de la caution.';


comment on column public.short_rental_deposits.booking_id is
'Réservation courte durée à laquelle appartient la caution. Une seule caution est autorisée par réservation.';


comment on column public.short_rental_deposits.property_id is
'Bien immobilier concerné par la caution.';


comment on column public.short_rental_deposits.expected_amount is
'Montant contractuel de caution provenant du snapshot bookings.deposit.';


comment on column public.short_rental_deposits.collected_amount is
'Montant réellement encaissé au titre de la caution.';


comment on column public.short_rental_deposits.released_amount is
'Montant de caution effectivement restitué au voyageur.';


comment on column public.short_rental_deposits.withheld_amount is
'Montant définitivement retenu après justification.';


comment on column public.short_rental_deposits.status is
'État métier synthétique de la caution : expected, partially_collected, held, partially_released, partially_withheld, released, fully_withheld ou cancelled.';


comment on table public.short_rental_deposit_movements is
'Journal immuable des opérations financières et métier affectant une caution courte durée. Les mutations doivent être réalisées exclusivement par les RPC métier.';


comment on column public.short_rental_deposit_movements.movement_type is
'Nature du mouvement : collection, release ou withhold.';


comment on column public.short_rental_deposit_movements.payment_method is
'Moyen utilisé pour l''encaissement ou la restitution lorsqu''un flux de trésorerie existe.';


comment on column public.short_rental_deposit_movements.treasury_account_id is
'Compte de trésorerie utilisé pour l''opération lorsque celle-ci implique une entrée ou sortie d''argent.';


comment on column public.short_rental_deposit_movements.treasury_movement_id is
'Mouvement de trésorerie généré par l''opération.';


comment on column public.short_rental_deposit_movements.accounting_entry_id is
'Écriture comptable générée par l''opération.';


comment on column public.short_rental_deposit_movements.inspection_id is
'État des lieux pouvant justifier notamment une retenue de caution.';


comment on column public.short_rental_deposit_movements.reason is
'Motif métier de l''opération, notamment obligatoire pour une future retenue de caution.';


commit;