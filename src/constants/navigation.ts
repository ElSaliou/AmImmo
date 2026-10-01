import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Home,
  Users,
  UserCheck,
  FileText,
  FileSignature,
  FileSpreadsheet,
  Wrench,
  FolderOpen,
  MessageSquare,
  Settings,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  BadgePercent,
  BadgeDollarSign,
  WalletCards,
  ReceiptText,
  Landmark,
  HandCoins,
  CircleDollarSign,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
  },

  {
    label: "Immeubles",
    path: "/admin/buildings",
    icon: Building2,
  },

  {
    label: "Unités",
    path: "/admin/units",
    icon: DoorOpen,
  },

  {
    label: "Biens",
    path: "/admin/properties",
    icon: Home,
  },

  {
    label: "Propriétaires",
    path: "/admin/owners",
    icon: Users,
  },

  {
    label: "Mandats",
    path: "/admin/mandates",
    icon: FileSignature,
  },

  {
    label: "Locataires",
    path: "/admin/tenants",
    icon: UserCheck,
  },

  {
    label: "Contrats",
    path: "/admin/contracts",
    icon: FileText,
  },

  // ==========================================================
  // LOCATION COURTE DUREE
  // ==========================================================

  {
    label: "Courte durée",
    path: "/admin/short-rental",
    icon: CalendarDays,
  },

  {
    label: "Réservations",
    path: "/admin/bookings",
    icon: CalendarCheck2,
  },

  {
    label: "Calendrier",
    path: "/admin/short-rental/calendar",
    icon: CalendarRange,
  },

  {
    label: "Tarifs",
    path: "/admin/short-rental/rates",
    icon: BadgePercent,
  },

  // ==========================================================
  // VENTES
  // ==========================================================

  {
    label: "Ventes",
    path: "/admin/sales",
    icon: BadgeDollarSign,
  },

  // ==========================================================
  // FINANCE
  // ==========================================================

  {
    label: "Finance",
    path: "/admin/finance",
    icon: WalletCards,
  },

  {
    label: "Dépenses",
    path: "/admin/expenses",
    icon: ReceiptText,
  },

  {
    label: "Dettes fournisseurs",
    path: "/admin/payables",
    icon: Landmark,
  },

  {
    label: "Créances locataires",
    path: "/admin/receivables",
    icon: HandCoins,
  },

  {
    label: "Reversements propriétaires",
    path: "/admin/owner-settlements",
    icon: CircleDollarSign,
  },

  {
    label: "Relevés propriétaires",
    path: "/admin/owner-statements",
    icon: FileSpreadsheet,
  },

  {
    label: "Rapports financiers",
    path: "/admin/reports/finance",
    icon: ChartNoAxesCombined,
  },

  // ==========================================================
  // GESTION OPERATIONNELLE
  // ==========================================================

  {
    label: "Maintenance",
    path: "/admin/maintenance",
    icon: Wrench,
  },

  {
    label: "Documents",
    path: "/admin/documents",
    icon: FolderOpen,
  },

  {
    label: "Leads",
    path: "/admin/leads",
    icon: MessageSquare,
  },

  {
    label: "Visites",
    path: "/admin/visits",
    icon: CalendarClock,
  },

  {
    label: "Paramètres",
    path: "/admin/settings",
    icon: Settings,
  },
];

export const publicNavItems = [
  {
    label: "Accueil",
    path: "/",
  },

  {
    label: "Location courte durée",
    path: "/short-rental",
  },

  {
    label: "Location longue durée",
    path: "/long-rental",
  },

  {
    label: "Vente",
    path: "/sale",
  },

  {
    label: "Carte",
    path: "/map",
  },

  {
    label: "Contact",
    path: "/contact",
  },
];