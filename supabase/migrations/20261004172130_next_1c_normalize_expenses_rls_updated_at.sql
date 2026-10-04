-- ============================================================
-- AMIMMO NEXT-1C-S3
-- NORMALIZE EXPENSES RLS AND UPDATED_AT
-- ============================================================

-- ------------------------------------------------------------
-- Remove the redundant staff policy.
-- "Staff manage expenses" remains the canonical staff policy.
-- ------------------------------------------------------------

drop policy if exists "Staff expenses"
on public.expenses;

-- ------------------------------------------------------------
-- Keep updated_at synchronized on every UPDATE.
-- Reuse the existing generic trigger function already used
-- across the real-estate and accounting domain.
-- ------------------------------------------------------------

drop trigger if exists trg_expenses_updated_at
on public.expenses;

create trigger trg_expenses_updated_at
before update
on public.expenses
for each row
execute function public.set_updated_at();
