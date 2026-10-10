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

type TenantAccessResult = {
  authenticated: boolean;
  isTenant: boolean;
  tenantId: string | null;
  userId: string | null;
  email: string | null;
};

// ============================================================
// REQUIRE TENANT
// ============================================================

const RequireTenant = () => {
  const location = useLocation();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TenantAccessResult>({
    queryKey: [
      "auth",
      "require-tenant",
    ],

    queryFn: async () => {
      // ======================================================
      // 1. SESSION SUPABASE
      // ======================================================

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "[RequireTenant] Erreur session :",
          sessionError,
        );

        throw sessionError;
      }

      const session =
        sessionData.session;

      const user =
        session?.user ?? null;

      console.log(
        "[RequireTenant] SESSION TENANT :",
        {
          userId:
            user?.id ?? null,

          email:
            user?.email ?? null,

          authenticated:
            Boolean(user),
        },
      );

      // ======================================================
      // 2. AUCUNE SESSION
      // ======================================================

      if (!user) {
        return {
          authenticated: false,
          isTenant: false,
          tenantId: null,
          userId: null,
          email: null,
        };
      }

      // ======================================================
      // 3. RESOLUTION DU LOCATAIRE
      //
      // Source d'autorité :
      //
      // auth.uid()
      //      ↓
      // tenants.user_id
      //      ↓
      // my_tenant_id()
      //
      // Ne PAS utiliser user_roles.role = 'tenant'.
      // ======================================================

      const {
        data: tenantId,
        error: tenantError,
      } = await supabase.rpc(
        "my_tenant_id",
      );

      console.log(
        "[RequireTenant] MY TENANT RESULT :",
        {
          tenantId:
            tenantId ?? null,

          tenantError,

          userId:
            user.id,

          email:
            user.email ?? null,
        },
      );

      if (tenantError) {
        console.error(
          "[RequireTenant] Erreur RPC my_tenant_id :",
          tenantError,
        );

        throw tenantError;
      }

      // ======================================================
      // 4. RESULTAT
      // ======================================================

      return {
        authenticated: true,

        isTenant:
          typeof tenantId ===
            "string" &&
          tenantId.length > 0,

        tenantId:
          typeof tenantId ===
          "string"
            ? tenantId
            : null,

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
            Vérification de votre accès locataire...
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
            Une erreur est survenue pendant la
            vérification de votre compte locataire.
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
          from:
            `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  // ==========================================================
  // AUTHENTICATED BUT NOT TENANT
  // ==========================================================

  if (!data.isTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl font-bold text-destructive">
            !
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Accès locataire refusé
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est bien authentifié,
            mais il n'est actuellement associé
            à aucun locataire.
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

            <div>
              <p className="text-xs text-muted-foreground">
                Résultat locataire
              </p>

              <p className="text-sm font-medium text-destructive">
                Aucun locataire associé
              </p>
            </div>
          </div>

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
  // TENANT AUTHORIZED
  // ==========================================================

  console.log(
    "[RequireTenant] ACCES LOCATAIRE AUTORISE :",
    {
      tenantId:
        data.tenantId,

      userId:
        data.userId,

      email:
        data.email,
    },
  );

  return <Outlet />;
};

export default RequireTenant;