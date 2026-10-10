import {
  Building2,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  Button,
} from "@/components/ui/button";

import {
  cn,
} from "@/lib/utils";

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
  const {
    pathname,
  } = useLocation();

  const navigate =
    useNavigate();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  // ==========================================================
  // ACTIVE PATH
  // ==========================================================

  const isActivePath = (
    path: string,
  ) => {
    if (
      path === "/tenant"
    ) {
      return (
        pathname === "/tenant"
      );
    }

    return (
      pathname === path ||
      pathname.startsWith(
        `${path}/`,
      )
    );
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout =
    async () => {
      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "[TenantLayout] Erreur déconnexion :",
          error,
        );

        return;
      }

      setMobileOpen(false);

      navigate(
        "/login",
        {
          replace: true,
        },
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-background">
      {/* ==================================================== */}
      {/* TOP ACCENT                                           */}
      {/* ==================================================== */}

      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

      {/* ==================================================== */}
      {/* HEADER                                               */}
      {/* ==================================================== */}

      <header className="sticky top-0 z-50 border-b bg-card/95 shadow-[var(--shadow-sm)] backdrop-blur-xl">
        <div className="container flex h-[72px] items-center justify-between gap-4">
          {/* ================================================= */}
          {/* BRAND                                             */}
          {/* ================================================= */}

          <Link
            to="/tenant"
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="gradient-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/20">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>

            <div className="min-w-0">
              <span className="block truncate font-display text-xl font-bold text-foreground">
                ImmoPlate
              </span>

              <span className="block truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Espace locataire
              </span>
            </div>
          </Link>

          {/* ================================================= */}
          {/* DESKTOP NAVIGATION                                */}
          {/* ================================================= */}

          <nav className="hidden items-center gap-1 lg:flex">
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
                      "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",

                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
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

          {/* ================================================= */}
          {/* DESKTOP ACTIONS                                   */}
          {/* ================================================= */}

          <div className="hidden items-center gap-2 lg:flex">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <Link to="/">
                <ExternalLink className="h-4 w-4" />

                Site public
              </Link>
            </Button>

            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                void handleLogout();
              }}
            >
              <LogOut className="h-4 w-4" />

              Déconnexion
            </Button>
          </div>

          {/* ================================================= */}
          {/* MOBILE TOGGLE                                     */}
          {/* ================================================= */}

          <button
            type="button"
            aria-label={
              mobileOpen
                ? "Fermer le menu"
                : "Ouvrir le menu"
            }
            onClick={() =>
              setMobileOpen(
                (current) =>
                  !current,
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-foreground lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* =================================================== */}
        {/* MOBILE MENU                                         */}
        {/* =================================================== */}

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
              }}
              className="overflow-hidden border-t bg-card/98 backdrop-blur-xl lg:hidden"
            >
              <div className="container space-y-1 py-4">
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
                        onClick={() =>
                          setMobileOpen(
                            false,
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",

                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />

                        {item.label}
                      </Link>
                    );
                  },
                )}

                <div className="grid gap-2 pt-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    <Link
                      to="/"
                      onClick={() =>
                        setMobileOpen(
                          false,
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />

                      Site public
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />

                    Déconnexion
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================================================== */}
      {/* CONTENT                                              */}
      {/* ==================================================== */}

      <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-muted/20 via-background to-muted/30">
        <Outlet />
      </main>
    </div>
  );
};

export default TenantLayout;