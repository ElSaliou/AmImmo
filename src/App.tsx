import {
  lazy,
  Suspense,
} from "react";

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
import OwnerLayout from "@/layouts/OwnerLayout";

import RequireStaff from "@/components/auth/RequireStaff";
import RequireOwner from "@/components/auth/RequireOwner";

import NotFound from "./pages/NotFound";

// ============================================================
// AUTH
// ============================================================

const LoginPage = lazy(
  () =>
    import(
      "@/pages/auth/LoginPage"
    ),
);

// ============================================================
// PUBLIC
// ============================================================

const HomePage = lazy(
  () =>
    import(
      "@/pages/public/HomePage"
    ),
);

const ShortRentalPage = lazy(
  () =>
    import(
      "@/pages/public/ShortRentalPage"
    ),
);

const LongRentalPage = lazy(
  () =>
    import(
      "@/pages/public/LongRentalPage"
    ),
);

const SalePage = lazy(
  () =>
    import(
      "@/pages/public/SalePage"
    ),
);

const MapPage = lazy(
  () =>
    import(
      "@/pages/public/MapPage"
    ),
);

const PropertyDetailPage = lazy(
  () =>
    import(
      "@/pages/public/PropertyDetailPage"
    ),
);

/**
 * Page publique sécurisée de consultation
 * du paiement d'une réservation courte durée.
 *
 * Route :
 * /payment/:token
 *
 * Le token est vérifié exclusivement côté PostgreSQL via :
 * get_public_short_rental_payment_context(token)
 */
const ShortRentalPaymentPage = lazy(
  () =>
    import(
      "@/pages/public/ShortRentalPaymentPage"
    ),
);

const ContactPage = lazy(
  () =>
    import(
      "@/pages/public/ContactPage"
    ),
);

// ============================================================
// OWNER PORTAL
// ============================================================

const OwnerDashboardPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerDashboardPage"
    ),
);

const OwnerPropertiesPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerPropertiesPage"
    ),
);

const OwnerRevenuesPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerRevenuesPage"
    ),
);

const OwnerSettlementsPortalPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerSettlementsPage"
    ),
);

const OwnerStatementsPortalPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerStatementsPage"
    ),
);

const OwnerMandatesPortalPage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerMandatesPage"
    ),
);

const OwnerProfilePage = lazy(
  () =>
    import(
      "@/pages/owner/OwnerProfilePage"
    ),
);

// ============================================================
// ADMIN
// ============================================================

const DashboardPage = lazy(
  () =>
    import(
      "@/pages/admin/DashboardPage"
    ),
);

const BuildingsPage = lazy(
  () =>
    import(
      "@/pages/admin/BuildingsPage"
    ),
);

const UnitsPage = lazy(
  () =>
    import(
      "@/pages/admin/UnitsPage"
    ),
);

const PropertiesPage = lazy(
  () =>
    import(
      "@/pages/admin/PropertiesPage"
    ),
);

const OwnersPage = lazy(
  () =>
    import(
      "@/pages/admin/OwnersPage"
    ),
);

const OwnerDetailPage = lazy(
  () =>
    import(
      "@/pages/admin/OwnerDetailPage"
    ),
);

const MandatesPage = lazy(
  () =>
    import(
      "@/pages/admin/MandatesPage"
    ),
);

const TenantsPage = lazy(
  () =>
    import(
      "@/pages/admin/TenantsPage"
    ),
);

const ContractsPage = lazy(
  () =>
    import(
      "@/pages/admin/ContractsPage"
    ),
);

// ============================================================
// SHORT RENTAL
// ============================================================

const ShortRentalSettingsPage = lazy(
  () =>
    import(
      "@/pages/admin/ShortRentalSettingsPage"
    ),
);

const BookingsPage = lazy(
  () =>
    import(
      "@/pages/admin/BookingsPage"
    ),
);

const BookingDetailPage = lazy(
  () =>
    import(
      "@/pages/admin/BookingDetailPage"
    ),
);

const ShortRentalCalendarPage = lazy(
  () =>
    import(
      "@/pages/admin/ShortRentalCalendarPage"
    ),
);

const ShortRentalRatesPage = lazy(
  () =>
    import(
      "@/pages/admin/ShortRentalRatesPage"
    ),
);

// ============================================================
// SALES
// ============================================================

const SalesPage = lazy(
  () =>
    import(
      "@/pages/admin/SalesPage"
    ),
);

// ============================================================
// FINANCE
// ============================================================

const FinancePage = lazy(
  () =>
    import(
      "@/pages/admin/FinancePage"
    ),
);

const ExpensesPage = lazy(
  () =>
    import(
      "@/pages/admin/ExpensesPage"
    ),
);

const PayablesPage = lazy(
  () =>
    import(
      "@/pages/admin/PayablesPage"
    ),
);

const ReceivablesPage = lazy(
  () =>
    import(
      "@/pages/admin/ReceivablesPage"
    ),
);

const OwnerSettlementsPage = lazy(
  () =>
    import(
      "@/pages/admin/OwnerSettlementsPage"
    ),
);

const OwnerStatementsPage = lazy(
  () =>
    import(
      "@/pages/admin/OwnerStatementsPage"
    ),
);

const FinanceReportsPage = lazy(
  () =>
    import(
      "@/pages/admin/FinanceReportsPage"
    ),
);

/**
 * Fiche générique d'une facture.
 *
 * Route :
 * /admin/invoices/:invoiceId
 */
const InvoiceDetailPage = lazy(
  () =>
    import(
      "@/pages/admin/InvoiceDetailPage"
    ),
);

// ============================================================
// OTHER ADMIN MODULES
// ============================================================

const MaintenancePage = lazy(
  () =>
    import(
      "@/pages/admin/MaintenancePage"
    ),
);

const DocumentsPage = lazy(
  () =>
    import(
      "@/pages/admin/DocumentsPage"
    ),
);

const LeadsPage = lazy(
  () =>
    import(
      "@/pages/admin/LeadsPage"
    ),
);

const VisitsPage = lazy(
  () =>
    import(
      "@/pages/admin/VisitsPage"
    ),
);

const SettingsPage = lazy(
  () =>
    import(
      "@/pages/admin/SettingsPage"
    ),
);

// ============================================================
// QUERY CLIENT
// ============================================================

const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:
          30_000,

        refetchOnWindowFocus:
          false,

        retry: 1,
      },
    },
  });

// ============================================================
// LOADING
// ============================================================

const Loading =
  () => (
    <div className="flex min-h-[12rem] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

// ============================================================
// APP
// ============================================================

const App = () => {
  return (
    <QueryClientProvider
      client={
        queryClient
      }
    >
      <TooltipProvider>
        <Toaster />

        <Sonner />

        <BrowserRouter>
          <Suspense
            fallback={
              <Loading />
            }
          >
            <Routes>
              {/* ============================================= */}
              {/* AUTH                                          */}
              {/* ============================================= */}

              <Route
                path="/login"
                element={
                  <LoginPage />
                }
              />

              {/* ============================================= */}
              {/* PUBLIC                                        */}
              {/* ============================================= */}

              <Route
                element={
                  <PublicLayout />
                }
              >
                <Route
                  path="/"
                  element={
                    <HomePage />
                  }
                />

                <Route
                  path="/short-rental"
                  element={
                    <ShortRentalPage />
                  }
                />

                <Route
                  path="/long-rental"
                  element={
                    <LongRentalPage />
                  }
                />

                <Route
                  path="/sale"
                  element={
                    <SalePage />
                  }
                />

                <Route
                  path="/map"
                  element={
                    <MapPage />
                  }
                />

                <Route
                  path="/property/:id"
                  element={
                    <PropertyDetailPage />
                  }
                />

                {/* =========================================== */}
                {/* SHORT RENTAL - SECURE PAYMENT ACCESS        */}
                {/* =========================================== */}

                <Route
                  path="/payment/:token"
                  element={
                    <ShortRentalPaymentPage />
                  }
                />

                <Route
                  path="/contact"
                  element={
                    <ContactPage />
                  }
                />
              </Route>

              {/* ============================================= */}
              {/* OWNER PORTAL                                  */}
              {/* ============================================= */}

              <Route
                element={
                  <RequireOwner />
                }
              >
                <Route
                  path="/owner"
                  element={
                    <OwnerLayout />
                  }
                >
                  <Route
                    index
                    element={
                      <OwnerDashboardPage />
                    }
                  />

                  <Route
                    path="properties"
                    element={
                      <OwnerPropertiesPage />
                    }
                  />

                  <Route
                    path="revenues"
                    element={
                      <OwnerRevenuesPage />
                    }
                  />

                  <Route
                    path="settlements"
                    element={
                      <OwnerSettlementsPortalPage />
                    }
                  />

                  <Route
                    path="statements"
                    element={
                      <OwnerStatementsPortalPage />
                    }
                  />

                  <Route
                    path="mandates"
                    element={
                      <OwnerMandatesPortalPage />
                    }
                  />

                  <Route
                    path="profile"
                    element={
                      <OwnerProfilePage />
                    }
                  />
                </Route>
              </Route>

              {/* ============================================= */}
              {/* STAFF                                         */}
              {/* ============================================= */}

              <Route
                element={
                  <RequireStaff />
                }
              >
                <Route
                  path="/admin"
                  element={
                    <AdminLayout />
                  }
                >
                  <Route
                    index
                    element={
                      <DashboardPage />
                    }
                  />

                  <Route
                    path="buildings"
                    element={
                      <BuildingsPage />
                    }
                  />

                  <Route
                    path="units"
                    element={
                      <UnitsPage />
                    }
                  />

                  <Route
                    path="properties"
                    element={
                      <PropertiesPage />
                    }
                  />

                  <Route
                    path="owners"
                    element={
                      <OwnersPage />
                    }
                  />

                  <Route
                    path="owners/:id"
                    element={
                      <OwnerDetailPage />
                    }
                  />

                  <Route
                    path="mandates"
                    element={
                      <MandatesPage />
                    }
                  />

                  <Route
                    path="tenants"
                    element={
                      <TenantsPage />
                    }
                  />

                  <Route
                    path="contracts"
                    element={
                      <ContractsPage />
                    }
                  />

                  {/* ========================================= */}
                  {/* SHORT RENTAL                              */}
                  {/* ========================================= */}

                  <Route
                    path="short-rental"
                    element={
                      <ShortRentalSettingsPage />
                    }
                  />

                  <Route
                    path="bookings"
                    element={
                      <BookingsPage />
                    }
                  />

                  <Route
                    path="bookings/:bookingId"
                    element={
                      <BookingDetailPage />
                    }
                  />

                  <Route
                    path="short-rental/calendar"
                    element={
                      <ShortRentalCalendarPage />
                    }
                  />

                  <Route
                    path="short-rental/rates"
                    element={
                      <ShortRentalRatesPage />
                    }
                  />

                  {/* ========================================= */}
                  {/* SALES                                     */}
                  {/* ========================================= */}

                  <Route
                    path="sales"
                    element={
                      <SalesPage />
                    }
                  />

                  {/* ========================================= */}
                  {/* FINANCE                                   */}
                  {/* ========================================= */}

                  <Route
                    path="finance"
                    element={
                      <FinancePage />
                    }
                  />

                  {/*
                   * Fiche facture générique.
                   *
                   * Exemple :
                   * /admin/invoices/2e3facee-d59f-44bc-9e85-217c4c9d8ef8
                   */}
                  <Route
                    path="invoices/:invoiceId"
                    element={
                      <InvoiceDetailPage />
                    }
                  />

                  <Route
                    path="expenses"
                    element={
                      <ExpensesPage />
                    }
                  />

                  <Route
                    path="payables"
                    element={
                      <PayablesPage />
                    }
                  />

                  <Route
                    path="receivables"
                    element={
                      <ReceivablesPage />
                    }
                  />

                  <Route
                    path="owner-settlements"
                    element={
                      <OwnerSettlementsPage />
                    }
                  />

                  <Route
                    path="owner-statements"
                    element={
                      <OwnerStatementsPage />
                    }
                  />

                  <Route
                    path="reports/finance"
                    element={
                      <FinanceReportsPage />
                    }
                  />

                  {/* ========================================= */}
                  {/* OTHER ADMIN MODULES                       */}
                  {/* ========================================= */}

                  <Route
                    path="maintenance"
                    element={
                      <MaintenancePage />
                    }
                  />

                  <Route
                    path="documents"
                    element={
                      <DocumentsPage />
                    }
                  />

                  <Route
                    path="leads"
                    element={
                      <LeadsPage />
                    }
                  />

                  <Route
                    path="visits"
                    element={
                      <VisitsPage />
                    }
                  />

                  <Route
                    path="settings"
                    element={
                      <SettingsPage />
                    }
                  />
                </Route>
              </Route>

              {/* ============================================= */}
              {/* 404                                           */}
              {/* ============================================= */}

              <Route
                path="*"
                element={
                  <NotFound />
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;