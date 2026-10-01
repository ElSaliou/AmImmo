
-- Drop the restrictive ALL policy that blocks anonymous INSERT
DROP POLICY IF EXISTS "Staff can manage leads" ON public.leads;

-- Re-create staff policies for SELECT, UPDATE, DELETE only
CREATE POLICY "Staff can read leads"
ON public.leads FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can delete leads"
ON public.leads FOR DELETE
TO authenticated
USING (is_staff(auth.uid()));
