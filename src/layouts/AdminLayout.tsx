import { useState } from "react";

import {
  Link,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Bell,
  Building2,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";

import { adminNavItems } from "@/constants/navigation";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

// ============================================================
// ADMIN LAYOUT
// ============================================================

const AdminLayout = () => {
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] =
    useState(false);

  // ==========================================================
  // NAVIGATION ACTIVE
  // ==========================================================

  const isActivePath = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  };

  const currentNavItem =
    adminNavItems.find((item) =>
      isActivePath(item.path),
    );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===================================================== */}
      {/* SIDEBAR                                               */}
      {/* ===================================================== */}

      <aside
        className={cn(
          "flex shrink-0 flex-col border-r transition-all duration-300",
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
        {/* =================================================== */}
        {/* LOGO                                                */}
        {/* =================================================== */}

        <div
          className="flex h-16 items-center gap-2.5 border-b px-4"
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
            <span className="truncate font-display text-lg font-bold">
              ImmoPlate
            </span>
          )}
        </div>

        {/* =================================================== */}
        {/* NAVIGATION                                          */}
        {/* =================================================== */}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            const active =
              isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
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

                {!collapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* =================================================== */}
        {/* BAS SIDEBAR                                         */}
        {/* =================================================== */}

        <div className="space-y-1 px-2.5 pb-3">
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
                (current) =>
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

      {/* ===================================================== */}
      {/* CONTENU                                               */}
      {/* ===================================================== */}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* =================================================== */}
        {/* TOP BAR                                             */}
        {/* =================================================== */}

        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {currentNavItem?.label ??
                "Back-office"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-[18px] w-[18px]" />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary" />
            </Button>

            <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
              A
            </div>
          </div>
        </header>

        {/* =================================================== */}
        {/* PAGE                                                */}
        {/* =================================================== */}

        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;