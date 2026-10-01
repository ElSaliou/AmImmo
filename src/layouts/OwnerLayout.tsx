import {
  Building2,
  CircleDollarSign,
  ClipboardSignature,
  ExternalLink,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  cn,
} from "@/lib/utils";

import {
  Button,
} from "@/components/ui/button";

// ============================================================
// OWNER NAVIGATION
// ============================================================

const ownerNavItems = [
  {
    label:
      "Tableau de bord",
    path:
      "/owner",
    icon:
      LayoutDashboard,
  },

  {
    label:
      "Mes biens",
    path:
      "/owner/properties",
    icon:
      Home,
  },

  {
    label:
      "Mes revenus",
    path:
      "/owner/revenues",
    icon:
      CircleDollarSign,
  },

  {
    label:
      "Mes reversements",
    path:
      "/owner/settlements",
    icon:
      WalletCards,
  },

  {
    label:
      "Mes relevés",
    path:
      "/owner/statements",
    icon:
      FileText,
  },

  {
    label:
      "Mes mandats",
    path:
      "/owner/mandates",
    icon:
      ClipboardSignature,
  },

  {
    label:
      "Mon profil",
    path:
      "/owner/profile",
    icon:
      UserRound,
  },
];

// ============================================================
// OWNER LAYOUT
// ============================================================

const OwnerLayout =
  () => {
    const {
      pathname,
    } =
      useLocation();

    const navigate =
      useNavigate();

    const [
      collapsed,
      setCollapsed,
    ] =
      useState(
        false,
      );

    const [
      mobileMenuOpen,
      setMobileMenuOpen,
    ] =
      useState(
        false,
      );

    // ========================================================
    // ACTIVE PATH
    // ========================================================

    const isActivePath =
      (
        path: string,
      ) => {
        if (
          path ===
          "/owner"
        ) {
          return (
            pathname ===
            "/owner"
          );
        }

        return (
          pathname ===
            path ||
          pathname.startsWith(
            `${path}/`,
          )
        );
      };

    const currentNavItem =
      ownerNavItems.find(
        (
          item,
        ) =>
          isActivePath(
            item.path,
          ),
      );

    // ========================================================
    // CLOSE MOBILE MENU AFTER NAVIGATION
    // ========================================================

    useEffect(
      () => {
        setMobileMenuOpen(
          false,
        );
      },
      [
        pathname,
      ],
    );

    // ========================================================
    // ESC KEY
    // ========================================================

    useEffect(
      () => {
        if (
          !mobileMenuOpen
        ) {
          return;
        }

        const handleKeyDown =
          (
            event: KeyboardEvent,
          ) => {
            if (
              event.key ===
              "Escape"
            ) {
              setMobileMenuOpen(
                false,
              );
            }
          };

        window.addEventListener(
          "keydown",
          handleKeyDown,
        );

        return () => {
          window.removeEventListener(
            "keydown",
            handleKeyDown,
          );
        };
      },
      [
        mobileMenuOpen,
      ],
    );

    // ========================================================
    // MOBILE SCROLL LOCK
    // ========================================================

    useEffect(
      () => {
        if (
          !mobileMenuOpen
        ) {
          return;
        }

        const previousOverflow =
          document.body.style
            .overflow;

        document.body.style.overflow =
          "hidden";

        return () => {
          document.body.style.overflow =
            previousOverflow;
        };
      },
      [
        mobileMenuOpen,
      ],
    );

    // ========================================================
    // LOGOUT
    // ========================================================

    const handleLogout =
      async () => {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (
          error
        ) {
          console.error(
            "[OwnerLayout] Erreur déconnexion :",
            error,
          );

          return;
        }

        setMobileMenuOpen(
          false,
        );

        navigate(
          "/login",
          {
            replace:
              true,
          },
        );
      };

    // ========================================================
    // NAVIGATION CONTENT
    // ========================================================

    const renderNavigation =
      (
        mobile = false,
      ) => {
        return (
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
            {ownerNavItems.map(
              (
                item,
              ) => {
                const Icon =
                  item.icon;

                const active =
                  isActivePath(
                    item.path,
                  );

                return (
                  <Link
                    key={
                      item.path
                    }
                    to={
                      item.path
                    }
                    title={
                      item.label
                    }
                    onClick={() => {
                      if (
                        mobile
                      ) {
                        setMobileMenuOpen(
                          false,
                        );
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",

                      active
                        ? "text-[hsl(var(--sidebar-primary))]"
                        : "opacity-60 hover:opacity-100",
                    )}
                    style={
                      active
                        ? {
                            backgroundColor:
                              "hsl(var(--sidebar-accent))",
                          }
                        : undefined
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />

                    {(mobile ||
                      !collapsed) && (
                      <span className="truncate">
                        {
                          item.label
                        }
                      </span>
                    )}
                  </Link>
                );
              },
            )}
          </nav>
        );
      };

    // ========================================================
    // UI
    // ========================================================

    return (
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-background">
        {/* =================================================== */}
        {/* DESKTOP SIDEBAR                                     */}
        {/* =================================================== */}

        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r transition-all duration-300 lg:flex",

            collapsed
              ? "w-[68px]"
              : "w-[250px]",
          )}
          style={{
            backgroundColor:
              "hsl(var(--sidebar-background))",

            color:
              "hsl(var(--sidebar-foreground))",
          }}
        >
          {/* ================================================= */}
          {/* BRAND                                             */}
          {/* ================================================= */}

          <div
            className="flex h-16 shrink-0 items-center gap-2.5 border-b px-4"
            style={{
              borderColor:
                "hsl(var(--sidebar-border))",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background:
                  "hsl(var(--sidebar-primary))",
              }}
            >
              <Building2
                className="h-4 w-4"
                style={{
                  color:
                    "hsl(var(--sidebar-primary-foreground))",
                }}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate font-display text-lg font-bold">
                  ImmoPlate
                </span>

                <span className="block truncate text-[11px] opacity-50">
                  Espace propriétaire
                </span>
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* NAVIGATION                                        */}
          {/* ================================================= */}

          {renderNavigation()}

          {/* ================================================= */}
          {/* DESKTOP SIDEBAR FOOTER                            */}
          {/* ================================================= */}

          <div className="shrink-0 space-y-1 px-2.5 pb-3">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-60 transition-opacity hover:opacity-100"
            >
              <ExternalLink className="h-[18px] w-[18px] shrink-0" />

              {!collapsed && (
                <span>
                  Site public
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() =>
                setCollapsed(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-50 transition-opacity hover:opacity-80"
            >
              {collapsed ? (
                <PanelLeft className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              )}

              {!collapsed && (
                <span>
                  Réduire
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* =================================================== */}
        {/* MOBILE BACKDROP                                     */}
        {/* =================================================== */}

        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() =>
            setMobileMenuOpen(
              false,
            )
          }
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",

            mobileMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />

        {/* =================================================== */}
        {/* MOBILE SIDEBAR                                      */}
        {/* =================================================== */}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(84vw,290px)] flex-col border-r shadow-2xl transition-transform duration-300 ease-out lg:hidden",

            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full",
          )}
          style={{
            backgroundColor:
              "hsl(var(--sidebar-background))",

            color:
              "hsl(var(--sidebar-foreground))",

            borderColor:
              "hsl(var(--sidebar-border))",
          }}
          aria-hidden={
            !mobileMenuOpen
          }
        >
          {/* ================================================= */}
          {/* MOBILE BRAND                                      */}
          {/* ================================================= */}

          <div
            className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4"
            style={{
              borderColor:
                "hsl(var(--sidebar-border))",
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background:
                    "hsl(var(--sidebar-primary))",
                }}
              >
                <Building2
                  className="h-4 w-4"
                  style={{
                    color:
                      "hsl(var(--sidebar-primary-foreground))",
                  }}
                />
              </div>

              <div className="min-w-0">
                <span className="block truncate font-display text-lg font-bold">
                  ImmoPlate
                </span>

                <span className="block truncate text-[11px] opacity-50">
                  Espace propriétaire
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() =>
                setMobileMenuOpen(
                  false,
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-white/5 hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ================================================= */}
          {/* MOBILE NAVIGATION                                 */}
          {/* ================================================= */}

          {renderNavigation(
            true,
          )}

          {/* ================================================= */}
          {/* MOBILE SIDEBAR FOOTER                             */}
          {/* ================================================= */}

          <div
            className="shrink-0 space-y-1 border-t px-2.5 py-3"
            style={{
              borderColor:
                "hsl(var(--sidebar-border))",
            }}
          >
            <Link
              to="/"
              onClick={() =>
                setMobileMenuOpen(
                  false,
                )
              }
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-60 transition-opacity hover:opacity-100"
            >
              <ExternalLink className="h-[18px] w-[18px] shrink-0" />

              <span>
                Site public
              </span>
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-60 transition-opacity hover:opacity-100"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />

              <span>
                Déconnexion
              </span>
            </button>
          </div>
        </aside>

        {/* =================================================== */}
        {/* CONTENT                                             */}
        {/* =================================================== */}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* ================================================= */}
          {/* TOP BAR                                           */}
          {/* ================================================= */}

          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-3 sm:h-16 sm:px-5 lg:px-6">
            {/* =============================================== */}
            {/* LEFT                                            */}
            {/* =============================================== */}

            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                onClick={() =>
                  setMobileMenuOpen(
                    true,
                  )
                }
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <h2 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">
                {currentNavItem
                  ?.label ??
                  "Espace propriétaire"}
              </h2>
            </div>

            {/* =============================================== */}
            {/* RIGHT                                           */}
            {/* =============================================== */}

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right md:block">
                <p className="text-xs text-muted-foreground">
                  Espace sécurisé
                </p>

                <p className="text-sm font-medium">
                  Propriétaire
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={
                  handleLogout
                }
                className="h-9 gap-2 px-2.5 sm:px-3"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Déconnexion
                </span>
              </Button>
            </div>
          </header>

          {/* ================================================= */}
          {/* PAGE                                              */}
          {/* ================================================= */}

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/30 p-3 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    );
  };

export default OwnerLayout;