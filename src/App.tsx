import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";

import RequireStaff from "@/components/auth/RequireStaff";

import NotFound from "./pages/NotFound";

// ============================================================
// AUTH
// ============================================================

const LoginPage = lazy(
  () => import("@/pages/auth/LoginPage"),
);

// ============================================================
// PUBLIC
// ============================================================

const HomePage = lazy(
  () => import("@/pages/public/HomePage"),
);

const ShortRentalPage = lazy(
  () => import("@/pages/public/ShortRentalPage"),
);

const LongRentalPage = lazy(
  () => import("@/pages/public/LongRentalPage"),
);

const SalePage = lazy(
  () => import("@/pages/public/SalePage"),
);

const MapPage = lazy(
  () => import("@/pages/public/MapPage"),
);

const PropertyDetailPage = lazy(
  () =>
    import(
      "@/pages/public/PropertyDetailPage"
    ),
);

const ContactPage = lazy(
  () => import("@/pages/public/ContactPage"),
);

// ============================================================
// ADMIN
// ============================================================

const DashboardPage = lazy(
  () => import("@/pages/admin/DashboardPage"),
);

const BuildingsPage = lazy(
  () => import("@/pages/admin/BuildingsPage"),
);

const UnitsPage = lazy(
  () => import("@/pages/admin/UnitsPage"),
);

const PropertiesPage = lazy(
  () => import("@/pages/admin/PropertiesPage"),
);

const OwnersPage = lazy(
  () => import("@/pages/admin/OwnersPage"),
);

const OwnerDetailPage = lazy(
  () =>
    import("@/pages/admin/OwnerDetailPage"),
);

const MandatesPage = lazy(
  () => import("@/pages/admin/MandatesPage"),
);

const TenantsPage = lazy(
  () => import("@/pages/admin/TenantsPage"),
);

const ContractsPage = lazy(
  () => import("@/pages/admin/ContractsPage"),
);

const MaintenancePage = lazy(
  () =>
    import("@/pages/admin/MaintenancePage"),
);

const DocumentsPage = lazy(
  () => import("@/pages/admin/DocumentsPage"),
);

const LeadsPage = lazy(
  () => import("@/pages/admin/LeadsPage"),
);

const VisitsPage = lazy(
  () => import("@/pages/admin/VisitsPage"),
);

const SettingsPage = lazy(
  () => import("@/pages/admin/SettingsPage"),
);

// ============================================================
// QUERY CLIENT
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ============================================================
// LOADING
// ============================================================

const Loading = () => (
  <div className="flex min-h-[12rem] items-center justify-center">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// ============================================================
// APP
// ============================================================

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* ========================================== */}
              {/* AUTH                                       */}
              {/* ========================================== */}

              <Route
                path="/login"
                element={<LoginPage />}
              />

              {/* ========================================== */}
              {/* SITE PUBLIC                                */}
              {/* ========================================== */}

              <Route element={<PublicLayout />}>
                <Route
                  path="/"
                  element={<HomePage />}
                />

                <Route
                  path="/short-rental"
                  element={<ShortRentalPage />}
                />

                <Route
                  path="/long-rental"
                  element={<LongRentalPage />}
                />

                <Route
                  path="/sale"
                  element={<SalePage />}
                />

                <Route
                  path="/map"
                  element={<MapPage />}
                />

                <Route
                  path="/property/:id"
                  element={<PropertyDetailPage />}
                />

                <Route
                  path="/contact"
                  element={<ContactPage />}
                />
              </Route>

              {/* ========================================== */}
              {/* PROTECTION STAFF                           */}
              {/* ========================================== */}

              <Route element={<RequireStaff />}>
                {/* ====================================== */}
                {/* BACK-OFFICE                            */}
                {/* ====================================== */}

                <Route
                  path="/admin"
                  element={<AdminLayout />}
                >
                  <Route
                    index
                    element={<DashboardPage />}
                  />

                  <Route
                    path="buildings"
                    element={<BuildingsPage />}
                  />

                  <Route
                    path="units"
                    element={<UnitsPage />}
                  />

                  <Route
                    path="properties"
                    element={<PropertiesPage />}
                  />

                  <Route
                    path="owners"
                    element={<OwnersPage />}
                  />

                  <Route
                    path="owners/:id"
                    element={<OwnerDetailPage />}
                  />

                  <Route
                    path="mandates"
                    element={<MandatesPage />}
                  />

                  <Route
                    path="tenants"
                    element={<TenantsPage />}
                  />

                  <Route
                    path="contracts"
                    element={<ContractsPage />}
                  />

                  <Route
                    path="maintenance"
                    element={<MaintenancePage />}
                  />

                  <Route
                    path="documents"
                    element={<DocumentsPage />}
                  />

                  <Route
                    path="leads"
                    element={<LeadsPage />}
                  />

                  <Route
                    path="visits"
                    element={<VisitsPage />}
                  />

                  <Route
                    path="settings"
                    element={<SettingsPage />}
                  />
                </Route>
              </Route>

              {/* ========================================== */}
              {/* 404                                        */}
              {/* ========================================== */}

              <Route
                path="*"
                element={<NotFound />}
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
