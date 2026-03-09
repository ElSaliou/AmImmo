
-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE public.listing_type AS ENUM ('short_rental', 'long_rental', 'sale');
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'villa', 'studio', 'commercial', 'land', 'other');
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'archived', 'rented', 'sold');
CREATE TYPE public.lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'manager');

-- ═══════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- USER ROLES
-- ═══════════════════════════════════════════

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- ═══════════════════════════════════════════
-- BUILDINGS
-- ═══════════════════════════════════════════

CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Maroc',
  total_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- UNITS
-- ═══════════════════════════════════════════

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 0,
  area_sqm NUMERIC(10,2) NOT NULL DEFAULT 0,
  rooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- OWNERS
-- ═══════════════════════════════════════════

CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TENANTS
-- ═══════════════════════════════════════════

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- PROPERTIES
-- ═══════════════════════════════════════════

CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  property_type public.property_type NOT NULL DEFAULT 'apartment',
  listing_type public.listing_type NOT NULL DEFAULT 'long_rental',
  status public.property_status NOT NULL DEFAULT 'draft',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  surface NUMERIC(10,2) NOT NULL DEFAULT 0,
  rooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  furnished BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  amenities TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_published ON public.properties (published, listing_type);
CREATE INDEX idx_properties_slug ON public.properties (slug);

-- ═══════════════════════════════════════════
-- PROPERTY IMAGES
-- ═══════════════════════════════════════════

CREATE TABLE public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- MARKETPLACE LISTINGS (public view / snapshot)
-- ═══════════════════════════════════════════

CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  listing_type public.listing_type NOT NULL,
  property_type public.property_type NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  surface NUMERIC(10,2) NOT NULL DEFAULT 0,
  rooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  furnished BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  amenities TEXT[] DEFAULT '{}',
  cover_image TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- LEASES
-- ═══════════════════════════════════════════

CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.lease_status NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- LEADS
-- ═══════════════════════════════════════════

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website',
  status public.lead_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- MAINTENANCE REQUESTS
-- ═══════════════════════════════════════════

CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority public.maintenance_priority NOT NULL DEFAULT 'medium',
  status public.maintenance_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- DOCUMENTS
-- ═══════════════════════════════════════════

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════
-- SECURITY DEFINER: has_role
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper: is any admin/agent/manager
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- ═══════════════════════════════════════════
-- AUTO SYNC marketplace_listings
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_marketplace_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true AND NEW.status = 'published' THEN
    INSERT INTO public.marketplace_listings (
      property_id, title, slug, description, price, currency,
      listing_type, property_type, city, district, surface,
      rooms, bathrooms, furnished, featured, latitude, longitude,
      amenities, published_at
    ) VALUES (
      NEW.id, NEW.title, NEW.slug, NEW.description, NEW.price, NEW.currency,
      NEW.listing_type, NEW.property_type, NEW.city, NEW.district, NEW.surface,
      NEW.rooms, NEW.bathrooms, NEW.furnished, NEW.featured, NEW.latitude, NEW.longitude,
      NEW.amenities, COALESCE(NEW.published_at, now())
    )
    ON CONFLICT (property_id) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      currency = EXCLUDED.currency,
      listing_type = EXCLUDED.listing_type,
      property_type = EXCLUDED.property_type,
      city = EXCLUDED.city,
      district = EXCLUDED.district,
      surface = EXCLUDED.surface,
      rooms = EXCLUDED.rooms,
      bathrooms = EXCLUDED.bathrooms,
      furnished = EXCLUDED.furnished,
      featured = EXCLUDED.featured,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      amenities = EXCLUDED.amenities;
  ELSE
    DELETE FROM public.marketplace_listings WHERE property_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_marketplace
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_marketplace_listing();

-- ═══════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- BUILDINGS (staff only)
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage buildings" ON public.buildings FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- UNITS (staff only)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage units" ON public.units FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- OWNERS (staff only)
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage owners" ON public.owners FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- TENANTS (staff only)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage tenants" ON public.tenants FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- PROPERTIES
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage properties" ON public.properties FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public can view published properties" ON public.properties FOR SELECT TO anon USING (published = true AND status = 'published');

-- PROPERTY IMAGES
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage images" ON public.property_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public can view images of published properties" ON public.property_images FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND published = true AND status = 'published')
);

-- MARKETPLACE LISTINGS (public read)
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view listings" ON public.marketplace_listings FOR SELECT TO anon, authenticated USING (true);

-- LEASES (staff only)
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage leases" ON public.leases FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- LEADS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage leads" ON public.leads FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Anyone can create lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

-- MAINTENANCE
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage maintenance" ON public.maintenance_requests FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- DOCUMENTS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage documents" ON public.documents FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ═══════════════════════════════════════════
-- STORAGE: property-images bucket
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'property-images');
CREATE POLICY "Staff can upload property images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update property images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete property images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
