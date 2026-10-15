import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import {
  getCurrentGuestId,
} from "@/hooks/use-guest-portal-auth";

// ============================================================
// TYPES
// ============================================================

type GuestAccessResult = {
  authenticated: boolean;
  isGuest: boolean;
  guestId: string | null;
  userId: string | null;
  email: string | null;
};

// ============================================================
// REQUIRE GUEST
//
// Source d'autorité:
//
// auth.uid()
//      ↓
// guests.user_id
//      ↓
// my_guest_id()
//
// Ne PAS utiliser user_roles pour identifier un voyageur.
// ============================================================

const RequireGuest = () => {
  const location =
    useLocation();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } =
    useQuery<GuestAccessResult>({
      queryKey: [
        "auth",
        "require-guest",
      ],

      queryFn: async () => {
        // ------------------------------------------------------
        // 1. SESSION SUPABASE
        // ------------------------------------------------------

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user =
          sessionData.session?.user ??
          null;

        // ------------------------------------------------------
        // 2. NO SESSION
        // ------------------------------------------------------

        if (!user) {
          return {
            authenticated: false,
            isGuest: false,
            guestId: null,
            userId: null,
            email: null,
          };
        }

        // ------------------------------------------------------
        // 3. CANONICAL GUEST IDENTITY
        // ------------------------------------------------------

        const guestId =
          await getCurrentGuestId();

        // ------------------------------------------------------
        // 4. RESULT
        // ------------------------------------------------------

        return {
          authenticated: true,

          isGuest:
            typeof guestId ===
              "string" &&
            guestId.length > 0,

          guestId,

          userId:
            user.id,

          email:
            user.email ?? null,
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
            Vérification de votre accès voyageur...
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

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Une erreur est survenue pendant la
            vérification de votre compte voyageur.
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
        to="/guest/access"
        replace
        state={{
          from:
            `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  // ==========================================================
  // AUTHENTICATED BUT NOT GUEST
  // ==========================================================

  if (!data.isGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl font-bold text-destructive">
            !
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Accès voyageur refusé
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est bien authentifié, mais il
            n'est actuellement associé à aucun profil
            voyageur.
          </p>

          <div className="mt-5 space-y-3 rounded-lg border bg-muted/40 p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Compte connecté
              </p>

              <p className="break-all text-sm font-medium">
                {data.email ??
                  "Email inconnu"}
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
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Vérifier à nouveau
            </button>

            <button
              type="button"
              onClick={() => {
                void supabase.auth.signOut();
              }}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // AUTHORIZED
  // ==========================================================

  return <Outlet />;
};

export default RequireGuest;