import {
  Building2,
  ExternalLink,
  Home,
  LogOut,
} from "lucide-react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================
// TENANT NAVIGATION
// ============================================================

const tenantNavItems = [
  {
    label: "Tableau de bord",
    path: "/tenant",
    icon: Home,
  },
];

// ============================================================
// TENANT LAYOUT
// ============================================================

const TenantLayout = () => {
  const { pathname } =
    useLocation();

  const navigate =
    useNavigate();

  const isActivePath = (
    path: string,
  ) => {
    if (path === "/tenant") {
      return pathname === "/tenant";
    }

    return (
      pathname === path ||
      pathname.startsWith(
        `${path}/`,
      )
    );
  };

  const handleLogout =
    async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "[TenantLayout] Erreur déconnexion :",
          error,
        );

        return;
      }

      navigate(
        "/login",
        {
          replace: true,
        },
      );
    };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ==================================================== */}
      {/* HEADER                                               */}
      {/* ==================================================== */}

      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/tenant"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">
                ImmoPlate
              </p>

              <p className="truncate text-xs text-muted-foreground">
                Espace locataire
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/">
                <ExternalLink className="mr-2 h-4 w-4" />
                Site public
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void handleLogout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* NAVIGATION                                           */}
      {/* ==================================================== */}

      <div className="border-b bg-background">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          {tenantNavItems.map(
            (item) => {
              const Icon =
                item.icon;

              const active =
                isActivePath(
                  item.path,
                );

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />

                  {item.label}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      {/* ==================================================== */}
      {/* CONTENT                                              */}
      {/* ==================================================== */}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default TenantLayout;