-- ============================================================
-- AMIMMO NEXT-1C-S1
-- LONG-TERM RENTAL INVOICE INTEGRITY
-- ============================================================

-- ------------------------------------------------------------
-- Financial amounts
-- ------------------------------------------------------------

alter table public.invoices
add constraint invoices_amount_nonnegative_check
check (amount >= 0);

alter table public.invoices
add constraint invoices_paid_amount_nonnegative_check
check (paid_amount >= 0);

alter table public.invoices
add constraint invoices_paid_amount_not_above_amount_check
check (paid_amount <= amount);

-- ------------------------------------------------------------
-- Billing period consistency
-- Null periods remain allowed for invoice kinds that do not
-- require a rental period.
-- ------------------------------------------------------------

alter table public.invoices
add constraint invoices_period_dates_check
check (
    period_start is null
    or period_end is null
    or period_end >= period_start
);

-- ------------------------------------------------------------
-- Long-term rent invoice source
-- A rent invoice must always remain attached to its lease.
-- ------------------------------------------------------------

alter table public.invoices
add constraint invoices_rent_requires_lease_check
check (
    kind <> 'rent'
    or lease_id is not null
);

-- ------------------------------------------------------------
-- Preserve lease/invoice accounting history.
-- Lease deletion must never orphan a rent invoice.
-- ------------------------------------------------------------

alter table public.invoices
drop constraint invoices_lease_id_fkey;

alter table public.invoices
add constraint invoices_lease_id_fkey
foreign key (lease_id)
references public.leases(id)
on delete restrict;
