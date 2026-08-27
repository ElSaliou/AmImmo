import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const RequireStaff = () => {
  const location = useLocation();

  const {
    session,
    loading,
    rolesLoading,
    rolesError,
    isStaff,
    signOut,
  } = useAuth();

  /**
   * Attendre à la fois :
   * - la récupération de la session Supabase
   * - la récupération des rôles applicatifs
   */
  if (loading || (session && rolesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="text-sm text-muted-foreground">
            Vérification de votre session...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Pas connecté :
   * redirection vers /login.
   */
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  /**
   * Erreur pendant la lecture des rôles.
   */
  if (rolesError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>

          <h1 className="text-xl font-semibold">
            Impossible de vérifier vos droits
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {rolesError}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez les règles d'accès de la table
            {" "}
            <code>user_roles</code>.
          </p>

          <Button
            variant="outline"
            className="mt-6"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Connecté mais pas membre du staff.
   */
  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>

          <h1 className="text-xl font-semibold">
            Accès non autorisé
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Votre compte est connecté mais ne possède
            pas de rôle autorisant l'accès au
            back-office.
          </p>

          <Button
            className="mt-6"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RequireStaff;
