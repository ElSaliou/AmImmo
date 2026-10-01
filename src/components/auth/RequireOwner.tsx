import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

type OwnerAccessResult = {
  authenticated: boolean;
  isOwner: boolean;
  userId: string | null;
  email: string | null;
};

// ============================================================
// REQUIRE OWNER
// ============================================================

const RequireOwner = () => {
  const location = useLocation();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OwnerAccessResult>({
    queryKey: ["auth", "require-owner"],

    queryFn: async () => {
      // ========================================================
      // 1. SESSION SUPABASE
      // ========================================================

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "[RequireOwner] Erreur session :",
          sessionError,
        );

        throw sessionError;
      }

      const session = sessionData.session;
      const user = session?.user ?? null;

      // --------------------------------------------------------
      // DEBUG : utilisateur réellement connecté
      // --------------------------------------------------------

      console.log(
        "[RequireOwner] SESSION OWNER :",
        {
          userId: user?.id ?? null,
          email: user?.email ?? null,
          authenticated: Boolean(user),
        },
      );

      // ========================================================
      // 2. AUCUNE SESSION
      // ========================================================

      if (!user) {
        return {
          authenticated: false,
          isOwner: false,
          userId: null,
          email: null,
        };
      }

      // ========================================================
      // 3. VERIFICATION OWNER
      // ========================================================

      const {
        data: ownerAllowed,
        error: ownerError,
      } = await supabase.rpc(
        "is_owner_user",
      );

      // --------------------------------------------------------
      // DEBUG : résultat du RPC
      // --------------------------------------------------------

      console.log(
        "[RequireOwner] IS OWNER RESULT :",
        {
          ownerAllowed,
          ownerError,
          userId: user.id,
          email: user.email ?? null,
        },
      );

      if (ownerError) {
        console.error(
          "[RequireOwner] Erreur RPC is_owner_user :",
          ownerError,
        );

        throw ownerError;
      }

      // ========================================================
      // 4. RESULTAT
      // ========================================================

      return {
        authenticated: true,
        isOwner: ownerAllowed === true,
        userId: user.id,
        email: user.email ?? null,
      };
    },

    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: true,
  });

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="text-sm text-muted-foreground">
            Vérification de votre accès propriétaire...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (isError) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erreur inconnue";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-destructive">
            Impossible de vérifier votre accès
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Une erreur est survenue lors de la vérification
            de votre compte propriétaire.
          </p>

          <div className="mt-4 rounded-lg bg-muted p-3">
            <p className="break-words text-xs text-muted-foreground">
              {errorMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // NOT AUTHENTICATED
  // ==========================================================

  if (!data?.authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // ==========================================================
  // AUTHENTICATED BUT NOT OWNER
  // ==========================================================

  if (!data.isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl font-bold text-destructive">
            !
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Accès propriétaire refusé
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est bien authentifié, mais il n'est
            actuellement pas reconnu comme un compte propriétaire.
          </p>

          <div className="mt-5 space-y-3 rounded-lg border bg-muted/40 p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Compte connecté
              </p>

              <p className="break-all text-sm font-medium">
                {data.email ?? "Email inconnu"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                ID utilisateur
              </p>

              <p className="break-all font-mono text-xs">
                {data.userId ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Résultat propriétaire
              </p>

              <p className="text-sm font-medium text-destructive">
                Non reconnu
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Consultez également la console du navigateur :
            RequireOwner y affiche le résultat détaillé de la
            vérification.
          </p>

          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Vérifier à nouveau
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // OWNER AUTHORIZED
  // ==========================================================

  console.log(
    "[RequireOwner] ACCES PROPRIETAIRE AUTORISE :",
    {
      userId: data.userId,
      email: data.email,
    },
  );

  return <Outlet />;
};

export default RequireOwner;