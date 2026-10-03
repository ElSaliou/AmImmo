-- ============================================================
-- AMIMMO NEXT-1B-S3A
-- PROTECT LEASE CONTRACT HISTORY
-- ============================================================

-- PROPERTY
alter table public.leases
drop constraint leases_property_id_fkey;

alter table public.leases
add constraint leases_property_id_fkey
foreign key (property_id)
references public.properties(id)
on delete restrict;


-- TENANT
alter table public.leases
drop constraint leases_tenant_id_fkey;

alter table public.leases
add constraint leases_tenant_id_fkey
foreign key (tenant_id)
references public.tenants(id)
on delete restrict;


-- OWNER
alter table public.leases
drop constraint leases_owner_id_fkey;

alter table public.leases
add constraint leases_owner_id_fkey
foreign key (owner_id)
references public.owners(id)
on delete restrict;
