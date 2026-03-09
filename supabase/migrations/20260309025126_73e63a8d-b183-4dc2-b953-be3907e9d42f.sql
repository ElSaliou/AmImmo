
-- Fix leads INSERT policy: change from RESTRICTIVE to PERMISSIVE so anonymous users can submit leads
DROP POLICY IF EXISTS "Anyone can create lead" ON public.leads;
CREATE POLICY "Anyone can create lead"
ON public.leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND email IS NOT NULL AND full_name <> '' AND email <> ''
);

-- Ensure the sync trigger is attached to properties table
DROP TRIGGER IF EXISTS trg_sync_marketplace ON public.properties;
CREATE TRIGGER trg_sync_marketplace
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_marketplace_listing();
