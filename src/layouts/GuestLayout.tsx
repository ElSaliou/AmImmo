import {
  FileCheck2,
  Home,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";

import { useGuestInspections } from "@/hooks/use-guest-inspections";

import { cn } from "@/lib/utils";


const desktopNavClassName = ({
  isActive,
}: {
  isActive: boolean;
}) =>
  cn(
    "relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );


const mobileNavClassName = ({
  isActive,
}: {
  isActive: boolean;
}) =>
  cn(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );


export default function GuestLayout() {
  const navigate =
    useNavigate();

  const inspectionsQuery =
    useGuestInspections();

  const pendingCount =
    (
      inspectionsQuery.data ??
      []
    ).filter(
      (inspection) =>
        inspection.status ===
        "ready_for_signature",
    ).length;

  const handleSignOut =
    async () => {
      await supabase.auth.signOut();

      navigate(
        "/guest/access",
        {
          replace: true,
        },
      );
    };

  return (
    <div className="min-h-screen bg-muted/20 pb-24 sm:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold tracking-tight">
                AmImmo
              </p>

              <p className="truncate text-xs font-medium text-muted-foreground">
                Espace voyageur
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 sm:flex">
            <NavLink
              to="/guest"
              end
              className={desktopNavClassName}
            >
              <Home className="h-4 w-4" />
              Accueil
            </NavLink>

            <NavLink
              to="/guest/inspections"
              className={desktopNavClassName}
            >
              <FileCheck2 className="h-4 w-4" />
              États des lieux

              {pendingCount > 0 ? (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                  {pendingCount}
                </span>
              ) : null}
            </NavLink>
          </nav>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() =>
              void handleSignOut()
            }
          >
            <LogOut className="h-4 w-4 sm:mr-2" />

            <span className="hidden sm:inline">
              Se déconnecter
            </span>

            <span className="sr-only sm:hidden">
              Se déconnecter
            </span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <NavLink
            to="/guest"
            end
            className={mobileNavClassName}
          >
            <Home className="h-5 w-5" />
            Accueil
          </NavLink>

          <NavLink
            to="/guest/inspections"
            className={mobileNavClassName}
          >
            <span className="relative">
              <FileCheck2 className="h-5 w-5" />

              {pendingCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">
                  {pendingCount}
                </span>
              ) : null}
            </span>

            États des lieux
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
