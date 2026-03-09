
-- Fix WARN 1: set search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix WARN 2: restrict lead insert to require at least email and full_name
DROP POLICY "Anyone can create lead" ON public.leads;
CREATE POLICY "Anyone can create lead" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (full_name IS NOT NULL AND email IS NOT NULL AND full_name <> '' AND email <> '');
