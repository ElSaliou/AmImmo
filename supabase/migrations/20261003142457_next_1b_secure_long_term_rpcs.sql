-- ============================================================
-- AMIMMO NEXT-1B-S1
-- HARDEN LONG-TERM RENTAL RPC EXECUTE PRIVILEGES
-- ============================================================


-- ============================================================
-- 1. STAFF ENTRY POINTS
-- ============================================================

REVOKE EXECUTE ON FUNCTION
  public.generate_all_rent_invoices(date)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.generate_all_rent_invoices(date)
TO authenticated, service_role;


REVOKE EXECUTE ON FUNCTION
  public.generate_lease_rent_invoices(uuid, date)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.generate_lease_rent_invoices(uuid, date)
TO authenticated, service_role;


REVOKE EXECUTE ON FUNCTION
  public.record_tenant_payment(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.record_tenant_payment(
    uuid,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
TO authenticated, service_role;


REVOKE EXECUTE ON FUNCTION
  public.record_owner_settlement(
    uuid,
    numeric,
    uuid,
    timestamptz,
    text,
    text
  )
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.record_owner_settlement(
    uuid,
    numeric,
    uuid,
    timestamptz,
    text,
    text
  )
TO authenticated, service_role;


REVOKE EXECUTE ON FUNCTION
  public.refresh_overdue_rent_invoices()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.refresh_overdue_rent_invoices()
TO authenticated, service_role;


-- ============================================================
-- 2. INTERNAL HELPERS
-- No direct execution by anon/authenticated.
-- SECURITY DEFINER callers owned by postgres keep working.
-- ============================================================

REVOKE EXECUTE ON FUNCTION
  public.refresh_invoice_payment_status(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.refresh_invoice_payment_status(uuid)
TO service_role;


REVOKE EXECUTE ON FUNCTION
  public.resolve_management_commission(uuid, date, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.resolve_management_commission(uuid, date, uuid)
TO service_role;
