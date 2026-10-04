-- ============================================================
-- AMIMMO NEXT-1C-S2
-- REMOVE DUPLICATE PAYMENTS INDEX
-- ============================================================

drop index if exists public.idx_payments_invoice;
