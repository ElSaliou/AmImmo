import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Home,
  Users,
  UserCheck,
  FileText,
  FileSignature,
  Wrench,
  FolderOpen,
  MessageSquare,
  Settings,
  CalendarClock,
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
