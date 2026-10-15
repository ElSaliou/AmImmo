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


const navClassName = ({
  isActive,
}: {
  isActive: boolean;
}) =>
  [
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");


export default function GuestLayout() {

  const navigate =
    useNavigate();

  const handleSignOut =
    async () => {

      await supabase.auth.signOut();

      navigate(
        "/guest/access",
        {
          replace:
            true,
        },
      );
    };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold">
                AmImmo
              </p>

              <p className="text-xs text-muted-foreground">
                Espace voyageur
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              void handleSignOut()
            }
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
          <NavLink
            to="/guest"
            end
            className={navClassName}
          >
            <Home className="h-4 w-4" />
            Accueil
          </NavLink>

          <NavLink
            to="/guest/inspections"
            className={navClassName}
          >
            <FileCheck2 className="h-4 w-4" />
            États des lieux
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}