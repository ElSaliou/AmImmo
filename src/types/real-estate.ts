// Re-export domain types from Supabase generated types
import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

// Row types
export type Building = Tables<"buildings">;
export type Unit = Tables<"units">;
export type Owner = Tables<"owners">;
export type Tenant = Tables<"tenants">;
export type Property = Tables<"properties">;
export type PropertyImage = Tables<"property_images">;
export type MarketplaceListing = Tables<"marketplace_listings">;
export type Lease = Tables<"leases">;
export type Lead = Tables<"leads">;
export type LeadActivity = Tables<"lead_activities">;
export type Visit = Tables<"visits">;
export type Favorite = Tables<"favorites">;
export type Mandate = Tables<"mandates">;
export type MaintenanceRequest = Tables<"maintenance_requests">;
export type Document = Tables<"documents">;
export type Profile = Tables<"profiles">;
export type UserRole = Tables<"user_roles">;

// Insert types
export type BuildingInsert = TablesInsert<"buildings">;
export type UnitInsert = TablesInsert<"units">;
export type OwnerInsert = TablesInsert<"owners">;
export type TenantInsert = TablesInsert<"tenants">;
export type PropertyInsert = TablesInsert<"properties">;
export type PropertyImageInsert = TablesInsert<"property_images">;
export type LeaseInsert = TablesInsert<"leases">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadActivityInsert = TablesInsert<"lead_activities">;
export type VisitInsert = TablesInsert<"visits">;
export type MaintenanceRequestInsert = TablesInsert<"maintenance_requests">;
export type DocumentInsert = TablesInsert<"documents">;

// Update types
export type BuildingUpdate = TablesUpdate<"buildings">;
export type PropertyUpdate = TablesUpdate<"properties">;
export type UnitUpdate = TablesUpdate<"units">;
export type OwnerUpdate = TablesUpdate<"owners">;
export type TenantUpdate = TablesUpdate<"tenants">;
export type LeaseUpdate = TablesUpdate<"leases">;
export type LeadUpdate = TablesUpdate<"leads">;
export type VisitUpdate = TablesUpdate<"visits">;

// Enum types
export type ListingType = Enums<"listing_type">;
export type PropertyType = Enums<"property_type">;
export type PropertyStatus = Enums<"property_status">;
export type UnitKind = Enums<"unit_kind">;
export type UnitStatus = Enums<"unit_status">;
export type LeaseStatus = Enums<"lease_status">;
export type LeadStatus = Enums<"lead_status">;
export type VisitStatus = Enums<"visit_status">;
export type MaintenanceStatusEnum = Enums<"maintenance_status">;
export type MaintenancePriority = Enums<"maintenance_priority">;
export type AppRole = Enums<"app_role">;
