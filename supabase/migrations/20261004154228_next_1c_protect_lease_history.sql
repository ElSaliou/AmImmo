-- ============================================================
-- AMIMMO NEXT-1C-S0
-- PROTECT LONG-TERM LEASE HISTORY
-- ============================================================

create or replace function public.guard_lease_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Only a draft/pending lease may be physically deleted.
    if old.status <> 'pending' then
        raise exception using
            errcode = '23514',
            message = 'Impossible de supprimer ce bail : seuls les baux en attente peuvent être supprimés.';
    end if;

    -- Even a pending lease must be preserved once invoicing exists.
    if exists (
        select 1
        from public.invoices i
        where i.lease_id = old.id
    ) then
        raise exception using
            errcode = '23514',
            message = 'Impossible de supprimer ce bail : une ou plusieurs factures lui sont déjà rattachées.';
    end if;

    return old;
end;
$$;

drop trigger if exists trg_guard_lease_delete
on public.leases;

create trigger trg_guard_lease_delete
before delete
on public.leases
for each row
execute function public.guard_lease_delete();

revoke execute on function public.guard_lease_delete()
from public, anon, authenticated;
