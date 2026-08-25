import type { LeadStatus, ListingType, PropertyStatus, PropertyType, UnitKind, UnitStatus, VisitStatus } from "@/types/real-estate";

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Appartement",
  house: "Maison",
  villa: "Villa",
  studio: "Studio",
  office: "Bureau",
  shop: "Boutique / Local commercial",
  commercial: "Commercial",
  warehouse: "Entrepôt",
  parking: "Parking",
  land: "Terrain",
  other: "Autre",
};

export const unitKindLabels: Record<UnitKind, string> = {
  apartment: "Appartement",
  studio: "Studio",
  house: "Maison",
  villa: "Villa",
  office: "Bureau",
  shop: "Boutique",
  warehouse: "Entrepôt",
  parking: "Parking",
  land: "Terrain",
  other: "Autre",
};

export const unitStatusLabels: Record<UnitStatus, string> = {
  available: "Disponible",
  reserved: "Réservée",
  occupied: "Occupée",
  maintenance: "Maintenance",
  unavailable: "Indisponible",
};

export const unitStatusColor: Record<UnitStatus, string> = {
  available: "bg-success/15 text-success",
  reserved: "bg-warning/15 text-warning",
  occupied: "bg-info/15 text-info",
  maintenance: "bg-secondary/15 text-secondary",
  unavailable: "bg-muted text-muted-foreground",
};

export const listingTypeLabels: Record<ListingType, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  rented: "Loué",
  sold: "Vendu",
  reserved: "Réservé",
  maintenance: "Maintenance",
  unavailable: "Indisponible",
};

/** Pipeline CRM — ordre d'avancement des leads */
export const leadPipeline: { value: LeadStatus; label: string; color: string; dot: string }[] = [
  { value: "new", label: "Nouveau", color: "bg-info/15 text-info", dot: "bg-info" },
  { value: "contacted", label: "Contacté", color: "bg-warning/15 text-warning", dot: "bg-warning" },
  { value: "qualified", label: "Qualifié", color: "bg-secondary/15 text-secondary", dot: "bg-secondary" },
  { value: "visit_scheduled", label: "Visite planifiée", color: "bg-primary/15 text-primary", dot: "bg-primary" },
  { value: "visit_done", label: "Visite effectuée", color: "bg-primary/15 text-primary", dot: "bg-primary" },
  { value: "application_received", label: "Dossier reçu", color: "bg-secondary/15 text-secondary", dot: "bg-secondary" },
  { value: "negotiation", label: "Négociation", color: "bg-warning/15 text-warning", dot: "bg-warning" },
  { value: "converted", label: "Converti", color: "bg-success/15 text-success", dot: "bg-success" },
  { value: "lost", label: "Perdu", color: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
];

export const leadStatusLabel = (s: string) => leadPipeline.find((p) => p.value === s)?.label ?? s;
export const leadStatusColor = (s: string) => leadPipeline.find((p) => p.value === s)?.color ?? "bg-muted text-muted-foreground";

export const visitStatusConfig: Record<VisitStatus, { label: string; color: string }> = {
  requested: { label: "Demandée", color: "bg-info/15 text-info" },
  confirmed: { label: "Confirmée", color: "bg-success/15 text-success" },
  done: { label: "Effectuée", color: "bg-primary/15 text-primary" },
  postponed: { label: "Reportée", color: "bg-warning/15 text-warning" },
  cancelled: { label: "Annulée", color: "bg-destructive/15 text-destructive" },
  no_show: { label: "Absent", color: "bg-muted text-muted-foreground" },
};

export const leadSourceLabels: Record<string, string> = {
  website: "Site web",
  phone: "Téléphone",
  whatsapp: "WhatsApp",
  walk_in: "Agence",
  referral: "Recommandation",
  social: "Réseaux sociaux",
  other: "Autre",
};

/** Communes de Conakry (Guinée) */
export const conakryCommunes = ["Kaloum", "Dixinn", "Matam", "Ratoma", "Matoto", "Kagbelen", "Sonfonia", "Autre"];

export const formatMoney = (value: number | string | null | undefined, currency = "GNF") =>
  `${Number(value ?? 0).toLocaleString("fr-FR")} ${currency}`;

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
