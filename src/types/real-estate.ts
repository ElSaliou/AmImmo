// ─── Domain Types ───────────────────────────────────────────

export type OfferType = "short_rental" | "long_rental" | "sale";
export type PropertyStatus = "draft" | "published" | "archived" | "rented" | "sold";
export type ContractStatus = "active" | "expired" | "terminated" | "pending";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "closed";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  zip_code: string;
  country: string;
  total_units: number;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  building_id: string;
  label: string;
  floor: number;
  area_sqm: number;
  rooms: number;
  bathrooms: number;
  created_at: string;
}

export interface Property {
  id: string;
  unit_id?: string;
  title: string;
  description: string;
  offer_type: OfferType;
  status: PropertyStatus;
  price: number;
  currency: string;
  address: string;
  city: string;
  zip_code: string;
  country: string;
  area_sqm: number;
  rooms: number;
  bathrooms: number;
  images: string[];
  amenities: string[];
  is_featured: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  deposit: number;
  status: ContractStatus;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: MaintenanceStatus;
  created_at: string;
  resolved_at?: string;
}

export interface Document {
  id: string;
  entity_type: "property" | "contract" | "tenant" | "owner" | "building";
  entity_id: string;
  name: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

export interface Lead {
  id: string;
  property_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  message: string;
  source: "website" | "manual" | "referral";
  status: LeadStatus;
  created_at: string;
}
