-- ============================================================
-- AMIMMO NEXT-1C-S3 FIX
-- REMOVE REDUNDANT EXPENSES STAFF POLICY
-- ============================================================

drop policy if exists "Staff expenses"
on public.expenses;
