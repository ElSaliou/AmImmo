import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/integrations/supabase/client";

import type {
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js";

import type { AppRole } from "@/types/real-estate";

// ============================================================
// STAFF ROLES
// ============================================================

const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "agent",
  "accountant",
  "maintenance",
];

// ============================================================
// TYPES
// ============================================================

type SignInInput = {
  email: string;
  password: string;
};

// ============================================================
// USE AUTH
// ============================================================

export const useAuth = () => {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [rolesLoading, setRolesLoading] =
    useState(false);

  const [roles, setRoles] =
    useState<AppRole[]>([]);

  const [rolesError, setRolesError] =
    useState<string | null>(null);

  /**
   * Permet de savoir quel utilisateur est réellement
   * la session courante.
   *
   * Cela évite qu'une ancienne requête de rôles termine
   * après un changement de compte et réinjecte les rôles
   * de l'ancien utilisateur.
   */
  const currentUserIdRef =
    useRef<string | null>(null);

  // ==========================================================
  // RESET ROLES
  // ==========================================================

  const resetRoles = useCallback(() => {
    setRoles([]);
    setRolesError(null);
  }, []);

  // ==========================================================
  // LOAD ROLES
  // ==========================================================

  /**
   * Charge les rôles applicatifs de l'utilisateur demandé.
   */
  const loadRoles = useCallback(
    async (userId: string) => {
      setRolesLoading(true);
      setRolesError(null);

      try {
        const {
          data,
          error,
        } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        /**
         * La session a peut-être changé pendant
         * l'exécution de la requête.
         *
         * Dans ce cas, on ignore totalement le résultat.
         */
        if (
          currentUserIdRef.current !== userId
        ) {
          console.log(
            "[useAuth] Résultat rôles ignoré : utilisateur changé.",
            {
              requestedUserId: userId,
              currentUserId:
                currentUserIdRef.current,
            },
          );

          return;
        }

        if (error) {
          console.error(
            "[useAuth] Impossible de récupérer les rôles :",
            error,
          );

          setRoles([]);
          setRolesError(
            error.message,
          );

          return;
        }

        const userRoles =
          (data ?? [])
            .map(
              (row) =>
                row.role,
            )
            .filter(
              Boolean,
            ) as AppRole[];

        console.log(
          "[useAuth] Rôles chargés :",
          {
            userId,
            roles: userRoles,
          },
        );

        setRoles(
          userRoles,
        );
      } catch (error) {
        /**
         * Là encore, ne rien appliquer si l'utilisateur
         * a changé pendant la requête.
         */
        if (
          currentUserIdRef.current !== userId
        ) {
          return;
        }

        console.error(
          "[useAuth] Erreur inattendue pendant le chargement des rôles :",
          error,
        );

        setRoles([]);

        setRolesError(
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les rôles utilisateur.",
        );
      } finally {
        /**
         * Ne modifier rolesLoading que si cette requête
         * concerne toujours l'utilisateur courant.
         */
        if (
          currentUserIdRef.current === userId
        ) {
          setRolesLoading(false);
        }
      }
    },
    [],
  );

  // ==========================================================
  // INITIAL SESSION
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const {
            data: {
              session:
                currentSession,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (error) {
            console.error(
              "[useAuth] Erreur getSession :",
              error,
            );
          }

          const userId =
            currentSession?.user?.id ??
            null;

          currentUserIdRef.current =
            userId;

          /**
           * IMPORTANT :
           * aucun rôle provenant d'une précédente session
           * ne doit survivre à l'initialisation.
           */
          resetRoles();

          setSession(
            currentSession,
          );
        } catch (error) {
          console.error(
            "[useAuth] Erreur initialisation session :",
            error,
          );

          if (mounted) {
            currentUserIdRef.current =
              null;

            resetRoles();

            setSession(null);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    void initializeAuth();

    // ========================================================
    // AUTH STATE CHANGE
    // ========================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          newSession,
        ) => {
          if (!mounted) {
            return;
          }

          const newUserId =
            newSession?.user?.id ??
            null;

          const previousUserId =
            currentUserIdRef.current;

          console.log(
            "[useAuth] Auth state change :",
            {
              event,
              previousUserId,
              newUserId,
              email:
                newSession?.user
                  ?.email ??
                null,
            },
          );

          /**
           * CRITIQUE :
           *
           * Dès que le compte change, les anciens rôles
           * sont supprimés AVANT d'exposer la nouvelle
           * session au reste de React.
           *
           * Cela empêche un ancien super_admin d'être
           * temporairement considéré comme staff après
           * connexion avec un propriétaire.
           */
          if (
            previousUserId !== newUserId
          ) {
            resetRoles();

            setRolesLoading(
              Boolean(newUserId),
            );
          }

          currentUserIdRef.current =
            newUserId;

          setSession(
            newSession,
          );

          setLoading(false);

          if (!newUserId) {
            setRolesLoading(false);
          }
        },
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [resetRoles]);

  // ==========================================================
  // LOAD ROLES WHEN USER CHANGES
  // ==========================================================

  useEffect(() => {
    const userId =
      session?.user?.id;

    if (!userId) {
      currentUserIdRef.current =
        null;

      resetRoles();

      setRolesLoading(false);

      return;
    }

    currentUserIdRef.current =
      userId;

    /**
     * IMPORTANT :
     * on repart toujours d'un tableau vide avant
     * de charger les rôles du nouvel utilisateur.
     */
    resetRoles();

    void loadRoles(
      userId,
    );
  }, [
    session?.user?.id,
    loadRoles,
    resetRoles,
  ]);

  // ==========================================================
  // SIGN IN
  // ==========================================================

  const signIn = useCallback(
    async ({
      email,
      password,
    }: SignInInput) => {
      /**
       * IMPORTANT :
       * supprimer les rôles de la précédente session
       * AVANT même de commencer une nouvelle connexion.
       *
       * C'est la correction principale du problème
       * admin -> propriétaire.
       */
      currentUserIdRef.current =
        null;

      resetRoles();

      setRolesLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                email.trim(),
              password,
            },
          );

        if (error) {
          throw error;
        }

        const userId =
          data.user?.id ??
          null;

        currentUserIdRef.current =
          userId;

        console.log(
          "[useAuth] Connexion réussie :",
          {
            userId,
            email:
              data.user?.email ??
              null,
          },
        );

        return data;
      } catch (error) {
        currentUserIdRef.current =
          null;

        resetRoles();

        setRolesLoading(false);

        throw error;
      }
    },
    [resetRoles],
  );

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const signOut =
    useCallback(
      async () => {
        /**
         * On supprime d'abord l'état local.
         */
        currentUserIdRef.current =
          null;

        resetRoles();

        setRolesLoading(false);

        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        setSession(null);
      },
      [resetRoles],
    );

  // ==========================================================
  // USER
  // ==========================================================

  const user: User | null =
    session?.user ?? null;

  const isAuthenticated =
    Boolean(
      session?.user,
    );

  // ==========================================================
  // STAFF
  // ==========================================================

  /**
   * IMPORTANT :
   * owner et tenant ne sont PAS considérés comme staff.
   */
  const isStaff = useMemo(
    () =>
      roles.some(
        (role) =>
          STAFF_ROLES.includes(
            role,
          ),
      ),
    [roles],
  );

  // ==========================================================
  // ROLES
  // ==========================================================

  const isSuperAdmin =
    roles.includes(
      "super_admin",
    );

  const isAdmin =
    isSuperAdmin ||
    roles.includes(
      "admin",
    );

  const isManager =
    isAdmin ||
    roles.includes(
      "manager",
    );

  const isAgent =
    roles.includes(
      "agent",
    );

  const isAccountant =
    isAdmin ||
    roles.includes(
      "accountant",
    );

  const isMaintenance =
    isAdmin ||
    roles.includes(
      "maintenance",
    );

  /**
   * Ces deux propriétés sont conservées pour compatibilité
   * avec le reste de l'application.
   *
   * ATTENTION :
   * le nouveau portail propriétaire n'utilise PAS
   * user_roles.role = owner.
   *
   * Il utilise :
   *
   * auth.users.id
   *       ↓
   * owners.user_id
   *
   * via is_owner_user().
   */
  const isOwner =
    roles.includes(
      "owner",
    );

  const isTenant =
    roles.includes(
      "tenant",
    );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    session,
    user,

    loading,
    rolesLoading,

    roles,
    rolesError,

    isAuthenticated,
    isStaff,

    isSuperAdmin,
    isAdmin,
    isManager,
    isAgent,
    isAccountant,
    isMaintenance,
    isOwner,
    isTenant,

    signIn,
    signOut,

    refreshRoles:
      async () => {
        if (
          user?.id
        ) {
          resetRoles();

          await loadRoles(
            user.id,
          );
        }
      },
  };
};

// ============================================================
// TYPES EXPORT
// ============================================================

export type UseAuthReturn =
  ReturnType<
    typeof useAuth
  >;

export type AuthSignInError =
  AuthError;