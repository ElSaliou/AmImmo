import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Home,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";

// ============================================================
// GUEST LAYOUT
// ============================================================

const GuestLayout = () => {
  const location =
    useLocation();

  const navigate =
    useNavigate();

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

  const homeActive =
    location.pathname ===
    "/guest";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/guest"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                AmImmo
              </p>

              <p className="truncate text-xs text-muted-foreground">
                Espace voyageur
              </p>
            </div>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2">
          <Link
            to="/guest"
            className={[
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition-colors",
              homeActive
                ? "bg-primary text-primary-foreground"
                : "border bg-background hover:bg-muted",
            ].join(" ")}
          >
            <Home className="mr-2 h-4 w-4" />
            Accueil
          </Link>
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GuestLayout;