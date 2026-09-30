-- ============================================================
-- AMIMMO
-- Extension de public.inspections pour la location courte durée
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Lien vers une réservation courte durée
-- ------------------------------------------------------------

alter table public.inspections
add column if not exists booking_id uuid;


-- ------------------------------------------------------------
-- 2. Clé étrangère vers bookings
-- ------------------------------------------------------------

alter table public.inspections
drop constraint if exists inspections_booking_id_fkey;

alter table public.inspections
add constraint inspections_booking_id_fkey
foreign key (booking_id)
references public.bookings(id)
on delete cascade;


-- ------------------------------------------------------------
-- 3. Une inspection appartient soit à un bail,
--    soit à une réservation, jamais aux deux simultanément.
--
-- On autorise toutefois les deux valeurs NULL afin de ne pas
-- casser d'éventuels usages futurs liés uniquement au bien.
-- ------------------------------------------------------------

alter table public.inspections
drop constraint if exists inspections_single_stay_source_check;

alter table public.inspections
add constraint inspections_single_stay_source_check
check (
    lease_id is null
    or booking_id is null
);


-- ------------------------------------------------------------
-- 4. Index de recherche par réservation
-- ------------------------------------------------------------

create index if not exists idx_inspections_booking_id
on public.inspections (booking_id)
where booking_id is not null;


-- ------------------------------------------------------------
-- 5. Une seule inspection de chaque type par réservation
--
-- Exemples autorisés :
--   booking A + checkin
--   booking A + checkout
--
-- Doublons interdits :
--   booking A + checkin
--   booking A + checkin
-- ------------------------------------------------------------

create unique index if not exists uq_inspections_booking_kind
on public.inspections (booking_id, kind)
where booking_id is not null;


-- ------------------------------------------------------------
-- 6. Documentation
-- ------------------------------------------------------------

comment on column public.inspections.booking_id is
'Réservation courte durée associée à l''état des lieux. Exclusif avec lease_id.';


commit;