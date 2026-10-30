-- ============================================================
-- AMIMMO-PREST-P1
-- PRESTATIONS + QUOTE REQUESTS BASELINE
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'service_status'
  ) THEN
    CREATE TYPE public.service_status AS ENUM (
      'draft',
      'published',
      'archived'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'service_pricing_mode'
  ) THEN
    CREATE TYPE public.service_pricing_mode AS ENUM (
      'quote',
      'fixed',
      'starting_from',
      'free'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'quote_request_status'
  ) THEN
    CREATE TYPE public.quote_request_status AS ENUM (
      'new',
      'in_progress',
      'answered',
      'closed',
      'cancelled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT service_categories_pkey
    PRIMARY KEY (id),

  CONSTRAINT service_categories_slug_unique
    UNIQUE (slug),

  CONSTRAINT service_categories_display_order_non_negative
    CHECK (display_order >= 0),

  CONSTRAINT service_categories_name_not_blank
    CHECK (btrim(name) <> ''::text),

  CONSTRAINT service_categories_slug_not_blank
    CHECK (btrim(slug) <> ''::text)
);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  title text NOT NULL,
  slug text NOT NULL,
  short_description text,
  description text,
  cover_image_url text,

  pricing_mode public.service_pricing_mode
    NOT NULL
    DEFAULT 'quote'::public.service_pricing_mode,

  starting_price numeric,

  currency text
    NOT NULL
    DEFAULT 'GNF'::text,

  status public.service_status
    NOT NULL
    DEFAULT 'draft'::public.service_status,

  display_order integer
    NOT NULL
    DEFAULT 0,

  published_at timestamptz,

  created_at timestamptz
    NOT NULL
    DEFAULT now(),

  updated_at timestamptz
    NOT NULL
    DEFAULT now(),

  CONSTRAINT services_pkey
    PRIMARY KEY (id),

  CONSTRAINT services_slug_unique
    UNIQUE (slug),

  CONSTRAINT services_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES public.service_categories(id)
    ON DELETE SET NULL,

  CONSTRAINT services_currency_not_blank
    CHECK (btrim(currency) <> ''::text),

  CONSTRAINT services_display_order_non_negative
    CHECK (display_order >= 0),

  CONSTRAINT services_pricing_consistency
    CHECK (
      (
        pricing_mode = ANY (
          ARRAY[
            'quote'::public.service_pricing_mode,
            'free'::public.service_pricing_mode
          ]
        )
        AND starting_price IS NULL
      )
      OR
      (
        pricing_mode = ANY (
          ARRAY[
            'fixed'::public.service_pricing_mode,
            'starting_from'::public.service_pricing_mode
          ]
        )
        AND starting_price IS NOT NULL
      )
    ),

  CONSTRAINT services_publication_consistency
    CHECK (
      status <> 'published'::public.service_status
      OR published_at IS NOT NULL
    ),

  CONSTRAINT services_slug_not_blank
    CHECK (btrim(slug) <> ''::text),

  CONSTRAINT services_starting_price_non_negative
    CHECK (
      starting_price IS NULL
      OR starting_price >= 0::numeric
    ),

  CONSTRAINT services_title_not_blank
    CHECK (btrim(title) <> ''::text)
);

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid,
  property_id uuid,
  booking_id uuid,
  lead_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  subject text,
  message text NOT NULL,

  status public.quote_request_status
    NOT NULL
    DEFAULT 'new'::public.quote_request_status,

  assigned_to uuid,
  internal_notes text,
  agency_response text,
  responded_at timestamptz,
  closed_at timestamptz,

  created_at timestamptz
    NOT NULL
    DEFAULT now(),

  updated_at timestamptz
    NOT NULL
    DEFAULT now(),

  CONSTRAINT quote_requests_pkey
    PRIMARY KEY (id),

  CONSTRAINT quote_requests_service_id_fkey
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE SET NULL,

  CONSTRAINT quote_requests_property_id_fkey
    FOREIGN KEY (property_id)
    REFERENCES public.properties(id)
    ON DELETE SET NULL,

  CONSTRAINT quote_requests_booking_id_fkey
    FOREIGN KEY (booking_id)
    REFERENCES public.bookings(id)
    ON DELETE SET NULL,

  CONSTRAINT quote_requests_lead_id_fkey
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE SET NULL,

  CONSTRAINT quote_requests_answer_consistency
    CHECK (
      responded_at IS NULL
      OR agency_response IS NOT NULL
    ),

  CONSTRAINT quote_requests_closed_consistency
    CHECK (
      closed_at IS NULL
      OR status = ANY (
        ARRAY[
          'closed'::public.quote_request_status,
          'cancelled'::public.quote_request_status
        ]
      )
    ),

  CONSTRAINT quote_requests_contact_required
    CHECK (
      NULLIF(btrim(customer_email), ''::text) IS NOT NULL
      OR NULLIF(btrim(customer_phone), ''::text) IS NOT NULL
    ),

  CONSTRAINT quote_requests_customer_name_not_blank
    CHECK (btrim(customer_name) <> ''::text),

  CONSTRAINT quote_requests_message_not_blank
    CHECK (btrim(message) <> ''::text)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_active_order
  ON public.service_categories
  USING btree (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_services_category_id
  ON public.services
  USING btree (category_id);

CREATE INDEX IF NOT EXISTS idx_services_status
  ON public.services
  USING btree (status);

CREATE INDEX IF NOT EXISTS idx_services_public_listing
  ON public.services
  USING btree (display_order, published_at DESC)
  WHERE status = 'published'::public.service_status;

CREATE INDEX IF NOT EXISTS idx_quote_requests_service_id
  ON public.quote_requests
  USING btree (service_id);

CREATE INDEX IF NOT EXISTS idx_quote_requests_property_id
  ON public.quote_requests
  USING btree (property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_booking_id
  ON public.quote_requests
  USING btree (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_lead_id
  ON public.quote_requests
  USING btree (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_status
  ON public.quote_requests
  USING btree (status);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status_created
  ON public.quote_requests
  USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at
  ON public.quote_requests
  USING btree (created_at DESC);

ALTER TABLE public.service_categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.services
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quote_requests
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_categories'
      AND policyname = 'Public can view active service categories'
  ) THEN
    CREATE POLICY "Public can view active service categories"
      ON public.service_categories
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_categories'
      AND policyname = 'Staff can manage service categories'
  ) THEN
    CREATE POLICY "Staff can manage service categories"
      ON public.service_categories
      FOR ALL
      TO authenticated
      USING (is_staff(auth.uid()))
      WITH CHECK (is_staff(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'services'
      AND policyname = 'Public can view published services'
  ) THEN
    CREATE POLICY "Public can view published services"
      ON public.services
      FOR SELECT
      TO anon
      USING (
        status = 'published'::public.service_status
        AND published_at IS NOT NULL
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'services'
      AND policyname = 'Staff can manage services'
  ) THEN
    CREATE POLICY "Staff can manage services"
      ON public.services
      FOR ALL
      TO authenticated
      USING (is_staff(auth.uid()))
      WITH CHECK (is_staff(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_requests'
      AND policyname = 'Staff can manage quote requests'
  ) THEN
    CREATE POLICY "Staff can manage quote requests"
      ON public.quote_requests
      FOR ALL
      TO authenticated
      USING (is_staff(auth.uid()))
      WITH CHECK (is_staff(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'service_categories'
      AND t.tgname = 'trg_service_categories_updated_at'
  ) THEN
    CREATE TRIGGER trg_service_categories_updated_at
      BEFORE UPDATE
      ON public.service_categories
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'services'
      AND t.tgname = 'trg_services_updated_at'
  ) THEN
    CREATE TRIGGER trg_services_updated_at
      BEFORE UPDATE
      ON public.services
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'quote_requests'
      AND t.tgname = 'trg_quote_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_quote_requests_updated_at
      BEFORE UPDATE
      ON public.quote_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;