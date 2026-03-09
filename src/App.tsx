import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";
import NotFound from "./pages/NotFound";

// Public pages
const HomePage = lazy(() => import("@/pages/public/HomePage"));
const ShortRentalPage = lazy(() => import("@/pages/public/ShortRentalPage"));
const LongRentalPage = lazy(() => import("@/pages/public/LongRentalPage"));
const SalePage = lazy(() => import("@/pages/public/SalePage"));
const MapPage = lazy(() => import("@/pages/public/MapPage"));
const PropertyDetailPage = lazy(() => import("@/pages/public/PropertyDetailPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));

// Admin pages
const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const BuildingsPage = lazy(() => import("@/pages/admin/BuildingsPage"));
const UnitsPage = lazy(() => import("@/pages/admin/UnitsPage"));
const PropertiesPage = lazy(() => import("@/pages/admin/PropertiesPage"));
const OwnersPage = lazy(() => import("@/pages/admin/OwnersPage"));
const TenantsPage = lazy(() => import("@/pages/admin/TenantsPage"));
const ContractsPage = lazy(() => import("@/pages/admin/ContractsPage"));
const MaintenancePage = lazy(() => import("@/pages/admin/MaintenancePage"));
const DocumentsPage = lazy(() => import("@/pages/admin/DocumentsPage"));
const LeadsPage = lazy(() => import("@/pages/admin/LeadsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center h-32">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/short-rental" element={<ShortRentalPage />} />
              <Route path="/long-rental" element={<LongRentalPage />} />
              <Route path="/sale" element={<SalePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="buildings" element={<BuildingsPage />} />
              <Route path="units" element={<UnitsPage />} />
              <Route path="properties" element={<PropertiesPage />} />
              <Route path="owners" element={<OwnersPage />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
