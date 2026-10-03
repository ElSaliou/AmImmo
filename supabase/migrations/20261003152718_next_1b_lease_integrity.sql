-- ============================================================
-- AMIMMO NEXT-1B-S2
-- LEASE LIFECYCLE INTEGRITY
-- ============================================================

alter table public.leases
add constraint leases_monthly_rent_positive_check
check (monthly_rent > 0);

alter table public.leases
add constraint leases_charges_non_negative_check
check (charges >= 0);

alter table public.leases
add constraint leases_deposit_non_negative_check
check (deposit >= 0);

alter table public.leases
add constraint leases_due_day_check
check (due_day between 1 and 31);

alter table public.leases
add constraint leases_dates_check
check (
  end_date is null
  or end_date >= start_date
);

alter table public.leases
add constraint leases_active_owner_required_check
check (
  status <> 'active'
  or owner_id is not null
);

create unique index uq_leases_one_active_per_property
on public.leases(property_id)
where status = 'active';
