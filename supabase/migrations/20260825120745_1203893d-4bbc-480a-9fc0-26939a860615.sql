
-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============ ENUM EXTENSIONS (no usage in this migration) ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';

ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'unavailable';

-- ============ NEW ENUMS ============
CREATE TYPE public.owner_kind AS ENUM ('individual','company');
CREATE TYPE public.mandate_type AS ENUM ('management','rental','sale');
CREATE TYPE public.mandate_status AS ENUM ('draft','active','expired','terminated');
CREATE TYPE public.visit_status AS ENUM ('requested','confirmed','done','cancelled','postponed','no_show');
CREATE TYPE public.application_status AS ENUM ('draft','submitted','under_review','accepted','rejected','converted');
CREATE TYPE public.invoice_kind AS ENUM ('rent','charges','deposit','booking','penalty','service','commission','other');
CREATE TYPE public.invoice_status AS ENUM ('draft','issued','partially_paid','paid','overdue','cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash','transfer','mobile_money','card','cheque','other');
CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE public.mm_status AS ENUM ('initiated','pending','success','failed','refunded');
CREATE TYPE public.commission_kind AS ENUM ('rent_percentage','fixed','letting_fee','monthly_management','sale_percentage','file_fee');
CREATE TYPE public.payout_status AS ENUM ('draft','validated','paid','cancelled');
CREATE TYPE public.booking_status AS ENUM ('request','option','confirmed','in_progress','completed','cancelled');
CREATE TYPE public.sale_status AS ENUM ('prospect','visit','offer','negotiation','reservation','sold','closed','cancelled');
CREATE TYPE public.inspection_kind AS ENUM ('checkin','checkout');
CREATE TYPE public.unit_kind AS ENUM ('apartment','studio','office','shop','parking','other');
CREATE TYPE public.unit_status AS ENUM ('available','reserved','occupied','maintenance','unavailable');
CREATE TYPE public.account_kind AS ENUM ('asset','liability','equity','income','expense');
CREATE TYPE public.notification_channel AS ENUM ('internal','email','sms','whatsapp','push');
CREATE TYPE public.expense_status AS ENUM ('draft','approved','paid','rejected');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'GNF',
  locale text NOT NULL DEFAULT 'fr',
  email text,
  phone text,
  address text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND organization_id = _org)
$$;

CREATE POLICY "Members read their organization" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "Staff update their organization" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_member(id) AND public.is_staff(auth.uid()))
  WITH CHECK (public.is_org_member(id) AND public.is_staff(auth.uid()));
CREATE POLICY "Public can read organizations" ON public.organizations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Members read org membership" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "Staff manage org membership" ON public.organization_members
  FOR ALL TO authenticated USING (public.is_org_member(organization_id) AND public.is_staff(auth.uid()))
  WITH CHECK (public.is_org_member(organization_id) AND public.is_staff(auth.uid()));

-- ============ OWNERS / TENANTS ENRICHMENT ============
ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS kind public.owner_kind NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS rccm text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS mobile_money_provider text,
  ADD COLUMN IF NOT EXISTS mobile_money_number text;
CREATE UNIQUE INDEX IF NOT EXISTS owners_user_id_key ON public.owners(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS employer text,
  ADD COLUMN IF NOT EXISTS monthly_income numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact text;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_user_id_key ON public.tenants(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_owner_of(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.owners WHERE id = _owner_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_of(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.my_owner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.owners WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Owner reads own record" ON public.owners
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Tenant reads own record" ON public.tenants
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============ PROPERTIES / UNITS ENRICHMENT ============
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS internal_notes text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS properties_reference_key ON public.properties(reference) WHERE reference IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.property_reference_seq START 1000;
CREATE OR REPLACE FUNCTION public.set_property_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'BIEN-' || to_char(now(),'YY') || '-' || lpad(nextval('public.property_reference_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_property_reference ON public.properties;
CREATE TRIGGER trg_property_reference BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_property_reference();
UPDATE public.properties SET reference = 'BIEN-' || to_char(created_at,'YY') || '-' || lpad(nextval('public.property_reference_seq')::text, 5, '0') WHERE reference IS NULL;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS kind public.unit_kind NOT NULL DEFAULT 'apartment',
  ADD COLUMN IF NOT EXISTS status public.unit_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';

-- Owner read access on their portfolio
CREATE POLICY "Owner reads own properties" ON public.properties
  FOR SELECT TO authenticated USING (owner_id = public.my_owner_id());

-- ============ MANDATES ============
CREATE TABLE public.mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  mandate_type public.mandate_type NOT NULL DEFAULT 'management',
  exclusive boolean NOT NULL DEFAULT false,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_fixed numeric NOT NULL DEFAULT 0,
  conditions text NOT NULL DEFAULT '',
  document_url text,
  status public.mandate_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandates TO authenticated;
GRANT ALL ON public.mandates TO service_role;
ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage mandates" ON public.mandates FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own mandates" ON public.mandates FOR SELECT TO authenticated
  USING (public.is_owner_of(owner_id));
CREATE TRIGGER trg_mandates_updated_at BEFORE UPDATE ON public.mandates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.mandate_reference_seq START 100;
CREATE OR REPLACE FUNCTION public.set_mandate_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'MND-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.mandate_reference_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mandate_reference BEFORE INSERT ON public.mandates FOR EACH ROW EXECUTE FUNCTION public.set_mandate_reference();

CREATE TABLE public.mandate_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mandate_id, property_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandate_properties TO authenticated;
GRANT ALL ON public.mandate_properties TO service_role;
ALTER TABLE public.mandate_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage mandate properties" ON public.mandate_properties FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own mandate properties" ON public.mandate_properties FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mandates m WHERE m.id = mandate_id AND public.is_owner_of(m.owner_id)));

-- ============ LEADS CRM ENRICHMENT ============
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS search_criteria text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage lead activities" ON public.lead_activities FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ VISITS ============
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id uuid,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL DEFAULT '',
  visitor_email text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  status public.visit_status NOT NULL DEFAULT 'requested',
  outcome text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.visits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a visit" ON public.visits FOR INSERT TO anon, authenticated
  WITH CHECK (visitor_name <> '' AND (visitor_phone <> '' OR visitor_email <> ''));
CREATE POLICY "Staff read visits" ON public.visits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update visits" ON public.visits FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete visits" ON public.visits FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RENTAL APPLICATIONS ============
CREATE TABLE public.rental_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  id_number text,
  profession text,
  employer text,
  monthly_income numeric NOT NULL DEFAULT 0,
  guarantor_name text,
  guarantor_phone text,
  guarantor_income numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status public.application_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_applications TO authenticated;
GRANT ALL ON public.rental_applications TO service_role;
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage applications" ON public.rental_applications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.rental_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LEASES ENRICHMENT ============
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periodicity text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS due_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS contract_kind text NOT NULL DEFAULT 'long_term',
  ADD COLUMN IF NOT EXISTS document_url text;
CREATE UNIQUE INDEX IF NOT EXISTS leases_reference_key ON public.leases(reference) WHERE reference IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS public.lease_reference_seq START 100;
CREATE OR REPLACE FUNCTION public.set_lease_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'BAIL-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.lease_reference_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_lease_reference ON public.leases;
CREATE TRIGGER trg_lease_reference BEFORE INSERT ON public.leases FOR EACH ROW EXECUTE FUNCTION public.set_lease_reference();

CREATE POLICY "Owner reads own leases" ON public.leases FOR SELECT TO authenticated
  USING (public.is_owner_of(owner_id));
CREATE POLICY "Tenant reads own leases" ON public.leases FOR SELECT TO authenticated
  USING (public.is_tenant_of(tenant_id));

-- ============ INSPECTIONS ============
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES public.leases(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  kind public.inspection_kind NOT NULL DEFAULT 'checkin',
  performed_at timestamptz NOT NULL DEFAULT now(),
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  meters jsonb NOT NULL DEFAULT '{}'::jsonb,
  observations text NOT NULL DEFAULT '',
  photos text[] NOT NULL DEFAULT '{}',
  tenant_signature text,
  agent_signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage inspections" ON public.inspections FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Tenant reads own inspections" ON public.inspections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.is_tenant_of(l.tenant_id)));

-- ============ INVOICES / PAYMENTS ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  number text NOT NULL UNIQUE,
  kind public.invoice_kind NOT NULL DEFAULT 'rent',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  booking_id uuid,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,
  period_start date,
  period_end date,
  currency text NOT NULL DEFAULT 'GNF',
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Tenant reads own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_of(tenant_id));
CREATE POLICY "Owner reads own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_of(owner_id));
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := 'FAC-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  label text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_lines TO authenticated;
GRANT ALL ON public.invoice_lines TO service_role;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoice lines" ON public.invoice_lines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Tenant reads own invoice lines" ON public.invoice_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id IS NOT NULL AND public.is_tenant_of(i.tenant_id)));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reference text NOT NULL UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  status public.payment_status NOT NULL DEFAULT 'completed',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  paid_at timestamptz NOT NULL DEFAULT now(),
  is_refund boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Tenant reads own payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_of(tenant_id));
CREATE POLICY "Owner reads own payments" ON public.payments FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_of(owner_id));
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.payment_reference_seq START 1;
CREATE OR REPLACE FUNCTION public.set_payment_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'PAY-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.payment_reference_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payment_reference BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_payment_reference();

-- keep invoice paid_amount / status in sync
CREATE OR REPLACE FUNCTION public.recalc_invoice_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv uuid;
  total numeric;
  due numeric;
BEGIN
  inv := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF inv IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(CASE WHEN is_refund THEN -amount ELSE amount END), 0) INTO total
    FROM public.payments WHERE invoice_id = inv AND status = 'completed';
  SELECT amount INTO due FROM public.invoices WHERE id = inv;
  UPDATE public.invoices SET
    paid_amount = total,
    status = CASE
      WHEN status = 'cancelled' THEN status
      WHEN total >= due AND due > 0 THEN 'paid'::public.invoice_status
      WHEN total > 0 THEN 'partially_paid'::public.invoice_status
      WHEN due_date < current_date THEN 'overdue'::public.invoice_status
      WHEN status = 'draft' THEN 'draft'::public.invoice_status
      ELSE 'issued'::public.invoice_status
    END
  WHERE id = inv;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_status();

CREATE TABLE public.mobile_money_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_reference text,
  phone text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  status public.mm_status NOT NULL DEFAULT 'initiated',
  callback_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mobile_money_transactions TO authenticated;
GRANT ALL ON public.mobile_money_transactions TO service_role;
ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage mm transactions" ON public.mobile_money_transactions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mm_updated_at BEFORE UPDATE ON public.mobile_money_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMMISSIONS / EXPENSES / PAYOUTS ============
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  kind public.commission_kind NOT NULL DEFAULT 'monthly_management',
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  booking_id uuid,
  sale_id uuid,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  period_start date,
  period_end date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage commissions" ON public.commissions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own commissions" ON public.commissions FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_of(owner_id));

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  maintenance_request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  chargeable_to_owner boolean NOT NULL DEFAULT true,
  status public.expense_status NOT NULL DEFAULT 'draft',
  spent_at date NOT NULL DEFAULT current_date,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own expenses" ON public.expenses FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_of(owner_id));

CREATE TABLE public.owner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_collected numeric NOT NULL DEFAULT 0,
  commission_total numeric NOT NULL DEFAULT 0,
  expense_total numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  status public.payout_status NOT NULL DEFAULT 'draft',
  method public.payment_method NOT NULL DEFAULT 'transfer',
  paid_at timestamptz,
  receipt_url text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_payouts TO authenticated;
GRANT ALL ON public.owner_payouts TO service_role;
ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payouts" ON public.owner_payouts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own payouts" ON public.owner_payouts FOR SELECT TO authenticated
  USING (public.is_owner_of(owner_id));
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON public.owner_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.payout_reference_seq START 1;
CREATE OR REPLACE FUNCTION public.set_payout_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'REV-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.payout_reference_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payout_reference BEFORE INSERT ON public.owner_payouts FOR EACH ROW EXECUTE FUNCTION public.set_payout_reference();

CREATE TABLE public.owner_payout_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.owner_payouts(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  label text NOT NULL,
  line_kind text NOT NULL DEFAULT 'collection',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_payout_lines TO authenticated;
GRANT ALL ON public.owner_payout_lines TO service_role;
ALTER TABLE public.owner_payout_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payout lines" ON public.owner_payout_lines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own payout lines" ON public.owner_payout_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owner_payouts p WHERE p.id = payout_id AND public.is_owner_of(p.owner_id)));

-- ============ BOOKINGS (short stay) ============
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  reference text NOT NULL UNIQUE,
  guest_name text NOT NULL,
  guest_phone text NOT NULL DEFAULT '',
  guest_email text NOT NULL DEFAULT '',
  guests_count integer NOT NULL DEFAULT 1,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nightly_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  status public.booking_status NOT NULL DEFAULT 'request',
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_dates_valid CHECK (check_out > check_in),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    property_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status IN ('confirmed','in_progress'))
);
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a booking" ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (guest_name <> '' AND status = 'request');
CREATE POLICY "Staff read bookings" ON public.bookings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.booking_reference_seq START 1;
CREATE OR REPLACE FUNCTION public.set_booking_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'RES-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.booking_reference_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_booking_reference BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_reference();

-- ============ SALES ============
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reference text NOT NULL UNIQUE,
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  buyer_email text NOT NULL DEFAULT '',
  asking_price numeric NOT NULL DEFAULT 0,
  offered_price numeric NOT NULL DEFAULT 0,
  agreed_price numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  status public.sale_status NOT NULL DEFAULT 'prospect',
  closed_at date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sales" ON public.sales FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner reads own sales" ON public.sales FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_of(owner_id));
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.sale_reference_seq START 1;
CREATE OR REPLACE FUNCTION public.set_sale_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'VTE-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.sale_reference_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sale_reference BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_sale_reference();

-- ============ VENDORS / MAINTENANCE ============
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  phone text,
  email text,
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payer text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Tenant reads own maintenance" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_of(tenant_id));
CREATE POLICY "Tenant creates own maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_of(tenant_id));

-- ============ ACCOUNTING ============
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind public.account_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage accounts" ON public.accounts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT current_date,
  journal text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  source_table text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage journal entries" ON public.journal_entries FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT '',
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage journal lines" ON public.journal_lines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ NOTIFICATIONS / FAVORITES / AUDIT ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'internal',
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR user_id = auth.uid());

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff write audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- generic audit trigger for critical tables
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_table, entity_id, changes)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_audit_properties AFTER INSERT OR UPDATE OR DELETE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER trg_audit_leases AFTER INSERT OR UPDATE OR DELETE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER trg_audit_mandates AFTER INSERT OR UPDATE OR DELETE ON public.mandates FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER trg_audit_payouts AFTER INSERT OR UPDATE OR DELETE ON public.owner_payouts FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ============ MARKETPLACE LISTING ENRICHMENT ============
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ============ USEFUL INDEXES ============
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lease ON public.invoices(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_visits_property ON public.visits(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON public.bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner ON public.commissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON public.expenses(owner_id);
