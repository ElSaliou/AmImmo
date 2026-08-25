
-- Internal trigger / event functions: not callable from the API at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_invoice_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_marketplace_listing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Auth helpers used by RLS policies: signed-in only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_owner_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner_of(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_tenant_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_of(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.my_owner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_owner_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.my_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_tenant_id() TO authenticated, service_role;
